package com.deadZone.shooterserver.controller;

import com.deadZone.shooterserver.dto.AuthResponse;
import com.deadZone.shooterserver.dto.GoogleLoginRequest;
import com.deadZone.shooterserver.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(userService.googleLogin(request));
    }
}
