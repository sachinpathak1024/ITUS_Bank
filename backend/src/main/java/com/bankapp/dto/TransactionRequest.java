package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRequest {
    private BigDecimal amount;
    private String recipientUsername;
    private String description;
    private String type; // DEPOSIT, WITHDRAW, TRANSFER
    private String pin;
}
