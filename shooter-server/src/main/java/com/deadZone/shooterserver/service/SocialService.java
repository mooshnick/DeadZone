package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.LobbyRoomResponse;
import com.deadZone.shooterserver.dto.SocialDtos;
import com.deadZone.shooterserver.model.FriendRequest;
import com.deadZone.shooterserver.model.Friendship;
import com.deadZone.shooterserver.model.RoomInvitation;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.FriendRequestRepository;
import com.deadZone.shooterserver.repository.FriendshipRepository;
import com.deadZone.shooterserver.repository.RoomInvitationRepository;
import com.deadZone.shooterserver.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.time.Instant;

@Service
public class SocialService {
    private static final String PENDING = "PENDING";
    private static final String ACCEPTED = "ACCEPTED";
    private static final String DECLINED = "DECLINED";

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final RoomInvitationRepository roomInvitationRepository;
    private final LobbyRoomService lobbyRoomService;

    public SocialService(
            UserRepository userRepository,
            FriendRequestRepository friendRequestRepository,
            FriendshipRepository friendshipRepository,
            RoomInvitationRepository roomInvitationRepository,
            LobbyRoomService lobbyRoomService
    ) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.friendshipRepository = friendshipRepository;
        this.roomInvitationRepository = roomInvitationRepository;
        this.lobbyRoomService = lobbyRoomService;
    }

    @Transactional(readOnly = true)
    public SocialDtos.Overview overview(Long userId) {
        requireUser(userId);
        List<SocialDtos.UserSummary> friends = friendshipRepository
                .findByFirstUserIdOrSecondUserId(userId, userId)
                .stream()
                .map(friendship -> friendship.getFirstUserId().equals(userId)
                        ? friendship.getSecondUserId()
                        : friendship.getFirstUserId())
                .map(this::requireUser)
                .map(this::summary)
                .sorted(Comparator.comparing(SocialDtos.UserSummary::username, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<SocialDtos.FriendRequestView> incoming = friendRequestRepository
                .findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, PENDING)
                .stream()
                .map(request -> requestView(request, request.getSenderId()))
                .toList();
        List<SocialDtos.FriendRequestView> outgoing = friendRequestRepository
                .findBySenderIdAndStatusOrderByCreatedAtDesc(userId, PENDING)
                .stream()
                .map(request -> requestView(request, request.getRecipientId()))
                .toList();
        List<SocialDtos.RoomInviteView> invites = roomInvitationRepository
                .findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, PENDING)
                .stream()
                .filter(invitation -> invitation.getExpiresAt().isAfter(Instant.now()))
                .map(this::inviteView)
                .filter(invite -> invite.room() != null)
                .toList();
        return new SocialDtos.Overview(friends, incoming, outgoing, invites);
    }

    @Transactional(readOnly = true)
    public List<SocialDtos.UserSummary> search(Long userId, String query) {
        String normalized = query == null ? "" : query.trim();
        if (normalized.length() < 2) {
            return List.of();
        }
        return userRepository.findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(normalized).stream()
                .filter(user -> !user.getId().equals(userId))
                .map(this::summary)
                .toList();
    }

    @Transactional
    public void sendFriendRequest(Long senderId, SocialDtos.FriendRequestInput input) {
        User sender = requireUser(senderId);
        String username = input == null || input.username() == null ? "" : input.username().trim();
        User recipient = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No player has that username."));
        if (sender.getId().equals(recipient.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot add yourself.");
        }
        if (areFriends(senderId, recipient.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This player is already your friend.");
        }
        if (friendRequestRepository.findBySenderIdAndRecipientIdAndStatus(senderId, recipient.getId(), PENDING).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A friend request is already waiting.");
        }
        var reverse = friendRequestRepository.findBySenderIdAndRecipientIdAndStatus(recipient.getId(), senderId, PENDING);
        if (reverse.isPresent()) {
            acceptFriendRequest(senderId, reverse.get().getId());
            return;
        }
        FriendRequest request = friendRequestRepository
                .findBySenderIdAndRecipientId(senderId, recipient.getId())
                .orElseGet(() -> new FriendRequest(senderId, recipient.getId()));
        request.setStatus(PENDING);
        request.setCreatedAt(java.time.Instant.now());
        friendRequestRepository.save(request);
    }

    @Transactional
    public void acceptFriendRequest(Long userId, Long requestId) {
        FriendRequest request = requireIncomingRequest(userId, requestId);
        request.setStatus(ACCEPTED);
        friendRequestRepository.save(request);
        if (!areFriends(request.getSenderId(), request.getRecipientId())) {
            friendshipRepository.save(new Friendship(request.getSenderId(), request.getRecipientId()));
        }
    }

    @Transactional
    public void declineFriendRequest(Long userId, Long requestId) {
        FriendRequest request = requireIncomingRequest(userId, requestId);
        request.setStatus(DECLINED);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void inviteToRoom(Long senderId, SocialDtos.RoomInviteInput input) {
        if (input == null || input.friendId() == null || input.roomCode() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Friend and room are required.");
        }
        if (!areFriends(senderId, input.friendId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only invite players from your friends list.");
        }
        LobbyRoomResponse room = lobbyRoomService.findByCode(input.roomCode());
        if (room.players() >= room.maxPlayers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This room is already full.");
        }
        String roomCode = room.id();
        if (roomInvitationRepository
                .findBySenderIdAndRecipientIdAndRoomCodeAndStatus(senderId, input.friendId(), roomCode, PENDING)
                .isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This friend already has an invitation to the room.");
        }
        roomInvitationRepository.save(new RoomInvitation(senderId, input.friendId(), roomCode));
    }

    @Transactional
    public LobbyRoomResponse acceptRoomInvite(Long userId, Long invitationId) {
        RoomInvitation invitation = requireRoomInvite(userId, invitationId);
        if (!invitation.getExpiresAt().isAfter(Instant.now())) {
            invitation.setStatus(DECLINED);
            roomInvitationRepository.save(invitation);
            throw new ResponseStatusException(HttpStatus.GONE, "This room invitation has expired.");
        }
        LobbyRoomResponse room = lobbyRoomService.findByCode(invitation.getRoomCode());
        if (room.players() >= room.maxPlayers()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This room is already full.");
        }
        invitation.setStatus(ACCEPTED);
        roomInvitationRepository.save(invitation);
        return room;
    }

    @Transactional
    public void declineRoomInvite(Long userId, Long invitationId) {
        RoomInvitation invitation = requireRoomInvite(userId, invitationId);
        invitation.setStatus(DECLINED);
        roomInvitationRepository.save(invitation);
    }

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void removeExpiredRoomInvitations() {
        roomInvitationRepository.deleteAll(roomInvitationRepository.findByExpiresAtBefore(Instant.now()));
    }

    private FriendRequest requireIncomingRequest(Long userId, Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friend request was not found."));
        if (!request.getRecipientId().equals(userId) || !PENDING.equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This friend request is not available.");
        }
        return request;
    }

    private RoomInvitation requireRoomInvite(Long userId, Long invitationId) {
        RoomInvitation invitation = roomInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room invitation was not found."));
        if (!invitation.getRecipientId().equals(userId) || !PENDING.equals(invitation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This room invitation is not available.");
        }
        return invitation;
    }

    private boolean areFriends(Long firstId, Long secondId) {
        long first = Math.min(firstId, secondId);
        long second = Math.max(firstId, secondId);
        return friendshipRepository.existsByFirstUserIdAndSecondUserId(first, second);
    }

    private SocialDtos.FriendRequestView requestView(FriendRequest request, Long otherUserId) {
        return new SocialDtos.FriendRequestView(request.getId(), summary(requireUser(otherUserId)), request.getCreatedAt());
    }

    private SocialDtos.RoomInviteView inviteView(RoomInvitation invitation) {
        try {
            return new SocialDtos.RoomInviteView(
                    invitation.getId(),
                    summary(requireUser(invitation.getSenderId())),
                    lobbyRoomService.findByCode(invitation.getRoomCode()),
                    invitation.getCreatedAt()
            );
        } catch (ResponseStatusException ignored) {
            return new SocialDtos.RoomInviteView(
                    invitation.getId(),
                    summary(requireUser(invitation.getSenderId())),
                    null,
                    invitation.getCreatedAt()
            );
        }
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player was not found."));
    }

    private SocialDtos.UserSummary summary(User user) {
        int level = Math.max(1, 1 + user.getXp() / 1000);
        return new SocialDtos.UserSummary(user.getId(), user.getUsername(), level);
    }
}
