package com.bankapp.service;

import com.bankapp.dto.GoalContributeRequest;
import com.bankapp.dto.GoalRequest;
import com.bankapp.model.Account;
import com.bankapp.model.SavingsGoal;
import com.bankapp.repository.AccountRepository;
import com.bankapp.repository.SavingsGoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SavingsGoalService {

    @Autowired
    private SavingsGoalRepository goalRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PinService pinService;

    public List<SavingsGoal> list(Account owner) {
        return goalRepository.findByOwnerOrderByCreatedAtDesc(owner);
    }

    public SavingsGoal create(Account owner, GoalRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (request.getTarget() == null || request.getTarget().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Target must be greater than 0");
        }
        SavingsGoal goal = new SavingsGoal();
        goal.setOwner(owner);
        goal.setName(request.getName().trim());
        goal.setIcon(request.getIcon());
        goal.setTarget(request.getTarget());
        goal.setSaved(BigDecimal.ZERO);
        goal.setDeadline(request.getDeadline());
        return goalRepository.save(goal);
    }

    @Transactional
    public SavingsGoal contribute(Account owner, Long id, GoalContributeRequest request) {
        pinService.enforce(owner, request.getPin());
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        if (owner.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }
        SavingsGoal goal = goalRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found"));

        owner.setBalance(owner.getBalance().subtract(request.getAmount()));
        accountRepository.save(owner);
        goal.setSaved(goal.getSaved().add(request.getAmount()));
        SavingsGoal saved = goalRepository.save(goal);

        transactionService.recordTransaction(owner, "WITHDRAWAL", request.getAmount(), null, null,
                "Contribution to goal: " + goal.getName());

        if (saved.getSaved().compareTo(saved.getTarget()) >= 0) {
            notificationService.emit(owner, "SYSTEM", "Goal reached!",
                    "You hit your target for '" + saved.getName() + "'!");
        } else {
            notificationService.emit(owner, "SYSTEM", "Goal contribution",
                    "₹" + request.getAmount() + " added to '" + saved.getName() + "'.");
        }
        return saved;
    }

    @Transactional
    public void withdraw(Account owner, Long id) {
        SavingsGoal goal = goalRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found"));
        BigDecimal returnAmount = goal.getSaved();
        if (returnAmount.compareTo(BigDecimal.ZERO) > 0) {
            owner.setBalance(owner.getBalance().add(returnAmount));
            accountRepository.save(owner);
            transactionService.recordTransaction(owner, "DEPOSIT", returnAmount, null, null,
                    "Withdrew goal '" + goal.getName() + "'");
        }
        goalRepository.delete(goal);
    }
}
