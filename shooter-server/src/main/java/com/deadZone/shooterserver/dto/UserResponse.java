package com.deadZone.shooterserver.dto;

import com.deadZone.shooterserver.model.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record UserResponse(
        Long id,
        String username,
        String email,
        boolean emailVerified,
        boolean admin,
        int totalKills,
        int totalAssists,
        int totalDeaths,
        int wallet,
        int xp,
        String outfitId,
        String weaponId,
        String weaponSkinId,
        String grenadeSkinId,
        List<String> ownedOutfits,
        List<String> ownedWeaponSkins,
        List<String> ownedGrenadeSkins,
        List<String> ownedAccessories,
        List<String> accessoryIds,
        Map<String, Integer> weaponUpgrades,
        String missionStats
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.isEmailVerified(),
                user.isAdmin(),
                user.getTotalKills(),
                user.getTotalAssists(),
                user.getTotalDeaths(),
                user.getWallet(),
                user.getXp(),
                user.getOutfitId() == null ? "classic" : user.getOutfitId(),
                user.getWeaponId() == null ? "rifle" : user.getWeaponId(),
                user.getWeaponSkinId() == null ? "standard" : user.getWeaponSkinId(),
                user.getGrenadeSkinId() == null ? "standard" : user.getGrenadeSkinId(),
                withDefault(user.getOwnedOutfits(), "classic"),
                withDefault(user.getOwnedWeaponSkins(), "standard"),
                withDefault(user.getOwnedGrenadeSkins(), "standard"),
                new ArrayList<>(user.getOwnedAccessories()),
                new ArrayList<>(user.getAccessoryIds()),
                Map.copyOf(user.getWeaponUpgrades()),
                missionStatsJson(user)
        );
    }

    private static List<String> withDefault(Iterable<String> values, String defaultValue) {
        List<String> items = new ArrayList<>();
        if (values != null) {
            values.forEach(value -> {
                if (value != null && !value.isBlank()) {
                    items.add(value);
                }
            });
        }
        return items.isEmpty() ? List.of(defaultValue) : items;
    }

    private static String missionStatsJson(User user) {
        if (user.getMissionStatsJson() != null && !user.getMissionStatsJson().isBlank()) {
            return user.getMissionStatsJson();
        }
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("claimed", new ArrayList<>(user.getClaimedMissions()));
        stats.put("mapPlays", Map.copyOf(user.getMapPlays()));
        stats.put("weaponKills", Map.copyOf(user.getWeaponKills()));
        try {
            return OBJECT_MAPPER.writeValueAsString(stats);
        } catch (JsonProcessingException ignored) {
            return "";
        }
    }
}
