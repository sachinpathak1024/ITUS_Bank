package com.bankapp.controller;

import com.bankapp.dto.IssueCardRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Card;
import com.bankapp.service.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin; 


import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/cards")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class CardController {

    @Autowired
    private CardService cardService;

    @GetMapping
    public List<Card> list(@AuthenticationPrincipal Account account) {
        return cardService.list(account);
    }

    @PostMapping
    public Map<String, Object> issue(@AuthenticationPrincipal Account account, @RequestBody IssueCardRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Card card = cardService.issue(account, request);
            response.put("success", true);
            response.put("card", card);
            response.put("message", "Card issued");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/freeze")
    public Map<String, Object> freeze(@AuthenticationPrincipal Account account, @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            cardService.setFrozen(account, id, Boolean.TRUE.equals(body.get("frozen")));
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/{id}/limit")
    public Map<String, Object> limit(@AuthenticationPrincipal Account account, @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            cardService.setLimit(account, id, body.get("dailyLimit"));
            response.put("success", true);
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
            cardService.delete(account, id);
            response.put("success", true);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
}
