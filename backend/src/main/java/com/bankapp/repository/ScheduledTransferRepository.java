package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.ScheduledTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledTransferRepository extends JpaRepository<ScheduledTransfer, Long> {
    List<ScheduledTransfer> findByOwnerOrderByNextRunAsc(Account owner);
    Optional<ScheduledTransfer> findByIdAndOwner(Long id, Account owner);
}
