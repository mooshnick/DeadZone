package com.deadZone.shooterserver.config;

import com.deadZone.shooterserver.repository.UserRepository;
import com.deadZone.shooterserver.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final UserService userService;

    public DatabaseSeeder(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(userService::repairUserDefaults);
        userService.seedAdminUser("test", "1234");
    }
}
