package com.bankapp.controller;

import com.bankapp.dto.PayBillRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Bill;
import com.bankapp.service.BillService;
import com.bankapp.service.BillerCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/bills")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class BillController {

    @Autowired
    private BillService billService;

    @GetMapping("/billers")
    public Map<String, List<String>> billers() {
        return BillerCatalog.CATALOG;
    }

    @GetMapping
    public List<Bill> recent(@AuthenticationPrincipal Account account) {
        return billService.recent(account);
    }

    @PostMapping("/pay")
    public Map<String, Object> pay(@AuthenticationPrincipal Account account,
                                   @RequestBody PayBillRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Bill bill = billService.pay(account, request);
            response.put("success", true);
            response.put("bill", bill);
            response.put("message", "Bill paid");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
