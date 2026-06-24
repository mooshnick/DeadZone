package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.RegisterRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.EmailVerificationTokenRepository;
import com.deadZone.shooterserver.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class UserServiceTests {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @BeforeEach
    void clearUsers() {
        emailVerificationTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registerHashesPasswordAndReturnsPublicUser() {
        var response = userService.register(new RegisterRequest("player-one", "one@example.com", "secret"));
        User storedUser = userRepository.findByUsername("player-one").orElseThrow();

        assertThat(response.user().username()).isEqualTo("player-one");
        assertThat(response.user().email()).isEqualTo("one@example.com");
        assertThat(response.user().emailVerified()).isFalse();
        assertThat(response.token()).isNull();
        assertThat(storedUser.getPassword()).isNotEqualTo("secret");
        assertThat(emailVerificationTokenRepository.count()).isEqualTo(1);
    }

    @Test
    void updateProgressPersistsUnlocksAndStats() {
        var auth = userService.register(new RegisterRequest("player-two", "shared@example.com", "secret"));
        User fundedUser = userRepository.findById(auth.user().id()).orElseThrow();
        fundedUser.setWallet(2_000);
        userRepository.save(fundedUser);

        var response = userService.updateProgress(auth.user().id(), new ProgressRequest(
                1_161,
                300,
                4,
                2,
                1,
                "shadow",
                "shotgun",
                "ember",
                "signal",
                List.of("classic", "shadow"),
                List.of("standard", "ember"),
                List.of("standard", "signal"),
                List.of("cap-red", "shades"),
                List.of("cap-red"),
                Map.of("rifle", 2),
                "{\"claimed\":[\"first-bloods\"]}"
        ));

        assertThat(response.wallet()).isEqualTo(1_161);
        assertThat(response.xp()).isEqualTo(300);
        assertThat(response.weaponId()).isEqualTo("shotgun");
        assertThat(response.ownedOutfits()).containsExactly("classic", "shadow");
        assertThat(response.ownedAccessories()).containsExactly("cap-red", "shades");
        assertThat(response.accessoryIds()).containsExactly("cap-red");
        assertThat(response.weaponUpgrades()).containsEntry("rifle", 2);
        assertThat(response.missionStats()).contains("first-bloods");
    }

    @Test
    void duplicateEmailsAreAllowed() {
        userService.register(new RegisterRequest("first-player", "shared@example.com", "a"));
        userService.register(new RegisterRequest("second-player", "shared@example.com", "b"));

        assertThat(userRepository.findByUsername("first-player")).isPresent();
        assertThat(userRepository.findByUsername("second-player")).isPresent();
    }

    @Test
    void purchaseCannotAddItemsWithoutPayingServerPrice() {
        var auth = userService.register(new RegisterRequest("shop-cheat", "shop@example.com", "secret"));
        User fundedUser = userRepository.findById(auth.user().id()).orElseThrow();
        fundedUser.setWallet(500);
        userRepository.save(fundedUser);

        ProgressRequest request = new ProgressRequest(
                500,
                0,
                0,
                0,
                0,
                "shadow",
                "rifle",
                "standard",
                "standard",
                List.of("classic", "shadow"),
                List.of("standard"),
                List.of("standard"),
                List.of(),
                List.of(),
                Map.of(),
                ""
        );

        assertThatThrownBy(() -> userService.updateProgress(auth.user().id(), request))
                .hasMessageContaining("Purchase total does not match");
    }
}
