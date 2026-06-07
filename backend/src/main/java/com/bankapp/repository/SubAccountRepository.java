package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.SubAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubAccountRepository extends JpaRepository<SubAccount, Long> {
    List<SubAccount> findByOwnerOrderByIdAsc(Account owner);
    Optional<SubAccount> findByIdAndOwner(Long id, Account owner);
    long countByOwner(Account owner);
}
