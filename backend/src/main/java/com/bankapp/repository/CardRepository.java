package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByOwnerOrderByIdAsc(Account owner);
    Optional<Card> findByIdAndOwner(Long id, Account owner);
}
