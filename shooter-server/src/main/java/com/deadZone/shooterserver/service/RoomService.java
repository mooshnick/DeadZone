package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.game.GameConstants;
import com.deadZone.shooterserver.game.GameSanitizer;
import com.deadZone.shooterserver.model.GameMessage;
import com.deadZone.shooterserver.model.GameRoom;
import com.deadZone.shooterserver.model.Player;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionRooms = new ConcurrentHashMap<>();
    private final GameSanitizer sanitizer;

    public RoomService(GameSanitizer sanitizer) {
        this.sanitizer = sanitizer;
    }

    public String normalizeRoomId(String roomId) {
        return sanitizer.roomId(roomId);
    }

    public boolean canJoin(String sessionId, String roomId) {
        GameRoom room = rooms.get(roomId);
        return room == null
                || room.getPlayer(sessionId) != null
                || !room.isFull(GameConstants.MAX_PLAYERS_PER_ROOM);
    }

    public GameRoom join(String sessionId, String roomId, GameMessage message) {
        GameRoom room = rooms.computeIfAbsent(roomId, key -> new GameRoom(roomId, sanitizer.mapId(message.getMapId())));
        sessionRooms.put(sessionId, roomId);
        Player player = new Player(
                message.getPlayerId(),
                sanitizer.playerName(message.getName()),
                sanitizer.team(message.getTeam()),
                sanitizer.weaponId(message.getWeaponId()),
                (int) Math.round(message.getX()),
                (int) Math.round(message.getY()),
                message.getFacing() == 0 ? 1 : message.getFacing()
        );
        applyPlayerDetails(player, message);
        room.putPlayer(sessionId, player);
        return room;
    }

    public void applyPlayerDetails(Player player, GameMessage message) {
        player.setWeaponId(sanitizer.weaponId(message.getWeaponId()));
        player.setWeaponSkinId(message.getWeaponSkinId() == null || message.getWeaponSkinId().isBlank() ? "standard" : message.getWeaponSkinId().trim());
        player.setOutfitId(message.getOutfitId() == null || message.getOutfitId().isBlank() ? "classic" : message.getOutfitId().trim());
        player.setAccessoryIds(message.getAccessoryIds() == null ? java.util.List.of() : message.getAccessoryIds());
        player.setX(message.getX());
        player.setY(message.getY());
        player.setZ(message.getZ());
        player.setYaw(message.getYaw());
        player.setPitch(message.getPitch());
        player.setHealth(message.getHealth() <= 0 && !message.isDead() ? player.getHealth() : Math.max(0, message.getHealth()));
        player.setDead(message.isDead());
        player.setKills(Math.max(0, message.getKills()));
        player.setAssists(Math.max(0, message.getAssists()));
        player.setDeaths(Math.max(0, message.getDeaths()));
        player.setScore(Math.max(0, message.getScore()));
    }

    public Player playerForSession(String sessionId) {
        GameRoom room = roomForSession(sessionId);
        if (room == null) {
            return null;
        }
        return room.getPlayer(sessionId);
    }

    public GameRoom roomForSession(String sessionId) {
        String roomId = sessionRooms.get(sessionId);
        if (roomId == null) {
            return null;
        }
        return rooms.get(roomId);
    }

    public GameRoom room(String roomId) {
        return rooms.get(roomId);
    }

    public Collection<Map.Entry<String, String>> sessionRoomEntries() {
        return sessionRooms.entrySet();
    }

    public void leave(String sessionId) {
        String roomId = sessionRooms.remove(sessionId);
        if (roomId == null) {
            return;
        }
        GameRoom room = rooms.get(roomId);
        if (room == null) {
            return;
        }
        room.removePlayer(sessionId);
        if (room.isEmpty()) {
            rooms.remove(roomId);
        }
    }
}
