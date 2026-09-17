package com.bankapp.controller;

import com.bankapp.dto.ScheduledTransferRequest;
import com.bankapp.model.Account;
import com.bankapp.model.ScheduledTransfer;
import com.bankapp.service.ScheduledTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/scheduled-transfers")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class ScheduledTransferController {

    @Autowired
    private ScheduledTransferService scheduledTransferService;

    @GetMapping
    public List<ScheduledTransfer> list(@AuthenticationPrincipal Account account) {
        return scheduledTransferService.list(account);
    }

    @PostMapping
    public Map<String, Object> create(@AuthenticationPrincipal Account account,
            @RequestBody ScheduledTransferRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            ScheduledTransfer st = scheduledTransferService.create(account, request);
            response.put("success", true);
            response.put("scheduled", st);
            response.put("message", "Scheduled transfer created");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> cancel(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            scheduledTransferService.cancel(account, id);
            response.put("success", true);
            response.put("message", "Scheduled transfer cancelled");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/run-now")
    public Map<String, Object> runNow(@AuthenticationPrincipal Account account, @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            ScheduledTransfer st = scheduledTransferService.runNow(account, id);
            response.put("success", true);
            response.put("scheduled", st);
            response.put("message", "Transfer executed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
