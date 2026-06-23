package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.CreateRoomRequest;
import com.deadZone.shooterserver.model.LobbyRoom;
import com.deadZone.shooterserver.repository.LobbyRoomRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LobbyRoomServiceTests {
    @Test
    void createPreservesRequestedGameMode() {
        LobbyRoomRepository repository = mock(LobbyRoomRepository.class);
        when(repository.existsById(any())).thenReturn(false);
        when(repository.save(any(LobbyRoom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        LobbyRoomService service = new LobbyRoomService(repository);

        var room = service.create(new CreateRoomRequest(
                "Objective Room",
                "foundry",
                "capture-flag",
                6,
                true
        ));

        assertThat(room.gameMode()).isEqualTo("capture-flag");
    }
}
