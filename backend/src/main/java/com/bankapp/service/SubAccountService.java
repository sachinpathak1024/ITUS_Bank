package com.bankapp.service;

import com.bankapp.dto.InternalTransferRequest;
import com.bankapp.dto.OpenSubAccountRequest;
import com.bankapp.model.Account;
import com.bankapp.model.SubAccount;
import com.bankapp.repository.AccountRepository;
import com.bankapp.repository.SubAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SubAccountService {

    private static final Set<String> TYPES = Set.of("SAVINGS", "CHECKING", "BUSINESS", "JOINT");

    @Autowired
    private SubAccountRepository subAccountRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PinService pinService;

    public List<SubAccount> list(Account owner) {
        return subAccountRepository.findByOwnerOrderByIdAsc(owner);
    }

    @Transactional
    public SubAccount open(Account owner, OpenSubAccountRequest request) {
        pinService.enforce(owner, request.getPin());
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        String type = request.getType() == null ? "CHECKING" : request.getType().toUpperCase();
        if (!TYPES.contains(type)) {
            throw new IllegalArgumentException("Type must be one of: " + TYPES);
        }
        BigDecimal initial = request.getInitialDeposit() == null ? BigDecimal.ZERO : request.getInitialDeposit();
        if (initial.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Initial deposit cannot be negative");
        }
        if (initial.compareTo(BigDecimal.ZERO) > 0 && owner.getBalance().compareTo(initial) < 0) {
            throw new IllegalArgumentException("Insufficient main balance for initial deposit");
        }
        if (subAccountRepository.countByOwner(owner) >= 5) {
            throw new IllegalArgumentException("You can have at most 5 additional accounts");
        }

        SubAccount sub = new SubAccount();
        sub.setOwner(owner);
        sub.setName(request.getName().trim());
        sub.setType(type);
        sub.setAccountNumber("S-" + UUID.randomUUID().toString().substring(0, 10));
        sub.setBalance(initial);

        if (initial.compareTo(BigDecimal.ZERO) > 0) {
            owner.setBalance(owner.getBalance().subtract(initial));
            accountRepository.save(owner);
            transactionService.recordTransaction(owner, "WITHDRAWAL", initial, sub.getAccountNumber(), null,
                    "Funded new " + type + " account: " + sub.getName());
        }
        SubAccount saved = subAccountRepository.save(sub);
        notificationService.emit(owner, "SYSTEM", "Account opened",
                "New " + type + " account '" + sub.getName() + "' is ready.");
        return saved;
    }

    @Transactional
    public void close(Account owner, Long id) {
        SubAccount sub = subAccountRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (sub.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            owner.setBalance(owner.getBalance().add(sub.getBalance()));
            accountRepository.save(owner);
            transactionService.recordTransaction(owner, "DEPOSIT", sub.getBalance(), null, sub.getAccountNumber(),
                    "Closing balance from " + sub.getName());
        }
        subAccountRepository.delete(sub);
    }

    @Transactional
    public void internalTransfer(Account owner, InternalTransferRequest request) {
        pinService.enforce(owner, request.getPin());
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        if (request.getFromKind() == null || request.getToKind() == null) {
            throw new IllegalArgumentException("From and To accounts are required");
        }
        if (request.getFromKind().equalsIgnoreCase(request.getToKind())
                && java.util.Objects.equals(request.getFromSubId(), request.getToSubId())) {
            throw new IllegalArgumentException("Source and destination must differ");
        }

        BigDecimal amount = request.getAmount();
        String fromLabel;
        String toLabel;

        if ("MAIN".equalsIgnoreCase(request.getFromKind())) {
            if (owner.getBalance().compareTo(amount) < 0) {
                throw new IllegalArgumentException("Insufficient funds in main account");
            }
            owner.setBalance(owner.getBalance().subtract(amount));
            fromLabel = "Main Account (" + owner.getAccountNumber() + ")";
        } else {
            SubAccount from = subAccountRepository.findByIdAndOwner(request.getFromSubId(), owner)
                    .orElseThrow(() -> new IllegalArgumentException("Source sub-account not found"));
            if (from.getBalance().compareTo(amount) < 0) {
                throw new IllegalArgumentException("Insufficient funds in " + from.getName());
            }
            from.setBalance(from.getBalance().subtract(amount));
            subAccountRepository.save(from);
            fromLabel = from.getName() + " (" + from.getAccountNumber() + ")";
        }

        if ("MAIN".equalsIgnoreCase(request.getToKind())) {
            owner.setBalance(owner.getBalance().add(amount));
            toLabel = "Main Account (" + owner.getAccountNumber() + ")";
        } else {
            SubAccount to = subAccountRepository.findByIdAndOwner(request.getToSubId(), owner)
                    .orElseThrow(() -> new IllegalArgumentException("Destination sub-account not found"));
            to.setBalance(to.getBalance().add(amount));
            subAccountRepository.save(to);
            toLabel = to.getName() + " (" + to.getAccountNumber() + ")";
        }

        accountRepository.save(owner);
        transactionService.recordTransaction(owner, "WITHDRAWAL", amount, null, null,
                "Moved to " + toLabel + " from " + fromLabel);
        notificationService.emit(owner, "TRANSFER", "Internal transfer",
                "₹" + amount + " moved between your accounts.");
    }
}
