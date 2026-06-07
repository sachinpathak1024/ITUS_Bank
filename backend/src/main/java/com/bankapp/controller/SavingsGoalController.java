package com.bankapp.controller;

import com.bankapp.dto.GoalContributeRequest;
import com.bankapp.dto.GoalRequest;
import com.bankapp.model.Account;
import com.bankapp.model.SavingsGoal;
import com.bankapp.service.AccountService;
import com.bankapp.service.SavingsGoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/goals")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class SavingsGoalController {

    @Autowired
    private SavingsGoalService goalService;

    @Autowired
    private AccountService accountService;

    @GetMapping
    public List<SavingsGoal> list(@AuthenticationPrincipal Account account) {
        return goalService.list(account);
    }

    @PostMapping
    public Map<String, Object> create(@AuthenticationPrincipal Account account,
                                      @RequestBody GoalRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            SavingsGoal goal = goalService.create(account, request);
            response.put("success", true);
            response.put("goal", goal);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/contribute")
    public Map<String, Object> contribute(@AuthenticationPrincipal Account account,
                                          @PathVariable Long id,
                                          @RequestBody GoalContributeRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            SavingsGoal goal = goalService.contribute(fresh, id, request);
            response.put("success", true);
            response.put("goal", goal);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            goalService.withdraw(fresh, id);
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
