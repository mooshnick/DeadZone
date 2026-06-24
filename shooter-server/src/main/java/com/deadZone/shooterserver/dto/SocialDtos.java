package com.deadZone.shooterserver.dto;

import java.time.Instant;
import java.util.List;

public final class SocialDtos {
    private SocialDtos() {}

    public record UserSummary(Long id, String username, int level) {}
    public record FriendRequestView(Long id, UserSummary user, Instant createdAt) {}
    public record RoomInviteView(
            Long id,
            UserSummary sender,
            LobbyRoomResponse room,
            Instant createdAt
    ) {}
    public record Overview(
            List<UserSummary> friends,
            List<FriendRequestView> incomingRequests,
            List<FriendRequestView> outgoingRequests,
            List<RoomInviteView> roomInvites
    ) {}
    public record FriendRequestInput(String username) {}
    public record RoomInviteInput(Long friendId, String roomCode) {}
}
