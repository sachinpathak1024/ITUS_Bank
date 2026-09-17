package com.bankapp.service;

import com.bankapp.dto.FDRequest;
import com.bankapp.model.Account;
import com.bankapp.model.FixedDeposit;
import com.bankapp.repository.AccountRepository;
import com.bankapp.repository.FixedDepositRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class FixedDepositService {

    // Hardcoded rates by tenure (annual %)
    private static final Map<Integer, BigDecimal> RATES = Map.of(3, new BigDecimal("5.5"), 6, new BigDecimal("6.0"), 12,
            new BigDecimal("6.8"), 24, new BigDecimal("7.2"), 36, new BigDecimal("7.5"), 60, new BigDecimal("7.0"));

    @Autowired
    private FixedDepositRepository fdRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PinService pinService;

    public List<FixedDeposit> list(Account owner) {
        return fdRepository.findByOwnerOrderByStartAtDesc(owner);
    }

    public Map<Integer, BigDecimal> rates() {
        return RATES;
    }

    @Transactional
    public FixedDeposit open(Account owner, FDRequest request) {
        pinService.enforce(owner, request.getPin());
        if (request.getPrincipal() == null || request.getPrincipal().compareTo(new BigDecimal("1000")) < 0) {
            throw new IllegalArgumentException("Minimum FD amount is ₹1,000");
        }
        BigDecimal rate = RATES.get(request.getTenureMonths());
        if (rate == null) {
            throw new IllegalArgumentException("Tenure must be one of " + RATES.keySet() + " months");
        }
        if (owner.getBalance().compareTo(request.getPrincipal()) < 0) {
            throw new IllegalArgumentException("Insufficient funds");
        }

        // Simple compound interest, monthly compounding for demo realism.
        BigDecimal months = BigDecimal.valueOf(request.getTenureMonths());
        double monthlyRate = rate.doubleValue() / 12.0 / 100.0;
        double maturity = request.getPrincipal().doubleValue() * Math.pow(1 + monthlyRate, request.getTenureMonths());
        BigDecimal maturityAmount = BigDecimal.valueOf(maturity).setScale(2, RoundingMode.HALF_UP);

        owner.setBalance(owner.getBalance().subtract(request.getPrincipal()));
        accountRepository.save(owner);

        FixedDeposit fd = new FixedDeposit();
        fd.setOwner(owner);
        fd.setPrincipal(request.getPrincipal());
        fd.setTenureMonths(request.getTenureMonths());
        fd.setInterestRate(rate);
        fd.setMaturityAmount(maturityAmount);
        fd.setMaturityAt(LocalDateTime.now().plusMonths(request.getTenureMonths()));
        fd.setStatus("ACTIVE");
        FixedDeposit saved = fdRepository.save(fd);

        transactionService.recordTransaction(owner, "WITHDRAWAL", request.getPrincipal(), null, null,
                "Opened FD #" + saved.getId() + " (" + request.getTenureMonths() + " months @ " + rate + "%)");
        notificationService.emit(owner, "SYSTEM", "FD opened", "₹" + request.getPrincipal() + " FD locked for "
                + request.getTenureMonths() + " months @ " + rate + "%.");
        return saved;
    }

    @Transactional
    public FixedDeposit mature(Account owner, Long id) {
        FixedDeposit fd = fdRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("FD not found"));
        if (!"ACTIVE".equals(fd.getStatus())) {
            throw new IllegalArgumentException("FD is not active");
        }
        // For demo we allow maturing at any time, treating it as if matured naturally:
        // pay out full maturity amount.
        owner.setBalance(owner.getBalance().add(fd.getMaturityAmount()));
        accountRepository.save(owner);
        fd.setStatus("MATURED");
        fd.setClosedAt(LocalDateTime.now());
        fdRepository.save(fd);

        transactionService.recordTransaction(owner, "DEPOSIT", fd.getMaturityAmount(), null, null,
                "FD #" + fd.getId() + " matured (" + fd.getTenureMonths() + " months @ " + fd.getInterestRate() + "%)");
        notificationService.emit(owner, "SYSTEM", "FD matured",
                "₹" + fd.getMaturityAmount() + " credited from FD #" + fd.getId() + ".");
        return fd;
    }

    @Transactional
    public FixedDeposit breakFd(Account owner, Long id) {
        FixedDeposit fd = fdRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("FD not found"));
        if (!"ACTIVE".equals(fd.getStatus())) {
            throw new IllegalArgumentException("FD is not active");
        }
        // 1% penalty on principal for demo
        BigDecimal penalty = fd.getPrincipal().multiply(new BigDecimal("0.01")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payout = fd.getPrincipal().subtract(penalty);

        owner.setBalance(owner.getBalance().add(payout));
        accountRepository.save(owner);
        fd.setStatus("BROKEN");
        fd.setClosedAt(LocalDateTime.now());
        fdRepository.save(fd);

        transactionService.recordTransaction(owner, "DEPOSIT", payout, null, null,
                "FD #" + fd.getId() + " broken (penalty ₹" + penalty + " applied)");
        notificationService.emit(owner, "SYSTEM", "FD broken",
                "₹" + payout + " credited; penalty ₹" + penalty + " applied.");
        return fd;
    }
}
