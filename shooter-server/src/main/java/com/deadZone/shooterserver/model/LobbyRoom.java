package com.deadZone.shooterserver.model;

import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

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

    private int scoreLimit = 30;
    private int timeLimitMinutes = 20;
    private int players;
    private int maxPlayers;
    private int bluePlayers;
    private int redPlayers;
    private boolean allowBots;
    private boolean permanent;
    private Instant lastActivityAt = Instant.now();

    @Version
    private long version;

    public LobbyRoom() {}

    public LobbyRoom(String id, String name, String mapId, String gameMode, int scoreLimit, int timeLimitMinutes, int players, int maxPlayers, int bluePlayers, int redPlayers, boolean allowBots, boolean permanent) {
        this.id = id;
        this.name = name;
        this.mapId = mapId;
        this.gameMode = gameMode == null || gameMode.isBlank() ? "team-deathmatch" : gameMode;
        this.scoreLimit = scoreLimit;
        this.timeLimitMinutes = timeLimitMinutes;
        this.players = players;
        this.maxPlayers = maxPlayers;
        this.bluePlayers = bluePlayers;
        this.redPlayers = redPlayers;
        this.allowBots = allowBots;
        this.permanent = permanent;
        this.lastActivityAt = Instant.now();
    }

    public static LobbyRoom fromResponse(LobbyRoomResponse response) {
        return new LobbyRoom(
                response.id(),
                response.name(),
                response.mapId(),
                response.gameMode(),
                response.scoreLimit(),
                response.timeLimitMinutes(),
                response.players(),
                response.maxPlayers(),
                response.bluePlayers(),
                response.redPlayers(),
                response.allowBots(),
                response.permanent()
        );
    }

    public LobbyRoomResponse toResponse() {
        return new LobbyRoomResponse(
                id,
                name,
                mapId,
                gameMode == null || gameMode.isBlank() ? "team-deathmatch" : gameMode,
                scoreLimit,
                timeLimitMinutes,
                players,
                maxPlayers,
                bluePlayers,
                redPlayers,
                allowBots,
                permanent
        );
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

    public String getGameMode() { return gameMode; }
    public void setGameMode(String gameMode) { this.gameMode = gameMode; }

    public int getScoreLimit() { return scoreLimit; }
    public void setScoreLimit(int scoreLimit) { this.scoreLimit = scoreLimit; }

    public int getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(int timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }

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

    public boolean isPermanent() { return permanent; }
    public void setPermanent(boolean permanent) { this.permanent = permanent; }

    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }
}
