package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByOwnerOrderByCategoryAsc(Account owner);
    Optional<Budget> findByOwnerAndCategory(Account owner, String category);
    Optional<Budget> findByIdAndOwner(Long id, Account owner);
}
