package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.deadZone.shooterserver.model.Player;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
public class GameRulesService {
    public void move(Player player, GameMessage message) {
        player.setX(message.getX());
        player.setY(message.getY());
        player.setFacing(message.getFacing() == 0 ? player.getFacing() : message.getFacing());
        player.setHealth(message.getHealth() <= 0 ? player.getHealth() : message.getHealth());
    }

    public void applyHit(GameRoom room, GameMessage message) {
        if (room == null) {
            return;
        }

        Player target = findByPlayerId(room.players(), message.getPlayerId());
        Player shooter = findByPlayerId(room.players(), message.getShooterId());
        if (target == null || shooter == null || target.getTeam().equals(shooter.getTeam())) {
            return;
        }

        int damage = message.getDamage() <= 0 ? 25 : message.getDamage();
        target.setHealth(Math.max(0, target.getHealth() - damage));
        if (target.getHealth() == 0) {
            shooter.setKills(shooter.getKills() + 1);
            target.setDeaths(target.getDeaths() + 1);
            target.setHealth(100);
            respawn(target);
        }
    }

    private Player findByPlayerId(Collection<Player> players, String playerId) {
        return players.stream()
                .filter(player -> player.getId().equals(playerId))
                .findFirst()
                .orElse(null);
    }

    private void respawn(Player player) {
        if ("red".equals(player.getTeam())) {
            player.setX(985);
            player.setY(420);
            player.setFacing(-1);
            return;
        }
        player.setX(175);
        player.setY(420);
        player.setFacing(1);
    }
}
