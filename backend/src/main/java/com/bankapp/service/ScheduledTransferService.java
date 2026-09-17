package com.bankapp.service;

import com.bankapp.dto.ScheduledTransferRequest;
import com.bankapp.model.Account;
import com.bankapp.model.ScheduledTransfer;
import com.bankapp.repository.ScheduledTransferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class ScheduledTransferService {

    private static final Set<String> FREQUENCIES = Set.of("ONCE", "WEEKLY", "MONTHLY");

    @Autowired
    private ScheduledTransferRepository scheduledTransferRepository;

    @Autowired
    private AccountService accountService;

    public List<ScheduledTransfer> list(Account owner) {
        return scheduledTransferRepository.findByOwnerOrderByNextRunAsc(owner);
    }

    public ScheduledTransfer create(Account owner, ScheduledTransferRequest request) {
        if (request.getRecipientUsername() == null || request.getRecipientUsername().isBlank()) {
            throw new IllegalArgumentException("Recipient is required");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        String freq = request.getFrequency() == null ? "ONCE" : request.getFrequency().toUpperCase();
        if (!FREQUENCIES.contains(freq)) {
            throw new IllegalArgumentException("Frequency must be ONCE, WEEKLY, or MONTHLY");
        }
        // Validate the recipient exists
        accountService.getAccountByUsername(request.getRecipientUsername());
        if (request.getRecipientUsername().equals(owner.getUsername())) {
            throw new IllegalArgumentException("Cannot schedule transfer to yourself");
        }

        ScheduledTransfer st = new ScheduledTransfer();
        st.setOwner(owner);
        st.setRecipientUsername(request.getRecipientUsername());
        st.setAmount(request.getAmount());
        st.setDescription(request.getDescription());
        st.setFrequency(freq);
        st.setNextRun(request.getNextRun() != null ? request.getNextRun() : LocalDateTime.now().plusDays(1));
        st.setActive(true);
        return scheduledTransferRepository.save(st);
    }

    public void cancel(Account owner, Long id) {
        ScheduledTransfer st = scheduledTransferRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Scheduled transfer not found"));
        scheduledTransferRepository.delete(st);
    }

    public ScheduledTransfer runNow(Account owner, Long id) {
        ScheduledTransfer st = scheduledTransferRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Scheduled transfer not found"));
        executeOnce(st);
        return scheduledTransferRepository.save(st);
    }

    /**
     * Used by the cron job. Throws if execution fails; caller decides whether to
     * deactivate.
     */
    public ScheduledTransfer executeDue(ScheduledTransfer st) {
        executeOnce(st);
        return scheduledTransferRepository.save(st);
    }

    private void executeOnce(ScheduledTransfer st) {
        accountService.transferUnchecked(st.getOwner(), st.getRecipientUsername(), st.getAmount(),
                st.getDescription() == null ? "Scheduled transfer" : st.getDescription());

        LocalDateTime now = LocalDateTime.now();
        st.setLastRun(now);
        if ("ONCE".equals(st.getFrequency())) {
            st.setActive(false);
            st.setNextRun(now);
        } else if ("WEEKLY".equals(st.getFrequency())) {
            st.setNextRun(st.getNextRun().isBefore(now) ? now.plusWeeks(1) : st.getNextRun().plusWeeks(1));
        } else if ("MONTHLY".equals(st.getFrequency())) {
            st.setNextRun(st.getNextRun().isBefore(now) ? now.plusMonths(1) : st.getNextRun().plusMonths(1));
        }
    }

    public List<ScheduledTransfer> findActiveAndDue(LocalDateTime now) {
        return scheduledTransferRepository.findAll().stream().filter(s -> Boolean.TRUE.equals(s.getActive()))
                .filter(s -> s.getNextRun() != null && !s.getNextRun().isAfter(now)).toList();
    }
}
