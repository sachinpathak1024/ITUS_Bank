package com.bankapp.service;

import com.bankapp.dto.IssueCardRequest;
import com.bankapp.model.Account;
import com.bankapp.model.Card;
import com.bankapp.repository.CardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Random;
import java.util.Set;

@Service
public class CardService {

    private static final Random RAND = new Random();
    private static final Set<String> TYPES = Set.of("DEBIT", "CREDIT");
    private static final Set<String> NETWORKS = Set.of("VISA", "MASTERCARD", "RUPAY");

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private NotificationService notificationService;

    public List<Card> list(Account owner) {
        List<Card> cards = cardRepository.findByOwnerOrderByIdAsc(owner);
        // Mask card number before returning
        cards.forEach(c -> c.setCardNumber(maskNumber(c.getCardNumber())));
        return cards;
    }

    public Card issue(Account owner, IssueCardRequest request) {
        String type = (request.getType() == null ? "DEBIT" : request.getType()).toUpperCase();
        if (!TYPES.contains(type))
            throw new IllegalArgumentException("Type must be DEBIT or CREDIT");

        String network = (request.getNetwork() == null ? "VISA" : request.getNetwork()).toUpperCase();
        if (!NETWORKS.contains(network))
            throw new IllegalArgumentException("Network must be VISA / MASTERCARD / RUPAY");

        BigDecimal dailyLimit = request.getDailyLimit() == null ? new BigDecimal("25000") : request.getDailyLimit();

        Card card = new Card();
        card.setOwner(owner);
        card.setType(type);
        card.setNetwork(network);
        card.setCardNumber(generateMockNumber(network));
        card.setCardHolder(owner.getFullName() == null ? owner.getUsername() : owner.getFullName().toUpperCase());
        LocalDate expiry = LocalDate.now().plusYears(5);
        card.setExpiryMonth(expiry.getMonthValue());
        card.setExpiryYear(expiry.getYear());
        card.setCvv(String.format("%03d", RAND.nextInt(1000)));
        card.setFrozen(false);
        card.setDailyLimit(dailyLimit);
        if ("CREDIT".equals(type)) {
            card.setCreditLimit(request.getCreditLimit() == null ? new BigDecimal("100000") : request.getCreditLimit());
        }
        Card saved = cardRepository.save(card);
        notificationService.emit(owner, "SYSTEM", "Card issued", type + " card ending in "
                + saved.getCardNumber().substring(saved.getCardNumber().length() - 4) + " is ready to use.");
        return saved;
    }

    public Card setFrozen(Account owner, Long id, boolean frozen) {
        Card card = cardRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setFrozen(frozen);
        Card saved = cardRepository.save(card);
        notificationService.emit(owner, "SYSTEM", frozen ? "Card frozen" : "Card unfrozen",
                "Card ending " + card.getCardNumber().substring(card.getCardNumber().length() - 4) + " is now "
                        + (frozen ? "frozen." : "active."));
        return saved;
    }

    public Card setLimit(Account owner, Long id, BigDecimal newLimit) {
        if (newLimit == null || newLimit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Daily limit must be positive");
        }
        Card card = cardRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        card.setDailyLimit(newLimit);
        return cardRepository.save(card);
    }

    public void delete(Account owner, Long id) {
        Card card = cardRepository.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));
        cardRepository.delete(card);
    }

    private String generateMockNumber(String network) {
        // Use an obviously-fake prefix so it can never be mistaken for a real card.
        String prefix = switch (network) {
            case "VISA" -> "4999";
            case "MASTERCARD" -> "5999";
            case "RUPAY" -> "6999";
            default -> "9999";
        };
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < 12; i++)
            sb.append(RAND.nextInt(10));
        return sb.toString();
    }

    private String maskNumber(String number) {
        if (number == null || number.length() < 4)
            return number;
        return "•••• •••• •••• " + number.substring(number.length() - 4);
    }
}
