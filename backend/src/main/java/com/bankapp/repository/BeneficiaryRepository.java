package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    List<Beneficiary> findByOwnerOrderByCreatedAtDesc(Account owner);
    Optional<Beneficiary> findByIdAndOwner(Long id, Account owner);
    boolean existsByOwnerAndRecipientUsername(Account owner, String recipientUsername);
}
