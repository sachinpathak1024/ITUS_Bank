package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop30ByAccountOrderByCreatedAtDesc(Account account);
    long countByAccountAndReadFalse(Account account);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.account = :account AND n.read = false")
    int markAllRead(@Param("account") Account account);
}
