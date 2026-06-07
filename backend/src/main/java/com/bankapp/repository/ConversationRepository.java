package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findTop50ByAccountOrderByOccurredAtAsc(Account account);

    @Modifying
    @Query("DELETE FROM Conversation c WHERE c.account = :account")
    int deleteAllByAccount(@Param("account") Account account);
}
