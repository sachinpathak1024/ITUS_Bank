package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.model.Transaction;
import com.bankapp.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    public void recordTransaction(Account account, String type, BigDecimal amount,
                                 String recipientAccount, String senderAccount, String description) {
        Transaction transaction = new Transaction();
        transaction.setAccount(account);
        transaction.setTransactionType(type);
        transaction.setAmount(amount);
        transaction.setRecipientAccount(recipientAccount);
        transaction.setSenderAccount(senderAccount);
        transaction.setDescription(description);
        transactionRepository.save(transaction);
    }

    public List<Transaction> getAccountTransactions(Account account) {
        return transactionRepository.findByAccountOrderByCreatedAtDesc(account);
    }

    private static final LocalDateTime FAR_PAST = LocalDateTime.of(1900, 1, 1, 0, 0);
    private static final LocalDateTime FAR_FUTURE = LocalDateTime.of(9999, 12, 31, 23, 59);

    public Page<Transaction> search(Account account, String type, LocalDateTime start, LocalDateTime end,
                                    String search, int page, int size) {
        String normalizedType = (type == null || type.isBlank() || "ALL".equalsIgnoreCase(type)) ? "" : type;
        String normalizedSearch = (search == null || search.isBlank()) ? "" : search;
        LocalDateTime normalizedStart = start == null ? FAR_PAST : start;
        LocalDateTime normalizedEnd = end == null ? FAR_FUTURE : end;
        return transactionRepository.search(account, normalizedType, normalizedStart, normalizedEnd,
                normalizedSearch, PageRequest.of(page, size));
    }
}
