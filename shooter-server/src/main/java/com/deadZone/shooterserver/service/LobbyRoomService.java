package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.CreateRoomRequest;
import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import com.deadZone.shooterserver.model.LobbyRoom;
import com.deadZone.shooterserver.repository.LobbyRoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class LobbyRoomService {
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final List<String> MAP_IDS = List.of(
            "foundry", "pitch", "castle", "jungle", "lava", "neon", "ice", "station", "apocalyptic"
    );
    private static final List<String> GAME_MODES = List.of(
            "team-deathmatch", "free-for-all", "capture-flag", "attack-defend", "circle-control"
    );
    private static final Duration EMPTY_ROOM_TTL = Duration.ofMinutes(5);
    private final LobbyRoomRepository lobbyRoomRepository;
    private final SecureRandom random = new SecureRandom();

    public LobbyRoomService(LobbyRoomRepository lobbyRoomRepository) {
        this.lobbyRoomRepository = lobbyRoomRepository;
    }

    public List<LobbyRoomResponse> listOpenRooms() {
        ensurePermanentRooms();
        return lobbyRoomRepository.findAll().stream()
                .map(LobbyRoom::toResponse)
                .filter(room -> room.players() < room.maxPlayers())
                .sorted(Comparator.comparing(LobbyRoomResponse::name))
                .toList();
    }

    public LobbyRoomResponse findByCode(String code) {
        return lobbyRoomRepository.findById(normalizeCode(code))
                .map(LobbyRoom::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No open room matches that game code."));
    }

    public LobbyRoomResponse create(CreateRoomRequest request) {
        String name = request == null || request.name() == null || request.name().isBlank()
                ? "Custom Arena"
                : request.name().trim();
        String mapId = request == null || !MAP_IDS.contains(request.mapId()) ? "foundry" : request.mapId();
        String gameMode = request == null || !GAME_MODES.contains(request.gameMode()) ? "team-deathmatch" : request.gameMode();
        int maxPlayers = request == null || request.maxPlayers() == null
                ? 6
                : Math.max(2, Math.min(6, request.maxPlayers()));
        boolean allowBots = request == null || request.allowBots() == null || request.allowBots();
        int scoreLimit = validScoreLimit(gameMode, request == null ? null : request.scoreLimit());
        int timeLimitMinutes = Math.max(5, Math.min(20, request == null || request.timeLimitMinutes() == null ? 20 : request.timeLimitMinutes()));
        LobbyRoom room = new LobbyRoom(
                generateCode(),
                name,
                mapId,
                gameMode,
                scoreLimit,
                timeLimitMinutes,
                0,
                maxPlayers,
                0,
                0,
                allowBots,
                false
        );
        return lobbyRoomRepository.save(room).toResponse();
    }

    public void seedDefaultRooms() {
        Instant restartedAt = Instant.now();
        List<LobbyRoom> disconnectedRooms = lobbyRoomRepository.findAll().stream()
                .peek(room -> {
                    room.setPlayers(0);
                    room.setBluePlayers(0);
                    room.setRedPlayers(0);
                    room.setLastActivityAt(restartedAt);
                })
                .toList();
        lobbyRoomRepository.saveAll(disconnectedRooms);
        List.of("ALPHA1", "CITY01", "NEON22", "JUNGLE").stream()
                .filter(lobbyRoomRepository::existsById)
                .forEach(lobbyRoomRepository::deleteById);
        ensurePermanentRooms();
    }

    @Transactional
    public LobbyRoomResponse join(String code) {
        LobbyRoom room = requireLockedRoom(code);
        if (room.getPlayers() >= room.getMaxPlayers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This room is full.");
        }
        room.setPlayers(room.getPlayers() + 1);
        if (!"free-for-all".equals(room.getGameMode())) {
            if (room.getBluePlayers() <= room.getRedPlayers()) {
                room.setBluePlayers(room.getBluePlayers() + 1);
            } else {
                room.setRedPlayers(room.getRedPlayers() + 1);
            }
        }
        room.setLastActivityAt(Instant.now());
        return lobbyRoomRepository.save(room).toResponse();
    }

    @Transactional
    public LobbyRoomResponse leave(String code) {
        LobbyRoom room = requireLockedRoom(code);
        room.setPlayers(Math.max(0, room.getPlayers() - 1));
        if (!"free-for-all".equals(room.getGameMode())) {
            if (room.getBluePlayers() >= room.getRedPlayers() && room.getBluePlayers() > 0) {
                room.setBluePlayers(room.getBluePlayers() - 1);
            } else if (room.getRedPlayers() > 0) {
                room.setRedPlayers(room.getRedPlayers() - 1);
            }
        }
        room.setLastActivityAt(Instant.now());
        return lobbyRoomRepository.save(room).toResponse();
    }

    @Scheduled(fixedDelay = 60_000)
    public void removeExpiredEmptyRooms() {
        Instant cutoff = Instant.now().minus(EMPTY_ROOM_TTL);
        lobbyRoomRepository.findAll().stream()
                .filter(room -> !room.isPermanent())
                .filter(room -> room.getPlayers() == 0)
                .filter(room -> room.getLastActivityAt() == null || room.getLastActivityAt().isBefore(cutoff))
                .forEach(lobbyRoomRepository::delete);
        ensurePermanentRooms();
    }

    private synchronized void ensurePermanentRooms() {
        seed(new LobbyRoom("TEAM01", "Frontline Teams", "foundry", "team-deathmatch", 30, 20, 0, 6, 0, 0, true, true), true);
        seed(new LobbyRoom("FFA001", "Solo Mayhem", "apocalyptic", "free-for-all", 25, 20, 0, 6, 0, 0, true, true), true);
        seed(randomPermanentRoom(), false);
    }

    private LobbyRoom randomPermanentRoom() {
        List<String> modes = List.of("capture-flag", "attack-defend", "circle-control");
        String mode = modes.get(random.nextInt(modes.size()));
        String map = MAP_IDS.get(random.nextInt(MAP_IDS.size()));
        return new LobbyRoom("RANDOM", "Random Objective", map, mode, validScoreLimit(mode, null), 20, 0, 6, 0, 0, true, true);
    }

    private void seed(LobbyRoom room, boolean syncConfiguration) {
        if (!lobbyRoomRepository.existsById(room.getId())) {
            lobbyRoomRepository.save(room);
            return;
        }
        LobbyRoom existing = lobbyRoomRepository.findById(room.getId()).orElseThrow();
        if (syncConfiguration) {
            existing.setName(room.getName());
            existing.setMapId(room.getMapId());
            existing.setGameMode(room.getGameMode());
            existing.setScoreLimit(room.getScoreLimit());
            existing.setTimeLimitMinutes(room.getTimeLimitMinutes());
        }
        existing.setMaxPlayers(room.getMaxPlayers());
        existing.setAllowBots(room.isAllowBots());
        existing.setPermanent(true);
        if (existing.getLastActivityAt() == null) {
            existing.setLastActivityAt(Instant.now());
        }
        lobbyRoomRepository.save(existing);
    }

    private String generateCode() {
        String code;
        do {
            StringBuilder value = new StringBuilder(6);
            for (int index = 0; index < 6; index += 1) {
                value.append(CODE_CHARACTERS.charAt(random.nextInt(CODE_CHARACTERS.length())));
            }
            code = value.toString();
        } while (lobbyRoomRepository.existsById(code));
        return code;
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase();
    }

    private LobbyRoom requireRoom(String code) {
        return lobbyRoomRepository.findById(normalizeCode(code))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No open room matches that game code."));
    }

    private LobbyRoom requireLockedRoom(String code) {
        return lobbyRoomRepository.findLockedById(normalizeCode(code))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No open room matches that game code."));
    }

    private int validScoreLimit(String gameMode, Integer requested) {
        int min;
        int max;
        int fallback;
        switch (gameMode) {
            case "free-for-all" -> { min = 15; max = 50; fallback = 25; }
            case "capture-flag" -> { min = 3; max = 15; fallback = 5; }
            case "circle-control" -> { min = 10; max = 30; fallback = 20; }
            case "attack-defend" -> { min = 15; max = 60; fallback = 30; }
            default -> { min = 20; max = 60; fallback = 30; }
        }
        return Math.max(min, Math.min(max, requested == null ? fallback : requested));
    }
}
