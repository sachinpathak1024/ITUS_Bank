package com.bankapp.service;

import com.bankapp.dto.LoanRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Loan;
import com.bankapp.repository.AccountRepository;
import com.bankapp.repository.LoanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class LoanService {

    // Annual interest rates by purpose (mock, for the play project)
    private static final Map<String, BigDecimal> RATES = Map.of(
            "PERSONAL", new BigDecimal("12.5"),
            "HOME", new BigDecimal("8.5"),
            "AUTO", new BigDecimal("9.5"),
            "EDUCATION", new BigDecimal("10.0"),
            "BUSINESS", new BigDecimal("13.0")
    );

    private static final Set<Integer> TENURES = Set.of(6, 12, 24, 36, 48, 60, 120, 180, 240);

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private NotificationService notificationService;

    public List<Loan> list(Account owner) {
        return loanRepository.findByOwnerOrderByCreatedAtDesc(owner);
    }

    public Map<String, BigDecimal> rates() {
        return RATES;
    }

    /**
     * Standard EMI = P × r × (1+r)^n / ((1+r)^n - 1)
     * Where r is the monthly rate (annual/12/100) and n is months.
     */
    public BigDecimal computeEmi(BigDecimal principal, BigDecimal annualRate, int months) {
        if (principal.compareTo(BigDecimal.ZERO) <= 0 || months <= 0) return BigDecimal.ZERO;
        double r = annualRate.doubleValue() / 12.0 / 100.0;
        double p = principal.doubleValue();
        if (r == 0.0) {
            return BigDecimal.valueOf(p / months).setScale(2, RoundingMode.HALF_UP);
        }
        double pow = Math.pow(1 + r, months);
        double emi = (p * r * pow) / (pow - 1);
        return BigDecimal.valueOf(emi).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public Loan apply(Account owner, LoanRequest request) {
        String purpose = request.getPurpose() == null ? "PERSONAL" : request.getPurpose().toUpperCase();
        BigDecimal rate = RATES.get(purpose);
        if (rate == null) throw new IllegalArgumentException("Unknown loan purpose");

        BigDecimal principal = request.getPrincipal();
        if (principal == null || principal.compareTo(new BigDecimal("1000")) < 0) {
            throw new IllegalArgumentException("Minimum loan amount is ₹1,000");
        }
        if (principal.compareTo(new BigDecimal("10000000")) > 0) {
            throw new IllegalArgumentException("Maximum loan amount is ₹1 crore");
        }
        Integer months = request.getTenureMonths();
        if (months == null || !TENURES.contains(months)) {
            throw new IllegalArgumentException("Tenure must be one of " + TENURES);
        }

        BigDecimal emi = computeEmi(principal, rate, months);
        BigDecimal total = emi.multiply(BigDecimal.valueOf(months)).setScale(2, RoundingMode.HALF_UP);

        Loan loan = new Loan();
        loan.setOwner(owner);
        loan.setPurpose(purpose);
        loan.setPrincipal(principal);
        loan.setTenureMonths(months);
        loan.setInterestRate(rate);
        loan.setEmiAmount(emi);
        loan.setTotalPayable(total);
        loan.setEmisPaid(0);
        loan.setPaidAmount(BigDecimal.ZERO);
        loan.setStatus("ACTIVE");
        Loan saved = loanRepository.save(loan);

        // Credit the principal to the user's account (auto-approved for demo)
        owner.setBalance(owner.getBalance().add(principal));
        accountRepository.save(owner);
        transactionService.recordTransaction(owner, "DEPOSIT", principal, null, null,
                "Loan disbursement: " + purpose);

        notificationService.emit(owner, "SYSTEM", "Loan approved",
                "₹" + principal + " " + purpose + " loan disbursed. EMI ₹" + emi + " × " + months + " months.");
        return saved;
    }

    @Transactional
    public Loan payEmi(Account owner, Long loanId) {
        Loan loan = loanRepository.findByIdAndOwner(loanId, owner)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found"));
        if (!"ACTIVE".equals(loan.getStatus())) {
            throw new IllegalArgumentException("Loan is not active");
        }
        if (owner.getBalance().compareTo(loan.getEmiAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient funds for this EMI");
        }
        owner.setBalance(owner.getBalance().subtract(loan.getEmiAmount()));
        accountRepository.save(owner);

        loan.setEmisPaid(loan.getEmisPaid() + 1);
        loan.setPaidAmount(loan.getPaidAmount().add(loan.getEmiAmount()));
        if (loan.getEmisPaid() >= loan.getTenureMonths()) {
            loan.setStatus("CLOSED");
        }
        loanRepository.save(loan);

        transactionService.recordTransaction(owner, "WITHDRAWAL", loan.getEmiAmount(), null, null,
                "EMI for " + loan.getPurpose() + " loan #" + loan.getId());
        notificationService.emit(owner, "SYSTEM", "EMI paid",
                "₹" + loan.getEmiAmount() + " EMI paid for " + loan.getPurpose() + " loan.");
        return loan;
    }
}
