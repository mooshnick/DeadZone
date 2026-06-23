package com.deadZone.shooterserver.controller;

import com.deadZone.shooterserver.dto.CreateRoomRequest;
import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import com.deadZone.shooterserver.service.JwtService;
import com.deadZone.shooterserver.service.LobbyRoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class LobbyRoomController {
    private final LobbyRoomService lobbyRoomService;
    private final JwtService jwtService;

    public LobbyRoomController(LobbyRoomService lobbyRoomService, JwtService jwtService) {
        this.lobbyRoomService = lobbyRoomService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<List<LobbyRoomResponse>> list(
            @RequestHeader("Authorization") String authorization
    ) {
        jwtService.requireUserId(authorization);
        return ResponseEntity.ok(lobbyRoomService.listOpenRooms());
    }

    @GetMapping("/{code}")
    public ResponseEntity<LobbyRoomResponse> byCode(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String code
    ) {
        jwtService.requireUserId(authorization);
        return ResponseEntity.ok(lobbyRoomService.findByCode(code));
    }

    @PostMapping
    public ResponseEntity<LobbyRoomResponse> create(
            @RequestHeader("Authorization") String authorization,
            @RequestBody CreateRoomRequest request
    ) {
        jwtService.requireUserId(authorization);
        return ResponseEntity.ok(lobbyRoomService.create(request));
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<LobbyRoomResponse> join(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String code
    ) {
        jwtService.requireUserId(authorization);
        return ResponseEntity.ok(lobbyRoomService.join(code));
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<LobbyRoomResponse> leave(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String code
    ) {
        jwtService.requireUserId(authorization);
        return ResponseEntity.ok(lobbyRoomService.leave(code));
    }
}
