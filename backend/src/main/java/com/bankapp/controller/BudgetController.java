package com.bankapp.controller;

import com.bankapp.dto.BudgetRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Budget;
import com.bankapp.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/budgets")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal Account account) {
        List<Budget> budgets = budgetService.list(account);
        Map<String, BigDecimal> spending = budgetService.monthToDateSpending(account);
        Map<String, Object> response = new HashMap<>();
        response.put("budgets", budgets);
        response.put("spending", spending);
        return response;
    }

    @PostMapping
    public Map<String, Object> upsert(@AuthenticationPrincipal Account account, @RequestBody BudgetRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Budget budget = budgetService.upsert(account, request);
            response.put("success", true);
            response.put("budget", budget);
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
            budgetService.delete(account, id);
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
