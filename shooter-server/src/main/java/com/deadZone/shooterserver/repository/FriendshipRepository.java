package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    List<Friendship> findByFirstUserIdOrSecondUserId(Long firstUserId, Long secondUserId);
    boolean existsByFirstUserIdAndSecondUserId(Long firstUserId, Long secondUserId);
}
