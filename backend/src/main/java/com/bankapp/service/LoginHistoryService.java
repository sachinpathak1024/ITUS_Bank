package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.model.LoginHistory;
import com.bankapp.repository.LoginHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LoginHistoryService {

    @Autowired
    private LoginHistoryRepository loginHistoryRepository;

    public void record(Account account, boolean success, String ip, String userAgent) {
        if (account == null) return;
        LoginHistory entry = new LoginHistory();
        entry.setAccount(account);
        entry.setSuccess(success);
        entry.setIp(ip);
        entry.setUserAgent(userAgent == null ? null : userAgent.substring(0, Math.min(255, userAgent.length())));
        loginHistoryRepository.save(entry);
    }

    public List<LoginHistory> list(Account account) {
        return loginHistoryRepository.findTop30ByAccountOrderByOccurredAtDesc(account);
    }
}
