package com.bankapp.controller;

import com.bankapp.dto.LoanRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Loan;
import com.bankapp.service.LoanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/loans")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class LoanController {

    @Autowired
    private LoanService loanService;

    @GetMapping("/rates")
    public Map<String, BigDecimal> rates() {
        return loanService.rates();
    }

    @GetMapping
    public List<Loan> list(@AuthenticationPrincipal Account account) {
        return loanService.list(account);
    }

    @PostMapping("/emi-calc")
    public Map<String, Object> emiCalc(@RequestBody LoanRequest request) {
        BigDecimal rate = loanService.rates().get(
                request.getPurpose() == null ? "PERSONAL" : request.getPurpose().toUpperCase()
        );
        Map<String, Object> response = new HashMap<>();
        if (rate == null) {
            response.put("success", false);
            response.put("message", "Unknown loan purpose");
            return response;
        }
        BigDecimal emi = loanService.computeEmi(request.getPrincipal(), rate,
                request.getTenureMonths() == null ? 12 : request.getTenureMonths());
        response.put("success", true);
        response.put("rate", rate);
        response.put("emi", emi);
        response.put("totalPayable",
                emi.multiply(BigDecimal.valueOf(request.getTenureMonths() == null ? 12 : request.getTenureMonths())));
        return response;
    }

    @PostMapping("/apply")
    public Map<String, Object> apply(@AuthenticationPrincipal Account account,
                                     @RequestBody LoanRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Loan loan = loanService.apply(account, request);
            response.put("success", true);
            response.put("loan", loan);
            response.put("message", "Loan approved");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/pay-emi")
    public Map<String, Object> payEmi(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Loan loan = loanService.payEmi(account, id);
            response.put("success", true);
            response.put("loan", loan);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
