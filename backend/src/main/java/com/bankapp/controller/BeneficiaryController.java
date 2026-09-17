package com.bankapp.controller;

import com.bankapp.dto.BeneficiaryRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Beneficiary;
import com.bankapp.service.BeneficiaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/beneficiaries")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class BeneficiaryController {

    @Autowired
    private BeneficiaryService beneficiaryService;

    @GetMapping
    public List<Beneficiary> list(@AuthenticationPrincipal Account account) {
        return beneficiaryService.list(account);
    }

    @PostMapping
    public Map<String, Object> add(@AuthenticationPrincipal Account account, @RequestBody BeneficiaryRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Beneficiary beneficiary = beneficiaryService.add(account, request);
            response.put("success", true);
            response.put("beneficiary", beneficiary);
            response.put("message", "Beneficiary added");
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
            beneficiaryService.delete(account, id);
            response.put("success", true);
            response.put("message", "Beneficiary removed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
