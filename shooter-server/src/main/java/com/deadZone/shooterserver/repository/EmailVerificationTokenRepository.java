package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.EmailVerificationToken;
import com.deadZone.shooterserver.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByToken(String token);

    Optional<EmailVerificationToken> findFirstByUser_EmailAndTokenAndUsedAtIsNullOrderByExpiresAtDesc(String email, String token);

    void deleteByUserAndUsedAtIsNull(User user);
}
