package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {
    List<Loan> findByOwnerOrderByCreatedAtDesc(Account owner);
    Optional<Loan> findByIdAndOwner(Long id, Account owner);
}
