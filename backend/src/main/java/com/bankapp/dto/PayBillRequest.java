package com.bankapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayBillRequest {
    private String category;
    private String billerName;
    private String billNumber;
    private BigDecimal amount;
    private String pin;
}
