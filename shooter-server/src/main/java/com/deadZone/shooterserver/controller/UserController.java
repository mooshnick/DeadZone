package com.deadZone.shooterserver.controller;

import com.deadZone.shooterserver.dto.AuthResponse;
import com.deadZone.shooterserver.dto.LoginRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
import com.deadZone.shooterserver.dto.RegisterRequest;
import com.deadZone.shooterserver.dto.UserResponse;
import com.deadZone.shooterserver.service.JwtService;
import com.deadZone.shooterserver.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;
    private final JwtService jwtService;

    public UserController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@RequestHeader("Authorization") String authorization) {
        return ResponseEntity.ok(userService.getUser(jwtService.requireUserId(authorization)));
    }

    @PatchMapping("/me/progress")
    public ResponseEntity<UserResponse> updateProgress(
            @RequestHeader("Authorization") String authorization,
            @RequestBody ProgressRequest request
    ) {
        return ResponseEntity.ok(userService.updateProgress(jwtService.requireUserId(authorization), request));
    }
}
