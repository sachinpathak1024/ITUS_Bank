package com.bankapp.controller;

import com.bankapp.model.Account;
import com.bankapp.model.Conversation;
import com.bankapp.service.AccountService;
import com.bankapp.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private AccountService accountService;

    @PostMapping("/ask")
    public Map<String, Object> askQuestion(@AuthenticationPrincipal Account account,
            @RequestBody Map<String, String> request) {
        String userMessage = request.get("message");
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return chatService.chat(userMessage, fresh);
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Account account, @RequestBody Map<String, String> request) {
        String userMessage = request.get("message");
        SseEmitter emitter = new SseEmitter(120_000L);
        Account fresh = accountService.getAccountByUsername(account.getUsername());

        Thread.ofVirtual().name("chat-stream-" + fresh.getUsername()).start(() -> {
            try {
                chatService.streamChat(userMessage, fresh, emitter);
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("token")
                            .data("\"Sorry, the assistant is unavailable right now.\""));
                    emitter.send(SseEmitter.event().name("done").data("{\"done\":true,\"error\":true}"));
                    emitter.complete();
                } catch (Exception ignored) {
                    emitter.completeWithError(e);
                }
            }
        });

        return emitter;
    }

    @GetMapping("/history")
    public List<Conversation> history(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return chatService.history(fresh);
    }

    @DeleteMapping("/history")
    public Map<String, Object> clear(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        chatService.clearHistory(fresh);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return response;
    }
}
