package com.bankapp.service;

import java.util.List;
import java.util.Map;

public class BillerCatalog {

    public static final Map<String, List<String>> CATALOG = Map.of(
            "Electricity", List.of("Tata Power", "Adani Electricity", "BSES Rajdhani", "MSEB", "Reliance Energy"),
            "Internet", List.of("Jio Fiber", "Airtel Xstream", "ACT Fibernet", "BSNL Broadband", "Hathway"),
            "Mobile", List.of("Jio Recharge", "Airtel Prepaid", "Vi Recharge", "BSNL Prepaid"),
            "Water", List.of("BWSSB", "Delhi Jal Board", "MCGM Water", "Chennai Metro Water"),
            "Gas", List.of("Indane Gas", "HP Gas", "Bharat Gas", "MGL Piped Gas"),
            "DTH", List.of("Tata Sky", "Airtel Digital TV", "Dish TV", "Sun Direct", "d2h"),
            "CreditCard", List.of("HDFC Credit Card", "SBI Card", "ICICI Card", "Axis Card", "Amex India")
    );

    public static boolean isValid(String category, String biller) {
        List<String> options = CATALOG.get(category);
        return options != null && options.contains(biller);
    }
}
