package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledTransferRequest {
    private String recipientUsername;
    private BigDecimal amount;
    private String description;
    private String frequency; // ONCE, WEEKLY, MONTHLY
    private LocalDateTime nextRun;
}
