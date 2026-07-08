package com.deadZone.shooterserver.dto;

public record GoogleLoginRequest(String idToken, String credential) {
    public String token() {
        if (credential != null && !credential.isBlank()) {
            return credential;
        }
        return idToken;
    }
}
