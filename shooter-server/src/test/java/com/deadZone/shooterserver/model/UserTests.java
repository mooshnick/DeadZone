package com.deadZone.shooterserver.model;

import com.deadZone.shooterserver.service.PasswordService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserTests {

    @Test
    void passwordServiceHashesAndMatchesPassword() {
        PasswordService passwordService = new PasswordService();
        String storedPassword = passwordService.hash("secret");

        assertThat(storedPassword).isNotEqualTo("secret");
        assertThat(passwordService.matches("secret", storedPassword)).isTrue();
        assertThat(passwordService.matches("wrong", storedPassword)).isFalse();
    }
}
