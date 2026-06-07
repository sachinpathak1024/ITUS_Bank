package com.bankapp.repository;

import com.bankapp.model.Transaction;
import com.bankapp.model.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByAccountOrderByCreatedAtDesc(Account account);

    @Query("SELECT t FROM Transaction t WHERE t.account = :account " +
            "AND (:type = '' OR t.transactionType = :type) " +
            "AND t.createdAt >= :start " +
            "AND t.createdAt <= :end " +
            "AND (:search = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY t.createdAt DESC")
    Page<Transaction> search(@Param("account") Account account,
                             @Param("type") String type,
                             @Param("start") LocalDateTime start,
                             @Param("end") LocalDateTime end,
                             @Param("search") String search,
                             Pageable pageable);
}
