package com.deadZone.shooterserver.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;

@Service
public class JwtService {
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private final ObjectMapper objectMapper;
    private final byte[] secret;

    public JwtService(ObjectMapper objectMapper, @Value("${deadzone.jwt.secret}") String secret) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String createToken(Long userId, String username) {
        long expiresAt = Instant.now().plus(30, ChronoUnit.DAYS).getEpochSecond();
        return encode(Map.of("alg", "HS256", "typ", "JWT"))
                + "." + encode(Map.of("sub", userId, "username", username, "exp", expiresAt))
                + "." + signPart(userId, username, expiresAt);
    }

    public Long requireUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw unauthorized();
        }
        String[] parts = authorizationHeader.substring(7).split("\\.");
        if (parts.length != 3) {
            throw unauthorized();
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(
                    Base64.getUrlDecoder().decode(parts[1]),
                    Map.class
            );
            Long userId = Long.valueOf(String.valueOf(payload.get("sub")));
            long expiresAt = Long.parseLong(String.valueOf(payload.get("exp")));
            String username = String.valueOf(payload.get("username"));
            String expected = signature(parts[0] + "." + parts[1]);
            if (!constantTimeEquals(parts[2], expected) || expiresAt < Instant.now().getEpochSecond()) {
                throw unauthorized();
            }
            return userId;
        } catch (RuntimeException | IOException error) {
            throw unauthorized();
        }
    }

    private String signPart(Long userId, String username, long expiresAt) {
        String header = encode(Map.of("alg", "HS256", "typ", "JWT"));
        String payload = encode(Map.of("sub", userId, "username", username, "exp", expiresAt));
        return signature(header + "." + payload);
    }

    private String encode(Object value) {
        try {
            return ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Could not create session token.", error);
        }
    }

    private String signature(String content) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return ENCODER.encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("Could not sign session token.", error);
        }
    }

    private boolean constantTimeEquals(String first, String second) {
        return java.security.MessageDigest.isEqual(
                first.getBytes(StandardCharsets.UTF_8),
                second.getBytes(StandardCharsets.UTF_8)
        );
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your session is invalid or expired.");
    }
}
