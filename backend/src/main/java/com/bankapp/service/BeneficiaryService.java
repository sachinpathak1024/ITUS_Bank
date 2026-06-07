package com.bankapp.service;

import com.bankapp.dto.BeneficiaryRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Beneficiary;
import com.bankapp.repository.BeneficiaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BeneficiaryService {

    @Autowired
    private BeneficiaryRepository beneficiaryRepository;

    @Autowired
    private AccountService accountService;

    @Autowired
    private NotificationService notificationService;

    public List<Beneficiary> list(Account owner) {
        return beneficiaryRepository.findByOwnerOrderByCreatedAtDesc(owner);
    }

    public Beneficiary add(Account owner, BeneficiaryRequest request) {
        if (request.getRecipientUsername() == null || request.getRecipientUsername().isBlank()) {
            throw new IllegalArgumentException("Recipient username is required");
        }
        if (request.getRecipientUsername().equals(owner.getUsername())) {
            throw new IllegalArgumentException("You cannot add yourself as a beneficiary");
        }
        if (beneficiaryRepository.existsByOwnerAndRecipientUsername(owner, request.getRecipientUsername())) {
            throw new IllegalArgumentException("This beneficiary is already saved");
        }
        Account recipient = accountService.getAccountByUsername(request.getRecipientUsername());

        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setOwner(owner);
        beneficiary.setRecipientUsername(recipient.getUsername());
        beneficiary.setRecipientFullName(recipient.getFullName());
        beneficiary.setRecipientAccountNumber(recipient.getAccountNumber());
        beneficiary.setNickname(request.getNickname() == null || request.getNickname().isBlank()
                ? recipient.getFullName() : request.getNickname());
        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        notificationService.emit(owner, "BENEFICIARY", "Beneficiary added",
                "You added " + beneficiary.getNickname() + " (@" + recipient.getUsername() + ").");
        return saved;
    }

    public void delete(Account owner, Long id) {
        Beneficiary beneficiary = beneficiaryRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        beneficiaryRepository.delete(beneficiary);
    }
}
