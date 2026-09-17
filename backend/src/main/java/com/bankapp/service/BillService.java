package com.bankapp.service;

import com.bankapp.dto.PayBillRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Bill;
import com.bankapp.repository.AccountRepository;
import com.bankapp.repository.BillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class BillService {

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PinService pinService;

    @Autowired
    private BudgetService budgetService;

    @Transactional
    public Bill pay(Account account, PayBillRequest request) {
        pinService.enforce(account, request.getPin());
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        if (request.getCategory() == null || request.getBillerName() == null) {
            throw new IllegalArgumentException("Category and biller are required");
        }
        if (!BillerCatalog.isValid(request.getCategory(), request.getBillerName())) {
            throw new IllegalArgumentException("Unknown biller for that category");
        }
        if (account.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }

        account.setBalance(account.getBalance().subtract(request.getAmount()));
        accountRepository.save(account);

        Bill bill = new Bill();
        bill.setAccount(account);
        bill.setCategory(request.getCategory());
        bill.setBillerName(request.getBillerName());
        bill.setBillNumber(request.getBillNumber());
        bill.setAmount(request.getAmount());
        Bill saved = billRepository.save(bill);

        String description = "Bill: " + request.getBillerName()
                + (request.getCategory() == null ? "" : " (" + request.getCategory() + ")");
        transactionService.recordTransaction(account, "WITHDRAWAL", request.getAmount(), null, null, description);

        notificationService.emit(account, "BILL", "Bill paid",
                "Paid ₹" + request.getAmount() + " to " + request.getBillerName() + ".");

        budgetService.evaluate(account);
        return saved;
    }

    public List<Bill> recent(Account account) {
        return billRepository.findTop20ByAccountOrderByPaidAtDesc(account);
    }
}
