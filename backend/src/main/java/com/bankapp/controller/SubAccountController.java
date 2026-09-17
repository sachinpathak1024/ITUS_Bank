package com.bankapp.controller;

import com.bankapp.dto.InternalTransferRequest;
import com.bankapp.dto.OpenSubAccountRequest;
import com.bankapp.model.Account;
import com.bankapp.model.SubAccount;
import com.bankapp.service.AccountService;
import com.bankapp.service.SubAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/sub-accounts")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class SubAccountController {

    @Autowired
    private SubAccountService subAccountService;

    @Autowired
    private AccountService accountService;

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        List<SubAccount> subs = subAccountService.list(fresh);
        Map<String, Object> response = new HashMap<>();
        response.put("main", Map.of("name", "Main Account", "type", fresh.getAccountType(), "accountNumber",
                fresh.getAccountNumber(), "balance", fresh.getBalance()));
        response.put("subs", subs);
        return response;
    }

    @PostMapping
    public Map<String, Object> open(@AuthenticationPrincipal Account account,
            @RequestBody OpenSubAccountRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            SubAccount sub = subAccountService.open(fresh, request);
            response.put("success", true);
            response.put("subAccount", sub);
            response.put("message", "Account opened");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/transfer")
    public Map<String, Object> transfer(@AuthenticationPrincipal Account account,
            @RequestBody InternalTransferRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            subAccountService.internalTransfer(fresh, request);
            response.put("success", true);
            response.put("message", "Transferred");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> close(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            subAccountService.close(fresh, id);
            response.put("success", true);
            response.put("message", "Account closed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
