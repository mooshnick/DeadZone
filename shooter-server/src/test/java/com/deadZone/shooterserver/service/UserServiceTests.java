package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.AuthRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class UserServiceTests {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void clearUsers() {
        userRepository.deleteAll();
    }

    @Test
    void registerHashesPasswordAndReturnsPublicUser() {
        var response = userService.register(new AuthRequest("player-one", "secret"));
        User storedUser = userRepository.findByUsername("player-one").orElseThrow();

        assertThat(response.username()).isEqualTo("player-one");
        assertThat(storedUser.getPassword()).isNotEqualTo("secret");
    }

    @Test
    void updateProgressPersistsUnlocksAndStats() {
        var user = userService.register(new AuthRequest("player-two", "secret"));

        var response = userService.updateProgress(user.id(), new ProgressRequest(
                120,
                300,
                4,
                2,
                1,
                "shadow",
                "ember",
                List.of("classic", "shadow"),
                List.of("standard", "ember"),
                Map.of("rifle", 2)
        ));

        assertThat(response.wallet()).isEqualTo(120);
        assertThat(response.xp()).isEqualTo(300);
        assertThat(response.ownedOutfits()).containsExactly("classic", "shadow");
        assertThat(response.weaponUpgrades()).containsEntry("rifle", 2);
    }
}
