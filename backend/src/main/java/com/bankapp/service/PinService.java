package com.bankapp.service;

import com.bankapp.model.Account;
import com.bankapp.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PinService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public boolean isSet(Account account) {
        return account.getPinHash() != null && !account.getPinHash().isBlank();
    }

    /**
     * Enforce PIN: if the user has set a PIN, the request must include a matching
     * one. If no PIN is set, this is a no-op (PIN is opt-in).
     */
    public void enforce(Account account, String pin) {
        if (!isSet(account))
            return;
        if (pin == null || pin.isBlank()) {
            throw new IllegalArgumentException("PIN required");
        }
        if (!passwordEncoder.matches(pin, account.getPinHash())) {
            throw new IllegalArgumentException("Incorrect PIN");
        }
    }

    public void setPin(Account account, String newPin) {
        validateFormat(newPin);
        account.setPinHash(passwordEncoder.encode(newPin));
        accountRepository.save(account);
    }

    public void changePin(Account account, String currentPin, String newPin) {
        if (!isSet(account)) {
            throw new IllegalArgumentException("PIN is not set yet");
        }
        if (!passwordEncoder.matches(currentPin, account.getPinHash())) {
            throw new IllegalArgumentException("Current PIN is incorrect");
        }
        validateFormat(newPin);
        account.setPinHash(passwordEncoder.encode(newPin));
        accountRepository.save(account);
    }

    public void clearPin(Account account) {
        account.setPinHash(null);
        accountRepository.save(account);
    }

    private void validateFormat(String pin) {
        if (pin == null || !pin.matches("\\d{4}")) {
            throw new IllegalArgumentException("PIN must be exactly 4 digits");
        }
    }
}
