package com.deadZone.shooterserver.model;

import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "lobby_rooms")
public class LobbyRoom {
    @Id
    @Column(length = 16)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 32)
    private String mapId;

    @Column(length = 32)
    private String gameMode = "team-deathmatch";

    private int players;
    private int maxPlayers;
    private int bluePlayers;
    private int redPlayers;
    private boolean allowBots;

    public LobbyRoom() {}

    public LobbyRoom(String id, String name, String mapId, String gameMode, int players, int maxPlayers, int bluePlayers, int redPlayers, boolean allowBots) {
        this.id = id;
        this.name = name;
        this.mapId = mapId;
        this.gameMode = gameMode == null || gameMode.isBlank() ? "team-deathmatch" : gameMode;
        this.players = players;
        this.maxPlayers = maxPlayers;
        this.bluePlayers = bluePlayers;
        this.redPlayers = redPlayers;
        this.allowBots = allowBots;
    }

    public static LobbyRoom fromResponse(LobbyRoomResponse response) {
        return new LobbyRoom(
                response.id(),
                response.name(),
                response.mapId(),
                response.gameMode(),
                response.players(),
                response.maxPlayers(),
                response.bluePlayers(),
                response.redPlayers(),
                response.allowBots()
        );
    }

    public LobbyRoomResponse toResponse() {
        return new LobbyRoomResponse(id, name, mapId, gameMode == null || gameMode.isBlank() ? "team-deathmatch" : gameMode, players, maxPlayers, bluePlayers, redPlayers, allowBots);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

    public String getGameMode() { return gameMode; }
    public void setGameMode(String gameMode) { this.gameMode = gameMode; }

    public int getPlayers() { return players; }
    public void setPlayers(int players) { this.players = players; }

    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }

    public int getBluePlayers() { return bluePlayers; }
    public void setBluePlayers(int bluePlayers) { this.bluePlayers = bluePlayers; }

    public int getRedPlayers() { return redPlayers; }
    public void setRedPlayers(int redPlayers) { this.redPlayers = redPlayers; }

    public boolean isAllowBots() { return allowBots; }
    public void setAllowBots(boolean allowBots) { this.allowBots = allowBots; }
}
