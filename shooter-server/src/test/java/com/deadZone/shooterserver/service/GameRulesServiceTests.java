package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.deadZone.shooterserver.model.Player;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GameRulesServiceTests {
    @Test
    void moveUpdatesPositionFacingAndHealth() {
        GameRulesService gameRulesService = new GameRulesService();
        Player player = new Player("player-one", "Player", "blue", "rifle", 0, 0, 1);
        GameMessage message = new GameMessage();
        message.setX(25);
        message.setY(45);
        message.setFacing(-1);
        message.setHealth(80);

        gameRulesService.move(player, message);

        assertThat(player.getX()).isEqualTo(25);
        assertThat(player.getY()).isEqualTo(45);
        assertThat(player.getFacing()).isEqualTo(-1);
        assertThat(player.getHealth()).isEqualTo(80);
    }

    @Test
    void hitIgnoresFriendlyFireAndScoresEliminations() {
        GameRulesService gameRulesService = new GameRulesService();
        GameRoom room = new GameRoom("room-one", "foundry");
        Player shooter = new Player("blue-one", "Blue", "blue", "rifle", 0, 0, 1);
        Player target = new Player("red-one", "Red", "red", "rifle", 0, 0, -1);
        room.putPlayer("blue-session", shooter);
        room.putPlayer("red-session", target);
        GameMessage message = new GameMessage();
        message.setShooterId("blue-one");
        message.setPlayerId("red-one");
        message.setDamage(100);

        gameRulesService.applyHit(room, message);

        assertThat(shooter.getKills()).isEqualTo(1);
        assertThat(target.getDeaths()).isEqualTo(1);
        assertThat(target.getHealth()).isEqualTo(100);
        assertThat(target.getX()).isEqualTo(985);
    }
}
