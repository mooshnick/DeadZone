package com.deadZone.shooterserver.repository;

import com.deadZone.shooterserver.model.LobbyRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LobbyRoomRepository extends JpaRepository<LobbyRoom, String> {
}
