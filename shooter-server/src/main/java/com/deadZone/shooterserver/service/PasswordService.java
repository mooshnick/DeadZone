package com.deadZone.shooterserver.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class PasswordService {
    private static final String HASH_PREFIX = "sha256";
    private final SecureRandom secureRandom = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        return HASH_PREFIX + "$"
                + Base64.getEncoder().encodeToString(salt) + "$"
                + digest(password, salt);
    }

    public boolean matches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null || storedPassword.isBlank()) {
            return false;
        }
        String[] parts = storedPassword.split("\\$");
        if (parts.length != 3 || !HASH_PREFIX.equals(parts[0])) {
            return rawPassword.equals(storedPassword);
        }
        byte[] salt = Base64.getDecoder().decode(parts[1]);
        return MessageDigest.isEqual(
                parts[2].getBytes(StandardCharsets.UTF_8),
                digest(rawPassword, salt).getBytes(StandardCharsets.UTF_8)
        );
    }

    public boolean isHashed(String password) {
        return password != null && password.startsWith(HASH_PREFIX + "$");
    }

    private String digest(String password, byte[] salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            digest.update(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest.digest());
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is not available", error);
        }
    }
}
