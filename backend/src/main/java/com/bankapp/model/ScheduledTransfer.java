package com.bankapp.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "scheduled_transfers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private Account owner;

    @Column(name = "recipient_username", nullable = false, length = 100)
    private String recipientUsername;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(length = 200)
    private String description;

    @Column(nullable = false, length = 20)
    private String frequency; // ONCE, WEEKLY, MONTHLY

    @Column(name = "next_run", nullable = false)
    private LocalDateTime nextRun;

    @Column(name = "last_run")
    private LocalDateTime lastRun;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
