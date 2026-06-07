package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.model.Conversation;
import com.bankapp.model.Transaction;
import com.bankapp.repository.ConversationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {

    private static final String SYSTEM_PROMPT =
            "You are ITUS Bank's helpful AI assistant for an individual customer. " +
            "Use the ACCOUNT CONTEXT block below as the authoritative source of facts " +
            "about the user's account — when they ask about their balance, account number, " +
            "or recent activity, answer from this context. " +
            "All money is in Indian Rupees (₹/INR). " +
            "For general banking questions, give concise, practical answers in plain language. " +
            "Keep answers to 2-4 sentences unless the user asks for detail. " +
            "Never invent transactions, balances, or interest rates. " +
            "If the user asks to perform a money action (transfer, withdraw, deposit, pay bill), " +
            "briefly confirm you can help — the app will show a confirm button for them to approve.";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM");
    private static final int RECENT_TX_LIMIT = 6;

    private final WebClient webClient;
    private final String ollamaUrl;
    private final String ollamaModel;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private ConversationRepository conversationRepository;

    public ChatService(WebClient.Builder webClientBuilder,
                       @Value("${ollama.url:http://ollama:11434}") String ollamaUrl,
                       @Value("${ollama.model}") String ollamaModel) {
        this.ollamaUrl = ollamaUrl;
        this.ollamaModel = ollamaModel;
        this.webClient = webClientBuilder.baseUrl(ollamaUrl).build();
    }

    /** Persisted chat history (user-visible). */
    public List<Conversation> history(Account account) {
        return conversationRepository.findTop50ByAccountOrderByOccurredAtAsc(account);
    }

    public void clearHistory(Account account) {
        conversationRepository.deleteAllByAccount(account);
    }

    public Map<String, Object> chat(String userMessage, Account account) {
        Map<String, Object> result = new HashMap<>();
        result.put("question", userMessage);

        if (userMessage == null || userMessage.isBlank()) {
            result.put("answer", "Please ask me a banking question and I'll do my best to help.");
            return result;
        }

        // Persist user message
        persist(account, "user", userMessage);

        // Intent detection (kept simple - regex-based, model independent)
        Map<String, Object> suggestedAction = IntentDetector.detect(userMessage);
        if (suggestedAction != null) {
            result.put("suggestedAction", suggestedAction);
        }

        String answer = callOllama(userMessage, account);
        result.put("answer", answer);
        persist(account, "bot", answer);
        return result;
    }

    /** Streams tokens to an SseEmitter as they arrive from Ollama. */
    public void streamChat(String userMessage, Account account, SseEmitter emitter) throws Exception {
        if (userMessage == null || userMessage.isBlank()) {
            emitter.send(SseEmitter.event().name("token")
                    .data(mapper.writeValueAsString("Please ask a banking question.")));
            emitter.send(SseEmitter.event().name("done").data("{\"done\":true}"));
            emitter.complete();
            return;
        }

        persist(account, "user", userMessage);
        Map<String, Object> suggested = IntentDetector.detect(userMessage);

        Map<String, Object> requestBody = Map.of(
                "model", ollamaModel,
                "stream", true,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "system", "content", buildContext(account)),
                        Map.of("role", "user", "content", userMessage)
                ),
                "options", Map.of(
                        "temperature", 0.3,
                        "num_predict", 256
                )
        );

        HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(ollamaUrl + "/api/chat"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMinutes(2))
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(requestBody)))
                .build();

        StringBuilder fullText = new StringBuilder();

        try (var lines = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofLines()).body()) {
            for (String line : (Iterable<String>) lines::iterator) {
                if (line == null || line.isBlank()) continue;
                String token;
                try {
                    JsonNode node = mapper.readTree(line);
                    token = node.path("message").path("content").asText("");
                } catch (Exception ex) {
                    continue;
                }
                if (token.isEmpty()) continue;
                fullText.append(token);
                try {
                    emitter.send(SseEmitter.event().name("token")
                            .data(mapper.writeValueAsString(token)));
                } catch (Exception sendEx) {
                    // Client disconnected — stop streaming
                    return;
                }
            }
        }

        // Persist the complete bot message
        String finalText = fullText.toString();
        if (finalText.isBlank()) {
            finalText = "Sorry, I couldn't generate a response. Please try again.";
            emitter.send(SseEmitter.event().name("token")
                    .data(mapper.writeValueAsString(finalText)));
        }
        persist(account, "bot", finalText);

        Map<String, Object> doneData = new HashMap<>();
        doneData.put("done", true);
        if (suggested != null) doneData.put("suggestedAction", suggested);
        emitter.send(SseEmitter.event().name("done").data(mapper.writeValueAsString(doneData)));
        emitter.complete();
    }

    private void persist(Account account, String role, String content) {
        try {
            Conversation c = new Conversation();
            c.setAccount(account);
            c.setRole(role);
            c.setContent(content);
            conversationRepository.save(c);
        } catch (Exception ignored) { }
    }

    private String callOllama(String userMessage, Account account) {
        try {
            String contextBlock = buildContext(account);

            Map<String, Object> request = Map.of(
                    "model", ollamaModel,
                    "stream", false,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "system", "content", contextBlock),
                            Map.of("role", "user", "content", userMessage)
                    ),
                    "options", Map.of(
                            "temperature", 0.3,
                            "num_predict", 256
                    )
            );

            String body = webClient.post()
                    .uri("/api/chat")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();

            JsonNode root = mapper.readTree(body);
            JsonNode content = root.path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                return "Sorry, I couldn't generate a response. Please try again.";
            }
            return content.asText().trim();
        } catch (Exception e) {
            return "Sorry, I'm having trouble reaching the AI service right now. Please try again in a moment.";
        }
    }

    private String buildContext(Account account) {
        StringBuilder ctx = new StringBuilder("ACCOUNT CONTEXT (authoritative, current):\n");
        ctx.append("- Holder: ").append(safe(account.getFullName())).append('\n');
        ctx.append("- Username: ").append(safe(account.getUsername())).append('\n');
        ctx.append("- Account Number: ").append(safe(account.getAccountNumber())).append('\n');
        ctx.append("- Account Type: ").append(safe(account.getAccountType())).append('\n');
        ctx.append("- Current Balance: ₹").append(account.getBalance()).append('\n');
        if (account.getKycStatus() != null) {
            ctx.append("- KYC Status: ").append(account.getKycStatus()).append('\n');
        }

        List<Transaction> recent = transactionService.getAccountTransactions(account);
        if (recent.isEmpty()) {
            ctx.append("- Recent Transactions: none yet\n");
        } else {
            ctx.append("- Recent Transactions (most recent first):\n");
            recent.stream().limit(RECENT_TX_LIMIT).forEach(t -> {
                String date = t.getCreatedAt() == null ? "?" : t.getCreatedAt().format(DATE_FMT);
                String sign = isCredit(t.getTransactionType()) ? "+" : "-";
                ctx.append("  • ").append(date)
                   .append(" — ").append(humanType(t.getTransactionType()))
                   .append(" ").append(sign).append("₹").append(t.getAmount());
                if (t.getDescription() != null && !t.getDescription().isBlank()) {
                    ctx.append(" (").append(t.getDescription()).append(')');
                }
                ctx.append('\n');
            });
        }
        return ctx.toString();
    }

    private String safe(String s) {
        return s == null ? "—" : s;
    }

    private boolean isCredit(String type) {
        return "DEPOSIT".equals(type) || "TRANSFER_RECEIVED".equals(type);
    }

    private String humanType(String type) {
        if (type == null) return "Transaction";
        return switch (type) {
            case "DEPOSIT" -> "Deposit";
            case "WITHDRAWAL" -> "Withdrawal";
            case "TRANSFER_SENT" -> "Transfer sent";
            case "TRANSFER_RECEIVED" -> "Transfer received";
            default -> type;
        };
    }
}
