package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.model.EmailVerificationToken;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.EmailVerificationTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class EmailVerificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String mailFrom;
    private final String mailHost;
    private final String mailPassword;

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${deadzone.email.from:noreply@deadzone.local}") String mailFrom,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${spring.mail.password:}") String mailPassword
    ) {
        this.tokenRepository = tokenRepository;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.mailHost = mailHost;
        this.mailPassword = mailPassword;
    }

    @Transactional
    public void sendVerification(User user) {
        if (user.isEmailVerified()) {
            return;
        }
        tokenRepository.deleteByUserAndUsedAtIsNull(user);
        String code = verificationCode();
        EmailVerificationToken token = tokenRepository.save(new EmailVerificationToken(
                code,
                user,
                Instant.now().plus(15, ChronoUnit.MINUTES)
        ));
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || mailHost == null || mailHost.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("Email verification code for {}: {}", user.getEmail(), token.getToken());
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("DeadZone verification code: " + token.getToken());
        message.setText("""
                DeadZone email verification

                %s

                Enter this 6-digit code in the DeadZone verification screen.
                The code expires in 15 minutes.
                """.formatted(token.getToken()));
        try {
            sender.send(message);
        } catch (MailException error) {
            log.error("Failed to send email verification code to {}", user.getEmail(), error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Could not send verification email. Please check SMTP settings.");
        }
    }

    @Transactional
    public User verify(String email, String code) {
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and verification code are required.");
        }
        String normalizedCode = code.replaceAll("\\D", "");
        EmailVerificationToken token = tokenRepository.findFirstByUser_EmailAndTokenAndUsedAtIsNullOrderByExpiresAtDesc(
                        email.trim().toLowerCase(),
                        normalizedCode
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is invalid."));
        if (!token.isUsable(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code expired. Please log in to request a new code.");
        }
        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        return token.getUser();
    }

    private String verificationCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
