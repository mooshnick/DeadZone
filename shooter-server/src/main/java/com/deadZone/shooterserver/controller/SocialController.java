package com.deadZone.shooterserver.controller;

import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import com.deadZone.shooterserver.dto.SocialDtos;
import com.deadZone.shooterserver.service.JwtService;
import com.deadZone.shooterserver.service.SocialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {
    private final SocialService socialService;
    private final JwtService jwtService;

    public SocialController(SocialService socialService, JwtService jwtService) {
        this.socialService = socialService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<SocialDtos.Overview> overview(@RequestHeader("Authorization") String authorization) {
        return ResponseEntity.ok(socialService.overview(jwtService.requireUserId(authorization)));
    }

    @GetMapping("/users")
    public ResponseEntity<List<SocialDtos.UserSummary>> search(
            @RequestHeader("Authorization") String authorization,
            @RequestParam String username
    ) {
        return ResponseEntity.ok(socialService.search(jwtService.requireUserId(authorization), username));
    }

    @PostMapping("/friend-requests")
    public ResponseEntity<Void> sendRequest(
            @RequestHeader("Authorization") String authorization,
            @RequestBody SocialDtos.FriendRequestInput input
    ) {
        socialService.sendFriendRequest(jwtService.requireUserId(authorization), input);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/friend-requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long requestId
    ) {
        socialService.acceptFriendRequest(jwtService.requireUserId(authorization), requestId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/friend-requests/{requestId}")
    public ResponseEntity<Void> declineRequest(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long requestId
    ) {
        socialService.declineFriendRequest(jwtService.requireUserId(authorization), requestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/room-invites")
    public ResponseEntity<Void> invite(
            @RequestHeader("Authorization") String authorization,
            @RequestBody SocialDtos.RoomInviteInput input
    ) {
        socialService.inviteToRoom(jwtService.requireUserId(authorization), input);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/room-invites/{invitationId}/accept")
    public ResponseEntity<LobbyRoomResponse> acceptInvite(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long invitationId
    ) {
        return ResponseEntity.ok(socialService.acceptRoomInvite(
                jwtService.requireUserId(authorization),
                invitationId
        ));
    }

    @DeleteMapping("/room-invites/{invitationId}")
    public ResponseEntity<Void> declineInvite(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long invitationId
    ) {
        socialService.declineRoomInvite(jwtService.requireUserId(authorization), invitationId);
        return ResponseEntity.noContent().build();
    }
}
