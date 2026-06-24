package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.LobbyRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface LobbyRoomRepository extends JpaRepository<LobbyRoom, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select room from LobbyRoom room where room.id = :id")
    Optional<LobbyRoom> findLockedById(@Param("id") String id);
}
