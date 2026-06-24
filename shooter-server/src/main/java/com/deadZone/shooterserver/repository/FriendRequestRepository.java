package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByRecipientIdAndStatusOrderByCreatedAtDesc(Long recipientId, String status);
    List<FriendRequest> findBySenderIdAndStatusOrderByCreatedAtDesc(Long senderId, String status);
    Optional<FriendRequest> findBySenderIdAndRecipientId(Long senderId, Long recipientId);
    Optional<FriendRequest> findBySenderIdAndRecipientIdAndStatus(Long senderId, Long recipientId, String status);
}
