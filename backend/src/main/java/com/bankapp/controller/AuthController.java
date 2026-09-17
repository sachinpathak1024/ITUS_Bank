package com.bankapp.controller;

import com.bankapp.dto.*;
import com.bankapp.model.Account;
import com.bankapp.security.JwtTokenProvider;
import com.bankapp.service.AccountService;
import com.bankapp.service.LoginHistoryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"}, allowCredentials = "true")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private AccountService accountService;

    @Autowired
    private LoginHistoryService loginHistoryService;

    @PostMapping("/register")
    public JwtResponse register(@RequestBody RegisterRequest request) {
        try {
            Account account = accountService.registerAccount(request);
            String token = tokenProvider.generateToken(account);
            return new JwtResponse(token, account.getUsername(), account.getEmail(), account.getFullName(),
                    "Registration successful");
        } catch (IllegalArgumentException e) {
            return new JwtResponse(null, null, null, null, e.getMessage());
        }
    }

    @PostMapping("/login")
    public JwtResponse login(@RequestBody LoginRequest request, HttpServletRequest http) {
        Account attempted = null;
        try {
            attempted = accountService.getAccountByUsername(request.getUsername());
        } catch (Exception ignored) {
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

            Account account = (Account) authentication.getPrincipal();
            String token = tokenProvider.generateToken(account);
            loginHistoryService.record(account, true, clientIp(http), http.getHeader("User-Agent"));
            return new JwtResponse(token, account.getUsername(), account.getEmail(), account.getFullName(),
                    "Login successful");
        } catch (Exception e) {
            if (attempted != null) {
                loginHistoryService.record(attempted, false, clientIp(http), http.getHeader("User-Agent"));
            }
            return new JwtResponse(null, null, null, null, "Invalid credentials");
        }
    }

    @PostMapping("/change-password")
    public Map<String, Object> changePassword(@AuthenticationPrincipal Account account,
            @RequestBody ChangePasswordRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (account == null) {
                throw new IllegalArgumentException("Not authenticated");
            }
            Account fresh = accountService.getAccountByUsername(account.getUsername());
            accountService.changePassword(fresh, request.getCurrentPassword(), request.getNewPassword());
            response.put("success", true);
            response.put("message", "Password changed");
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank())
            return xff.split(",")[0].trim();
        String real = http.getHeader("X-Real-IP");
        if (real != null && !real.isBlank())
            return real;
        return http.getRemoteAddr();
    }
}
