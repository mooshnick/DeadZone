package com.deadZone.shooterserver.config;

import com.deadZone.shooterserver.repository.UserRepository;
import com.deadZone.shooterserver.service.LobbyRoomService;
import com.deadZone.shooterserver.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final LobbyRoomService lobbyRoomService;
    private final UserService userService;

    public DatabaseSeeder(UserRepository userRepository, LobbyRoomService lobbyRoomService, UserService userService) {
        this.userRepository = userRepository;
        this.lobbyRoomService = lobbyRoomService;
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(userService::repairUserDefaults);
        userService.seedAdminUser("test", "1234");
        lobbyRoomService.seedDefaultRooms();
    }
}
