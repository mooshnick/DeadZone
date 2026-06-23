package com.deadZone.shooterserver.dto;

public record CreateRoomRequest(
        String name,
        String mapId,
        String gameMode,
        Integer maxPlayers,
        Boolean allowBots,
        Integer scoreLimit,
        Integer timeLimitMinutes
) {}
