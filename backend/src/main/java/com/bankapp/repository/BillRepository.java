package com.bankapp.repository;

import com.bankapp.model.Account;
import com.bankapp.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findTop20ByAccountOrderByPaidAtDesc(Account account);
}
