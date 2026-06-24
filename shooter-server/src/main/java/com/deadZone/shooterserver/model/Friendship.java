package com.deadZone.shooterserver.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(
        name = "friendships",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_friendship_users",
                columnNames = {"first_user_id", "second_user_id"}
        )
)
public class Friendship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_user_id", nullable = false)
    private Long firstUserId;

    @Column(name = "second_user_id", nullable = false)
    private Long secondUserId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Friendship() {}

    public Friendship(Long userId, Long friendId) {
        this.firstUserId = Math.min(userId, friendId);
        this.secondUserId = Math.max(userId, friendId);
    }

    public Long getId() { return id; }
    public Long getFirstUserId() { return firstUserId; }
    public Long getSecondUserId() { return secondUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
