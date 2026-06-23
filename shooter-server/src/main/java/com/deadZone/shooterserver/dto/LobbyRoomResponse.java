package com.deadZone.shooterserver.dto;

public record LobbyRoomResponse(
        String id,
        String name,
        String mapId,
        String gameMode,
        int players,
        int maxPlayers,
        int bluePlayers,
        int redPlayers,
        boolean allowBots
) {}
