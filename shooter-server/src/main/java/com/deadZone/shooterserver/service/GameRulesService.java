package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.deadZone.shooterserver.model.Player;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
public class GameRulesService {
    public void move(Player player, GameMessage message) {
        player.setWeaponId(message.getWeaponId() == null || message.getWeaponId().isBlank() ? player.getWeaponId() : message.getWeaponId());
        player.setWeaponSkinId(message.getWeaponSkinId() == null || message.getWeaponSkinId().isBlank() ? player.getWeaponSkinId() : message.getWeaponSkinId());
        player.setOutfitId(message.getOutfitId() == null || message.getOutfitId().isBlank() ? player.getOutfitId() : message.getOutfitId());
        player.setAccessoryIds(message.getAccessoryIds() == null ? player.getAccessoryIds() : message.getAccessoryIds());
        player.setX(message.getX());
        player.setY(message.getY());
        player.setZ(message.getZ());
        player.setYaw(message.getYaw());
        player.setPitch(message.getPitch());
        player.setFacing(message.getFacing() == 0 ? player.getFacing() : message.getFacing());
        player.setHealth(message.getHealth() <= 0 && !message.isDead() ? player.getHealth() : Math.max(0, message.getHealth()));
        player.setDead(message.isDead());
        player.setKills(Math.max(player.getKills(), message.getKills()));
        player.setAssists(Math.max(player.getAssists(), message.getAssists()));
        player.setDeaths(Math.max(player.getDeaths(), message.getDeaths()));
        player.setScore(Math.max(player.getScore(), message.getScore()));
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
            shooter.setScore(shooter.getScore() + 100);
            target.setDeaths(target.getDeaths() + 1);
            target.setDead(true);
        }
    }

    private Player findByPlayerId(Collection<Player> players, String playerId) {
        return players.stream()
                .filter(player -> player.getId().equals(playerId))
                .findFirst()
                .orElse(null);
    }
}
