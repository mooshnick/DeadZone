package com.deadZone.shooterserver.game;

import org.springframework.stereotype.Component;

@Component
public class GameSanitizer {
    public String roomId(String roomId) {
        if (roomId == null || roomId.isBlank()) {
            return GameConstants.DEFAULT_ROOM_ID;
        }
        return roomId.trim().toUpperCase();
    }

    public String playerName(String name) {
        if (name == null || name.isBlank()) {
            return GameConstants.DEFAULT_PLAYER_NAME;
        }
        String trimmed = name.trim();
        return trimmed.substring(0, Math.min(16, trimmed.length()));
    }

    public String team(String team) {
        return "red".equals(team) ? "red" : "blue";
    }

    public String weaponId(String weaponId) {
        if (weaponId == null || weaponId.isBlank()) {
            return GameConstants.DEFAULT_WEAPON_ID;
        }
        return weaponId.trim();
    }

    public String mapId(String mapId) {
        if (mapId == null || mapId.isBlank()) {
            return GameConstants.DEFAULT_MAP_ID;
        }
        return mapId.trim();
    }
}
