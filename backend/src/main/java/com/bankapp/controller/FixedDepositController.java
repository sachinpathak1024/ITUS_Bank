package com.bankapp.controller;

import com.bankapp.dto.FDRequest;
import com.bankapp.model.Account;
import com.bankapp.model.FixedDeposit;
import com.bankapp.service.AccountService;
import com.bankapp.service.FixedDepositService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/fds")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class FixedDepositController {

    @Autowired
    private FixedDepositService fdService;

    @Autowired
    private AccountService accountService;

    @GetMapping("/rates")
    public Map<Integer, BigDecimal> rates() {
        return fdService.rates();
    }

    @GetMapping
    public List<FixedDeposit> list(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return fdService.list(fresh);
    }

    @PostMapping("/open")
    public Map<String, Object> open(@AuthenticationPrincipal Account account, @RequestBody FDRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            FixedDeposit fd = fdService.open(fresh, request);
            response.put("success", true);
            response.put("fd", fd);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/mature")
    public Map<String, Object> mature(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            FixedDeposit fd = fdService.mature(fresh, id);
            response.put("success", true);
            response.put("fd", fd);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/break")
    public Map<String, Object> breakFd(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            FixedDeposit fd = fdService.breakFd(fresh, id);
            response.put("success", true);
            response.put("fd", fd);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
