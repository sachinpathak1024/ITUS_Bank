package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.FixedDeposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FixedDepositRepository extends JpaRepository<FixedDeposit, Long> {
    List<FixedDeposit> findByOwnerOrderByStartAtDesc(Account owner);
    Optional<FixedDeposit> findByIdAndOwner(Long id, Account owner);
}
