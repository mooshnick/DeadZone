package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.CreateRoomRequest;
import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import com.deadZone.shooterserver.model.LobbyRoom;
import com.deadZone.shooterserver.repository.LobbyRoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
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
    private final LobbyRoomRepository lobbyRoomRepository;
    private final SecureRandom random = new SecureRandom();

    public LobbyRoomService(LobbyRoomRepository lobbyRoomRepository) {
        this.lobbyRoomRepository = lobbyRoomRepository;
    }

    public List<LobbyRoomResponse> listOpenRooms() {
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
        LobbyRoom room = new LobbyRoom(
                generateCode(),
                name,
                mapId,
                gameMode,
                0,
                maxPlayers,
                0,
                0,
                allowBots
        );
        return lobbyRoomRepository.save(room).toResponse();
    }

    public void seedDefaultRooms() {
        seed(new LobbyRoom("ALPHA1", "Alpha Rush", "foundry", "team-deathmatch", 3, 6, 2, 1, true));
        seed(new LobbyRoom("CITY01", "City Ruins", "apocalyptic", "free-for-all", 0, 6, 0, 0, true));
        seed(new LobbyRoom("NEON22", "Neon Duel", "neon", "capture-flag", 2, 4, 1, 1, false));
        seed(new LobbyRoom("JUNGLE", "Overgrowth Ops", "jungle", "circle-control", 5, 6, 3, 2, true));
    }

    private void seed(LobbyRoom room) {
        if (!lobbyRoomRepository.existsById(room.getId())) {
            lobbyRoomRepository.save(room);
        }
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
}
