package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.model.EmailVerificationToken;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.EmailVerificationTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class EmailVerificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String mailFrom;
    private final String mailHost;
    private final String mailPort;
    private final String mailUsername;
    private final String mailPassword;
    private final String resendApiKey;
    private final boolean consoleFallback;

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            ObjectProvider<JavaMailSender> mailSender,
            ObjectMapper objectMapper,
            @Value("${deadzone.email.from:noreply@deadzone.local}") String mailFrom,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${spring.mail.port:587}") String mailPort,
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${spring.mail.password:}") String mailPassword,
            @Value("${deadzone.email.resend-api-key:}") String resendApiKey,
            @Value("${deadzone.email.console-fallback:false}") boolean consoleFallback
    ) {
        this.tokenRepository = tokenRepository;
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.mailFrom = mailFrom;
        this.mailHost = mailHost;
        this.mailPort = mailPort;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword == null ? "" : mailPassword.replaceAll("\\s+", "");
        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.consoleFallback = consoleFallback;
    }

    @Transactional
    public boolean sendVerification(User user) {
        if (user.isEmailVerified()) {
            return false;
        }
        tokenRepository.deleteByUserAndUsedAtIsNull(user);
        String code = verificationCode();
        EmailVerificationToken token = tokenRepository.save(new EmailVerificationToken(
                code,
                user,
                Instant.now().plus(15, ChronoUnit.MINUTES)
        ));
        String subject = "DeadZone verification code: " + token.getToken();
        String text = """
                DeadZone email verification

                %s

                Enter this 6-digit code in the DeadZone verification screen.
                The code expires in 15 minutes.
                """.formatted(token.getToken());
        if (!resendApiKey.isBlank()) {
            return sendWithResend(user.getEmail(), subject, text);
        }

        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || mailHost == null || mailHost.isBlank() || mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            if (consoleFallback) {
                log.warn("Email verification code for {}: {}", user.getEmail(), token.getToken());
                return false;
            }
            String detail = "SMTP configuration is incomplete. host=%s port=%s usernameConfigured=%s passwordConfigured=%s from=%s"
                    .formatted(display(mailHost), display(mailPort), isConfigured(mailUsername), isConfigured(mailPassword), display(mailFrom));
            log.error("Failed to send email verification code to {}. {}", user.getEmail(), detail);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Could not send verification email. " + detail);
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
            return true;
        } catch (MailException error) {
            String detail = rootMessage(error);
            log.error("Failed to send email verification code to {} via SMTP. host={} port={} usernameConfigured={} from={} error={}",
                    user.getEmail(), display(mailHost), display(mailPort), isConfigured(mailUsername), display(mailFrom), detail, error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not send verification email. SMTP error: " + detail
                            + " [host=" + display(mailHost)
                            + ", port=" + display(mailPort)
                            + ", usernameConfigured=" + isConfigured(mailUsername)
                            + ", from=" + display(mailFrom)
                            + "]");
        }
    }

    private boolean sendWithResend(String to, String subject, String text) {
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "from", mailFrom,
                    "to", List.of(to),
                    "subject", subject,
                    "text", text
            ));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return true;
            }
            String detail = "status=" + response.statusCode() + " body=" + response.body();
            log.error("Failed to send email verification code to {} via Resend. from={} {}", to, display(mailFrom), detail);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not send verification email. Resend API error: " + detail + " [from=" + display(mailFrom) + "]");
        } catch (ResponseStatusException error) {
            throw error;
        } catch (Exception error) {
            String detail = rootMessage(error);
            log.error("Failed to send email verification code to {} via Resend. from={} error={}", to, display(mailFrom), detail, error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not send verification email. Resend API error: " + detail + " [from=" + display(mailFrom) + "]");
        }
    }

    private String rootMessage(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        String message = root.getMessage();
        if (message == null || message.isBlank()) {
            message = error.getMessage();
        }
        return message == null || message.isBlank() ? root.getClass().getSimpleName() : message;
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private String display(String value) {
        return value == null || value.isBlank() ? "<blank>" : value;
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
