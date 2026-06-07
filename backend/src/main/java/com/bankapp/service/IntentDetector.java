package com.bankapp.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Very lightweight keyword/regex-based intent detector. We use this instead of LLM
 * tool-calling because tinyllama / llama3.2:1b are not reliable function-callers.
 *
 * Returns a structured "suggestedAction" the frontend can render as a confirm card.
 */
public class IntentDetector {

    private static final Pattern AMOUNT = Pattern.compile(
            "(?:rs\\.?|₹|inr)?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(k|thousand|lakh|cr|crore)?",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern TRANSFER = Pattern.compile(
            "(?:transfer|send|pay|give|wire)\\s+(?:rs\\.?|₹|inr)?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:k|thousand|lakh|cr|crore)?)\\s+to\\s+([a-z0-9_.\\-]+)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern DEPOSIT = Pattern.compile(
            "(?:deposit|add|put)\\s+(?:rs\\.?|₹|inr)?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:k|thousand|lakh|cr|crore)?)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern WITHDRAW = Pattern.compile(
            "(?:withdraw|take out|cash out)\\s+(?:rs\\.?|₹|inr)?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:k|thousand|lakh|cr|crore)?)",
            Pattern.CASE_INSENSITIVE);

    public static Map<String, Object> detect(String message) {
        if (message == null) return null;
        String m = message.trim();

        Matcher mt = TRANSFER.matcher(m);
        if (mt.find()) {
            BigDecimal amt = parseAmount(mt.group(1));
            if (amt != null) {
                return action("TRANSFER", Map.of(
                        "amount", amt,
                        "recipientUsername", mt.group(2)
                ), "Send ₹" + amt + " to @" + mt.group(2) + "?");
            }
        }
        Matcher md = DEPOSIT.matcher(m);
        if (md.find()) {
            BigDecimal amt = parseAmount(md.group(1));
            if (amt != null) {
                return action("DEPOSIT", Map.of("amount", amt),
                        "Deposit ₹" + amt + " into your account?");
            }
        }
        Matcher mw = WITHDRAW.matcher(m);
        if (mw.find()) {
            BigDecimal amt = parseAmount(mw.group(1));
            if (amt != null) {
                return action("WITHDRAW", Map.of("amount", amt),
                        "Withdraw ₹" + amt + " from your account?");
            }
        }
        return null;
    }

    private static Map<String, Object> action(String type, Map<String, Object> params, String prompt) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", type);
        map.put("params", params);
        map.put("prompt", prompt);
        return map;
    }

    private static BigDecimal parseAmount(String s) {
        if (s == null) return null;
        Matcher m = AMOUNT.matcher(s.trim());
        if (!m.find()) return null;
        try {
            BigDecimal value = new BigDecimal(m.group(1));
            String unit = m.group(2);
            if (unit != null) {
                unit = unit.toLowerCase();
                if (unit.equals("k") || unit.equals("thousand")) value = value.multiply(BigDecimal.valueOf(1000));
                else if (unit.equals("lakh")) value = value.multiply(BigDecimal.valueOf(100000));
                else if (unit.equals("cr") || unit.equals("crore")) value = value.multiply(BigDecimal.valueOf(10000000));
            }
            return value;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
