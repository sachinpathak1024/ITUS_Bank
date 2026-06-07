package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.model.Notification;
import com.bankapp.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    public void emit(Account account, String type, String title, String message) {
        if (account == null) return;
        Notification n = new Notification();
        n.setAccount(account);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        notificationRepository.save(n);
    }

    public List<Notification> list(Account account) {
        return notificationRepository.findTop30ByAccountOrderByCreatedAtDesc(account);
    }

    public long unreadCount(Account account) {
        return notificationRepository.countByAccountAndReadFalse(account);
    }

    @Transactional
    public int markAllRead(Account account) {
        return notificationRepository.markAllRead(account);
    }
}
