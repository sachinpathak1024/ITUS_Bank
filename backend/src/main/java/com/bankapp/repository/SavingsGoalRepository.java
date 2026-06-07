package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByOwnerOrderByCreatedAtDesc(Account owner);
    Optional<SavingsGoal> findByIdAndOwner(Long id, Account owner);
}
