package com.bankapp.service;

import com.bankapp.dto.RegisterRequest;
import com.bankapp.model.Account;
import com.bankapp.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class AccountService {

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

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Account registerAccount(RegisterRequest request) {
        if (accountRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        Account account = new Account();
        account.setUsername(request.getUsername());
        account.setEmail(request.getEmail());
        account.setPassword(passwordEncoder.encode(request.getPassword()));
        account.setFullName(request.getFullName());
        account.setAccountNumber(UUID.randomUUID().toString().substring(0, 12));
        account.setBalance(new BigDecimal("10000.00")); // Initial balance
        account.setAccountType("SAVINGS");

        return accountRepository.save(account);
    }

    public Account getAccountByUsername(String username) {
        return accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    }

    public Account deposit(Account account, BigDecimal amount, String pin) {
        pinService.enforce(account, pin);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);
        transactionService.recordTransaction(account, "DEPOSIT", amount, null, null, "Deposit");
        notificationService.emit(account, "DEPOSIT", "Deposit received",
                "₹" + amount + " was added to your account.");
        return account;
    }

    public Account withdraw(Account account, BigDecimal amount, String pin) {
        pinService.enforce(account, pin);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }
        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);
        transactionService.recordTransaction(account, "WITHDRAWAL", amount, null, null, "Withdrawal");
        notificationService.emit(account, "WITHDRAWAL", "Withdrawal completed",
                "₹" + amount + " was withdrawn from your account.");
        budgetService.evaluate(account);
        return account;
    }

    public void transfer(Account fromAccount, String toUsername, BigDecimal amount, String note, String pin) {
        pinService.enforce(fromAccount, pin);
        transferUnchecked(fromAccount, toUsername, amount, note);
    }

    /** Used by the scheduled-transfer cron — PIN is not enforced because the user authorised it at scheduling time. */
    public void transferUnchecked(Account fromAccount, String toUsername, BigDecimal amount, String note) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }

        Account toAccount = getAccountByUsername(toUsername);
        if (fromAccount.getId().equals(toAccount.getId())) {
            throw new IllegalArgumentException("Cannot transfer to yourself");
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        String sentDescription = (note == null || note.isBlank())
                ? "Transfer to " + toUsername : "Transfer to " + toUsername + " — " + note;
        String receivedDescription = (note == null || note.isBlank())
                ? "Transfer from " + fromAccount.getUsername()
                : "Transfer from " + fromAccount.getUsername() + " — " + note;

        transactionService.recordTransaction(fromAccount, "TRANSFER_SENT", amount,
                toAccount.getAccountNumber(), null, sentDescription);
        transactionService.recordTransaction(toAccount, "TRANSFER_RECEIVED", amount,
                null, fromAccount.getAccountNumber(), receivedDescription);

        notificationService.emit(fromAccount, "TRANSFER", "Transfer sent",
                "₹" + amount + " sent to " + toUsername + ".");
        notificationService.emit(toAccount, "TRANSFER", "Money received",
                "₹" + amount + " received from " + fromAccount.getUsername() + ".");
        budgetService.evaluate(fromAccount);
    }

    public Account updateProfile(Account account, String fullName, String email,
                                 String phone, String address, String occupation) {
        if (fullName != null && !fullName.isBlank()) {
            account.setFullName(fullName);
        }
        if (email != null && !email.isBlank() && !email.equals(account.getEmail())) {
            if (accountRepository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email already in use");
            }
            account.setEmail(email);
        }
        if (phone != null) account.setPhone(phone);
        if (address != null) account.setAddress(address);
        if (occupation != null) account.setOccupation(occupation);
        return accountRepository.save(account);
    }

    public Account updateAvatar(Account account, String avatarBase64) {
        if (avatarBase64 != null && avatarBase64.length() > 700_000) {
            throw new IllegalArgumentException("Image too large (max ~500KB)");
        }
        account.setAvatarBase64(avatarBase64);
        return accountRepository.save(account);
    }

    public void changePassword(Account account, String currentPassword, String newPassword) {
        if (currentPassword == null || newPassword == null) {
            throw new IllegalArgumentException("Both current and new password are required");
        }
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }
        if (!passwordEncoder.matches(currentPassword, account.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);
    }
}
