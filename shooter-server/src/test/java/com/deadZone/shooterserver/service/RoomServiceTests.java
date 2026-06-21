package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.game.GameSanitizer;
import com.deadZone.shooterserver.model.GameMessage;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomServiceTests {
    @Test
    void joinCreatesRoomAndSanitizesPlayerState() {
        RoomService roomService = new RoomService(new GameSanitizer());
        GameMessage message = new GameMessage();
        message.setPlayerId("player-one");
        message.setName("  Very Long Player Name  ");
        message.setTeam("red");
        message.setWeaponId("smg");
        message.setMapId("pitch");
        message.setX(10);
        message.setY(20);

        var room = roomService.join("session-one", "room-one", message);

        assertThat(room.getId()).isEqualTo("room-one");
        assertThat(roomService.playerForSession("session-one"))
                .satisfies(player -> {
                    assertThat(player.getName()).isEqualTo("Very Long Player");
                    assertThat(player.getTeam()).isEqualTo("red");
                    assertThat(player.getWeaponId()).isEqualTo("smg");
                    assertThat(player.getHealth()).isEqualTo(100);
                });
    }

    @Test
    void leaveRemovesEmptyRoom() {
        RoomService roomService = new RoomService(new GameSanitizer());
        GameMessage message = new GameMessage();
        message.setPlayerId("player-one");

        roomService.join("session-one", "room-one", message);
        roomService.leave("session-one");

        assertThat(roomService.room("room-one")).isNull();
        assertThat(roomService.playerForSession("session-one")).isNull();
    }
}
