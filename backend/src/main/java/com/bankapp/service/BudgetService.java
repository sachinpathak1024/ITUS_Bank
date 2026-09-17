package com.bankapp.service;

import com.bankapp.dto.BudgetRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Budget;
import com.bankapp.model.Transaction;
import com.bankapp.repository.BudgetRepository;
import com.bankapp.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;

    public List<Budget> list(Account owner) {
        return budgetRepository.findByOwnerOrderByCategoryAsc(owner);
    }

    public Budget upsert(Account owner, BudgetRequest request) {
        if (request.getCategory() == null || request.getCategory().isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }
        if (request.getMonthlyLimit() == null || request.getMonthlyLimit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Limit must be greater than 0");
        }
        Budget budget = budgetRepository.findByOwnerAndCategory(owner, request.getCategory()).orElseGet(() -> {
            Budget b = new Budget();
            b.setOwner(owner);
            b.setCategory(request.getCategory());
            return b;
        });
        budget.setMonthlyLimit(request.getMonthlyLimit());
        // Reset alert flags so they re-fire next time
        budget.setAlert80SentFor(null);
        budget.setAlert100SentFor(null);
        return budgetRepository.save(budget);
    }

    public void delete(Account owner, Long id) {
        Budget budget = budgetRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        budgetRepository.delete(budget);
    }

    /**
     * Return month-to-date spending per category, for all of the owner's budgets.
     */
    public Map<String, BigDecimal> monthToDateSpending(Account owner) {
        LocalDateTime monthStart = YearMonth.now().atDay(1).atStartOfDay();
        List<Transaction> recent = transactionRepository.findByAccountOrderByCreatedAtDesc(owner);
        Map<String, BigDecimal> totals = new HashMap<>();
        for (Transaction t : recent) {
            if (t.getCreatedAt() == null || t.getCreatedAt().isBefore(monthStart))
                continue;
            String category = categoryOf(t);
            if (category == null)
                continue;
            totals.merge(category, t.getAmount(), BigDecimal::add);
        }
        return totals;
    }

    /** Re-evaluate alerts after a money operation. */
    public void evaluate(Account owner) {
        List<Budget> budgets = list(owner);
        if (budgets.isEmpty())
            return;
        Map<String, BigDecimal> spending = monthToDateSpending(owner);
        String monthKey = YearMonth.now().toString();
        for (Budget b : budgets) {
            BigDecimal spent = spending.getOrDefault(b.getCategory(), BigDecimal.ZERO);
            BigDecimal pct = b.getMonthlyLimit().compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : spent.multiply(BigDecimal.valueOf(100)).divide(b.getMonthlyLimit(), 0, RoundingMode.HALF_UP);
            boolean changed = false;
            if (pct.intValue() >= 100 && !monthKey.equals(b.getAlert100SentFor())) {
                notificationService.emit(owner, "SYSTEM", b.getCategory() + " budget exceeded",
                        "You've spent ₹" + spent + " — over your ₹" + b.getMonthlyLimit() + " limit.");
                b.setAlert100SentFor(monthKey);
                changed = true;
            } else if (pct.intValue() >= 80 && !monthKey.equals(b.getAlert80SentFor())) {
                notificationService.emit(owner, "SYSTEM", b.getCategory() + " budget at " + pct + "%",
                        "₹" + spent + " of ₹" + b.getMonthlyLimit() + " used this month.");
                b.setAlert80SentFor(monthKey);
                changed = true;
            }
            if (changed)
                budgetRepository.save(b);
        }
    }

    private String categoryOf(Transaction t) {
        if (t == null || t.getTransactionType() == null)
            return null;
        String type = t.getTransactionType();
        if ("DEPOSIT".equals(type) || "TRANSFER_RECEIVED".equals(type))
            return null;
        if ("TRANSFER_SENT".equals(type))
            return "TRANSFER";
        if ("WITHDRAWAL".equals(type)) {
            String d = t.getDescription();
            if (d != null && d.startsWith("Bill:")) {
                int open = d.lastIndexOf('(');
                int close = d.lastIndexOf(')');
                if (open > 0 && close > open)
                    return d.substring(open + 1, close);
            }
            return "WITHDRAWAL";
        }
        return null;
    }
}
