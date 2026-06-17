package com.deadZone.shooterserver.model;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class GameRoom {
    private final String id;
    private final String mapId;
    private final Map<String, Player> playersBySessionId = new ConcurrentHashMap<>();

    public GameRoom(String id, String mapId) {
        this.id = id;
        this.mapId = mapId;
    }

    public String getId() {
        return id;
    }

    public String getMapId() {
        return mapId;
    }

    public boolean isFull(int maxPlayers) {
        return playersBySessionId.size() >= maxPlayers;
    }

    public void putPlayer(String sessionId, Player player) {
        playersBySessionId.put(sessionId, player);
    }

    public Player getPlayer(String sessionId) {
        return playersBySessionId.get(sessionId);
    }

    public void removePlayer(String sessionId) {
        playersBySessionId.remove(sessionId);
    }

    public boolean isEmpty() {
        return playersBySessionId.isEmpty();
    }

    public Collection<Player> players() {
        return playersBySessionId.values();
    }
}
