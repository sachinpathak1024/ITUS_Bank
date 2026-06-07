package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueCardRequest {
    private String type; // DEBIT or CREDIT
    private String network; // VISA / MASTERCARD / RUPAY
    private BigDecimal dailyLimit;
    private BigDecimal creditLimit; // only for CREDIT
}
