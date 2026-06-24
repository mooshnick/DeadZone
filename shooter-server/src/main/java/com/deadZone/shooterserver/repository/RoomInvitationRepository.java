package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.RoomInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface RoomInvitationRepository extends JpaRepository<RoomInvitation, Long> {
    List<RoomInvitation> findByRecipientIdAndStatusOrderByCreatedAtDesc(Long recipientId, String status);
    Optional<RoomInvitation> findBySenderIdAndRecipientIdAndRoomCodeAndStatus(
            Long senderId,
            Long recipientId,
            String roomCode,
            String status
    );
    List<RoomInvitation> findByExpiresAtBefore(Instant cutoff);
}
