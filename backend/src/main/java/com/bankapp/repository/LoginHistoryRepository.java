package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
    List<LoginHistory> findTop30ByAccountOrderByOccurredAtDesc(Account account);
}
