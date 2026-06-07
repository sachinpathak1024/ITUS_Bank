package com.bankapp.controller;

import com.bankapp.model.Account;
import com.bankapp.model.Notification;
import com.bankapp.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank/notifications")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal Account account) {
        List<Notification> items = notificationService.list(account);
        long unread = notificationService.unreadCount(account);
        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("unread", unread);
        return response;
    }

    @PostMapping("/read-all")
    public Map<String, Object> markAllRead(@AuthenticationPrincipal Account account) {
        int updated = notificationService.markAllRead(account);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("updated", updated);
        return response;
    }
}
