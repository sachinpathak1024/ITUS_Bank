package com.bankapp.controller;

import com.bankapp.dto.AvatarRequest;
import com.bankapp.dto.ProfileResponse;
import com.bankapp.dto.TransactionRequest;
import com.bankapp.dto.UpdateProfileRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Transaction;
import com.bankapp.service.AccountService;
import com.bankapp.service.InsightsService;
import com.bankapp.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class BankController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private InsightsService insightsService;

    @GetMapping("/account")
    public Account getAccount(@AuthenticationPrincipal Account account) {
        return accountService.getAccountByUsername(account.getUsername());
    }

    @GetMapping("/profile")
    public ProfileResponse getProfile(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return new ProfileResponse(
                fresh.getUsername(), fresh.getFullName(), fresh.getEmail(),
                fresh.getAccountNumber(), fresh.getAccountType(),
                fresh.getBalance(), fresh.getCreatedAt(),
                fresh.getPhone(), fresh.getAddress(), fresh.getOccupation(),
                fresh.getKycStatus(), fresh.getAvatarBase64());
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(@AuthenticationPrincipal Account account,
                                             @RequestBody UpdateProfileRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            Account updated = accountService.updateProfile(fresh, request.getFullName(), request.getEmail(),
                    request.getPhone(), request.getAddress(), request.getOccupation());
            response.put("success", true);
            response.put("fullName", updated.getFullName());
            response.put("email", updated.getEmail());
            response.put("message", "Profile updated");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/profile/avatar")
    public Map<String, Object> updateAvatar(@AuthenticationPrincipal Account account,
                                            @RequestBody AvatarRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            accountService.updateAvatar(fresh, request.getAvatarBase64());
            response.put("success", true);
            response.put("message", "Avatar updated");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @GetMapping("/profile/stats")
    public Map<String, Object> profileStats(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        List<Transaction> all = transactionService.getAccountTransactions(fresh);
        BigDecimal credits = BigDecimal.ZERO;
        BigDecimal debits = BigDecimal.ZERO;
        long deposits = 0, withdrawals = 0, sent = 0, received = 0;
        for (Transaction t : all) {
            switch (t.getTransactionType()) {
                case "DEPOSIT" -> { credits = credits.add(t.getAmount()); deposits++; }
                case "TRANSFER_RECEIVED" -> { credits = credits.add(t.getAmount()); received++; }
                case "WITHDRAWAL" -> { debits = debits.add(t.getAmount()); withdrawals++; }
                case "TRANSFER_SENT" -> { debits = debits.add(t.getAmount()); sent++; }
            }
        }
        Map<String, Object> stats = new HashMap<>();
        stats.put("lifetimeCredits", credits);
        stats.put("lifetimeDebits", debits);
        stats.put("totalTransactions", all.size());
        stats.put("deposits", deposits);
        stats.put("withdrawals", withdrawals);
        stats.put("transfersSent", sent);
        stats.put("transfersReceived", received);
        return stats;
    }

    @PostMapping("/deposit")
    public Map<String, Object> deposit(@AuthenticationPrincipal Account account,
                                       @RequestBody TransactionRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account updated = accountService.deposit(account, request.getAmount(), request.getPin());
            response.put("success", true);
            response.put("balance", updated.getBalance());
            response.put("message", "Deposit successful");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/withdraw")
    public Map<String, Object> withdraw(@AuthenticationPrincipal Account account,
                                        @RequestBody TransactionRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account updated = accountService.withdraw(account, request.getAmount(), request.getPin());
            response.put("success", true);
            response.put("balance", updated.getBalance());
            response.put("message", "Withdrawal successful");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/transfer")
    public Map<String, Object> transfer(@AuthenticationPrincipal Account account,
                                        @RequestBody TransactionRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            accountService.transfer(account, request.getRecipientUsername(),
                    request.getAmount(), request.getDescription(), request.getPin());
            Account updated = accountService.getAccountByUsername(account.getUsername());
            response.put("success", true);
            response.put("balance", updated.getBalance());
            response.put("message", "Transfer successful");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @GetMapping("/transactions")
    public Map<String, Object> getTransactions(
            @AuthenticationPrincipal Account account,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Transaction> result = transactionService.search(account, type, start, end, search, page, size);
        Map<String, Object> response = new HashMap<>();
        response.put("content", result.getContent());
        response.put("totalElements", result.getTotalElements());
        response.put("totalPages", result.getTotalPages());
        response.put("page", result.getNumber());
        response.put("size", result.getSize());
        return response;
    }

    @GetMapping("/insights")
    public Map<String, Object> insights(@AuthenticationPrincipal Account account,
                                        @RequestParam(defaultValue = "6") int months) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return insightsService.compute(fresh, months);
    }

    @GetMapping("/statement")
    public ResponseEntity<String> statement(
            @AuthenticationPrincipal Account account,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        String csv = insightsService.csv(fresh, start, end);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "itus-bank-statement.csv");
        return new ResponseEntity<>(csv, headers, 200);
    }

    @GetMapping("/statement.html")
    public ResponseEntity<String> statementHtml(
            @AuthenticationPrincipal Account account,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        String html = insightsService.html(fresh, start, end);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_HTML);
        return new ResponseEntity<>(html, headers, 200);
    }
}
