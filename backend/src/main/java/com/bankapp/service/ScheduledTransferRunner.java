package com.bankapp.service;

import com.bankapp.model.ScheduledTransfer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ScheduledTransferRunner {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTransferRunner.class);

    @Autowired
    private ScheduledTransferService scheduledTransferService;

    /**
     * Every minute, fire any scheduled transfers whose next-run time has passed.
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void run() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledTransfer> due = scheduledTransferService.findActiveAndDue(now);
        if (due.isEmpty())
            return;
        log.info("Scheduled-transfer cron firing for {} item(s)", due.size());
        for (ScheduledTransfer st : due) {
            try {
                scheduledTransferService.executeDue(st);
            } catch (Exception e) {
                log.warn("Scheduled transfer #{} failed: {}", st.getId(), e.getMessage());
            }
        }
    }
}
