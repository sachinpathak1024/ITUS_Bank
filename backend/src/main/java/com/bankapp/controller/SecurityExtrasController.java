package com.bankapp.controller;

import com.bankapp.dto.PinRequest;
import com.bankapp.model.Account;
import com.bankapp.model.LoginHistory;
import com.bankapp.service.AccountService;
import com.bankapp.service.LoginHistoryService;
import com.bankapp.service.PinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/security")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class SecurityExtrasController {

    @Autowired
    private PinService pinService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private LoginHistoryService loginHistoryService;

    @GetMapping("/pin-status")
    public Map<String, Object> pinStatus(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        Map<String, Object> response = new HashMap<>();
        response.put("isSet", pinService.isSet(fresh));
        return response;
    }

    @PostMapping("/pin")
    public Map<String, Object> setPin(@AuthenticationPrincipal Account account, @RequestBody PinRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            if (pinService.isSet(fresh)) {
                throw new IllegalArgumentException("PIN already set — use change instead");
            }
            pinService.setPin(fresh, request.getPin());
            response.put("success", true);
            response.put("message", "PIN set");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/pin/change")
    public Map<String, Object> changePin(@AuthenticationPrincipal Account account, @RequestBody PinRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            pinService.changePin(fresh, request.getCurrentPin(), request.getNewPin());
            response.put("success", true);
            response.put("message", "PIN changed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @DeleteMapping("/pin")
    public Map<String, Object> clearPin(@AuthenticationPrincipal Account account, @RequestBody PinRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            pinService.enforce(fresh, request.getCurrentPin());
            pinService.clearPin(fresh);
            response.put("success", true);
            response.put("message", "PIN removed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @GetMapping("/login-history")
    public List<LoginHistory> loginHistory(@AuthenticationPrincipal Account account) {
        Account fresh = accountService.getAccountByUsername(account.getUsername());
        return loginHistoryService.list(fresh);
    }
}
