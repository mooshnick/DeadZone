package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.CreateRoomRequest;
import com.deadZone.shooterserver.repository.LobbyRoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LobbyRoomServiceTests {
    @Autowired
    private LobbyRoomRepository repository;

    @Autowired
    private LobbyRoomService service;

    @BeforeEach
    void clearRooms() {
        repository.deleteAll();
    }

    @Test
    void createPreservesRequestedGameMode() {
        var room = service.create(new CreateRoomRequest(
                "Objective Room",
                "foundry",
                "capture-flag",
                6,
                true,
                9,
                15
        ));

        assertThat(room.gameMode()).isEqualTo("capture-flag");
        assertThat(room.scoreLimit()).isEqualTo(9);
        assertThat(room.timeLimitMinutes()).isEqualTo(15);
    }

    @Test
    void createAllowsUpToTenPlayersAndClampsHigherValues() {
        var tenPlayerRoom = service.create(new CreateRoomRequest(
                "Ten Player Room",
                "foundry",
                "team-deathmatch",
                10,
                true,
                30,
                20
        ));
        var clampedRoom = service.create(new CreateRoomRequest(
                "Oversized Room",
                "foundry",
                "team-deathmatch",
                15,
                true,
                30,
                20
        ));

        assertThat(tenPlayerRoom.maxPlayers()).isEqualTo(10);
        assertThat(clampedRoom.maxPlayers()).isEqualTo(10);
    }

    @Test
    void zombieSurvivalRoomsAreLockedToZombieMapAndFourPlayers() {
        var room = service.create(new CreateRoomRequest(
                "Night Squad",
                "foundry",
                "zombie-survival",
                10,
                false,
                20,
                20
        ));

        assertThat(room.gameMode()).isEqualTo("zombie-survival");
        assertThat(room.mapId()).isEqualTo("zombie-outpost");
        assertThat(room.maxPlayers()).isEqualTo(4);
        assertThat(room.allowBots()).isTrue();
        assertThat(room.scoreLimit()).isEqualTo(20);
    }

    @Test
    void zombieSurvivalDefaultsToFiveMinuteTimer() {
        var room = service.create(new CreateRoomRequest(
                "Night Squad",
                "foundry",
                "zombie-survival",
                10,
                false,
                10,
                null
        ));

        assertThat(room.timeLimitMinutes()).isEqualTo(5);
    }

    @Test
    void e2eCreatesAndJoinsAllCoreGameModes() {
        String[] modes = {"team-deathmatch", "free-for-all", "capture-flag", "zombie-survival"};

        for (String mode : modes) {
            var room = service.create(new CreateRoomRequest(
                    "E2E " + mode,
                    "foundry",
                    mode,
                    6,
                    true,
                    null,
                    null
            ));
            var joined = service.join(room.id());

            assertThat(joined.gameMode()).isEqualTo(mode);
            assertThat(joined.players()).isEqualTo(1);
            if ("zombie-survival".equals(mode)) {
                assertThat(joined.mapId()).isEqualTo("zombie-outpost");
                assertThat(joined.maxPlayers()).isEqualTo(4);
            }
        }
    }
}
