package com.deadZone.shooterserver.dto;

public record AuthResponse(String token, UserResponse user, boolean verificationEmailSent) {}
