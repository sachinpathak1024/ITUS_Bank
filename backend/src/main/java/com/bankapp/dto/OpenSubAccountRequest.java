package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OpenSubAccountRequest {
    private String name;
    private String type;
    private BigDecimal initialDeposit;
    private String pin;
}
