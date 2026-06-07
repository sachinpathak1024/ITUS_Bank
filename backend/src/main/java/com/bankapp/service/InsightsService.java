package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.model.Transaction;
import com.bankapp.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
public class InsightsService {

    @Autowired
    private TransactionRepository transactionRepository;

    public Map<String, Object> compute(Account account, int months) {
        if (months <= 0 || months > 24) months = 6;
        LocalDateTime start = YearMonth.now().minusMonths(months - 1).atDay(1).atStartOfDay();
        List<Transaction> all = transactionRepository.findByAccountOrderByCreatedAtDesc(account);

        // Initialize months map
        LinkedHashMap<String, BigDecimal[]> monthly = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            monthly.put(ym.toString(), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }

        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits = BigDecimal.ZERO;
        long depositCount = 0, withdrawalCount = 0, sentCount = 0, receivedCount = 0;
        Map<String, BigDecimal> categoryTotals = new HashMap<>();

        for (Transaction t : all) {
            if (t.getCreatedAt() == null) continue;
            String key = YearMonth.from(t.getCreatedAt()).toString();
            boolean isCredit = "DEPOSIT".equals(t.getTransactionType())
                    || "TRANSFER_RECEIVED".equals(t.getTransactionType());

            if (!t.getCreatedAt().isBefore(start) && monthly.containsKey(key)) {
                BigDecimal[] arr = monthly.get(key);
                if (isCredit) arr[0] = arr[0].add(t.getAmount());
                else arr[1] = arr[1].add(t.getAmount());
            }

            if (isCredit) totalCredits = totalCredits.add(t.getAmount());
            else totalDebits = totalDebits.add(t.getAmount());

            switch (t.getTransactionType()) {
                case "DEPOSIT" -> depositCount++;
                case "WITHDRAWAL" -> withdrawalCount++;
                case "TRANSFER_SENT" -> sentCount++;
                case "TRANSFER_RECEIVED" -> receivedCount++;
            }

            // Category derived from description prefix for bill transactions, else type
            String category = deriveCategory(t);
            categoryTotals.merge(category, t.getAmount(), BigDecimal::add);
        }

        List<Map<String, Object>> monthlySeries = new ArrayList<>();
        for (var e : monthly.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", e.getKey());
            row.put("credits", e.getValue()[0]);
            row.put("debits", e.getValue()[1]);
            monthlySeries.add(row);
        }

        List<Map<String, Object>> categories = new ArrayList<>();
        categoryTotals.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(8)
                .forEach(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("category", e.getKey());
                    row.put("total", e.getValue());
                    categories.add(row);
                });

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCredits", totalCredits);
        stats.put("totalDebits", totalDebits);
        stats.put("depositCount", depositCount);
        stats.put("withdrawalCount", withdrawalCount);
        stats.put("transferSentCount", sentCount);
        stats.put("transferReceivedCount", receivedCount);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("stats", stats);
        result.put("monthly", monthlySeries);
        result.put("categories", categories);
        return result;
    }

    private String deriveCategory(Transaction t) {
        if (t.getDescription() != null && t.getDescription().startsWith("Bill:")) {
            // "Bill: Tata Power (Electricity)"
            int open = t.getDescription().lastIndexOf('(');
            int close = t.getDescription().lastIndexOf(')');
            if (open > 0 && close > open) {
                return "Bill — " + t.getDescription().substring(open + 1, close);
            }
            return "Bill";
        }
        return switch (t.getTransactionType()) {
            case "DEPOSIT" -> "Deposit";
            case "WITHDRAWAL" -> "Cash Withdrawal";
            case "TRANSFER_SENT" -> "Transfer Sent";
            case "TRANSFER_RECEIVED" -> "Transfer Received";
            default -> "Other";
        };
    }

    public String csv(Account account, LocalDateTime start, LocalDateTime end) {
        List<Transaction> all = transactionRepository.findByAccountOrderByCreatedAtDesc(account);
        StringBuilder sb = new StringBuilder("Date,Type,Description,Amount\n");
        for (Transaction t : all) {
            if (t.getCreatedAt() == null) continue;
            if (start != null && t.getCreatedAt().isBefore(start)) continue;
            if (end != null && t.getCreatedAt().isAfter(end)) continue;
            sb.append(t.getCreatedAt()).append(',')
              .append(t.getTransactionType()).append(',')
              .append(escape(t.getDescription())).append(',')
              .append(t.getAmount()).append('\n');
        }
        return sb.toString();
    }

    private String escape(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    /** Printable HTML statement — open in a tab and use Print → Save as PDF. */
    public String html(Account account, LocalDateTime start, LocalDateTime end) {
        List<Transaction> all = transactionRepository.findByAccountOrderByCreatedAtDesc(account);
        StringBuilder body = new StringBuilder();
        BigDecimal credits = BigDecimal.ZERO;
        BigDecimal debits = BigDecimal.ZERO;
        int count = 0;
        for (Transaction t : all) {
            if (t.getCreatedAt() == null) continue;
            if (start != null && t.getCreatedAt().isBefore(start)) continue;
            if (end != null && t.getCreatedAt().isAfter(end)) continue;
            boolean isCredit = "DEPOSIT".equals(t.getTransactionType()) || "TRANSFER_RECEIVED".equals(t.getTransactionType());
            if (isCredit) credits = credits.add(t.getAmount());
            else debits = debits.add(t.getAmount());
            count++;
            body.append("<tr><td>").append(t.getCreatedAt())
                .append("</td><td>").append(t.getTransactionType())
                .append("</td><td>").append(escapeHtml(t.getDescription() == null ? "" : t.getDescription()))
                .append("</td><td class='amt ").append(isCredit ? "pos" : "neg").append("'>")
                .append(isCredit ? "+" : "-").append("₹").append(t.getAmount())
                .append("</td></tr>");
        }
        BigDecimal net = credits.subtract(debits);

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>ITUS Bank Statement</title>" +
                "<style>" +
                "@media print { .no-print { display:none; } }" +
                "body { font-family: Inter, -apple-system, sans-serif; color:#111827; padding:32px; max-width:900px; margin:0 auto; }" +
                "h1 { color:#0a3d62; margin:0 0 4px; font-size:22px; }" +
                ".meta { color:#6b7280; font-size:13px; margin-bottom:24px; }" +
                ".summary { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }" +
                ".summary div { padding:14px; border:1px solid #e5e7eb; border-radius:10px; }" +
                ".summary .label { color:#6b7280; font-size:11px; text-transform:uppercase; }" +
                ".summary .value { font-weight:700; font-size:18px; margin-top:4px; }" +
                "table { width:100%; border-collapse:collapse; font-size:13px; }" +
                "th, td { padding:9px 8px; border-bottom:1px solid #e5e7eb; text-align:left; }" +
                "th { background:#f4f6fa; font-weight:600; font-size:11px; text-transform:uppercase; color:#6b7280; }" +
                ".amt { text-align:right; font-weight:600; white-space:nowrap; }" +
                ".amt.pos { color:#059669; } .amt.neg { color:#dc2626; }" +
                ".print { background:#0a3d62; color:#fff; padding:10px 16px; border:none; border-radius:8px; cursor:pointer; margin-bottom:18px; }" +
                "</style></head><body>" +
                "<button class='print no-print' onclick='window.print()'>Print / Save as PDF</button>" +
                "<h1>ITUS Bank — Account Statement</h1>" +
                "<div class='meta'>" + escapeHtml(account.getFullName() == null ? account.getUsername() : account.getFullName()) +
                " · A/C " + account.getAccountNumber() + "</div>" +
                "<div class='summary'>" +
                "<div><div class='label'>Transactions</div><div class='value'>" + count + "</div></div>" +
                "<div><div class='label'>Credits</div><div class='value' style='color:#059669'>+₹" + credits + "</div></div>" +
                "<div><div class='label'>Debits</div><div class='value' style='color:#dc2626'>-₹" + debits + "</div></div>" +
                "<div><div class='label'>Net</div><div class='value'>₹" + net + "</div></div>" +
                "</div>" +
                "<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th style='text-align:right'>Amount</th></tr></thead>" +
                "<tbody>" + body + "</tbody></table>" +
                "</body></html>";
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
