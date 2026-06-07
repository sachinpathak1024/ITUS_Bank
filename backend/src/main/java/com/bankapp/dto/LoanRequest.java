package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanRequest {
    private String purpose; // PERSONAL, HOME, AUTO, EDUCATION, BUSINESS
    private BigDecimal principal;
    private Integer tenureMonths;
}
