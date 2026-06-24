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
}
