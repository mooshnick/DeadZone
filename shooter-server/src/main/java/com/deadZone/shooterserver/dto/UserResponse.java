package com.deadZone.shooterserver.dto;

import com.deadZone.shooterserver.model.User;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record UserResponse(
        Long id,
        String username,
        boolean admin,
        int totalKills,
        int totalAssists,
        int totalDeaths,
        int wallet,
        int xp,
        String outfitId,
        String weaponSkinId,
        List<String> ownedOutfits,
        List<String> ownedWeaponSkins,
        Map<String, Integer> weaponUpgrades
) {
    public static UserResponse from(User user) {
        String owned = user.getOwnedOutfits() == null || user.getOwnedOutfits().isBlank()
                ? "classic"
                : user.getOwnedOutfits();
        String weaponSkins = user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isBlank()
                ? "standard"
                : user.getOwnedWeaponSkins();
        Map<String, Integer> upgrades = user.getWeaponUpgrades() == null || user.getWeaponUpgrades().isBlank()
                ? Map.of()
                : Arrays.stream(user.getWeaponUpgrades().split(","))
                .filter(item -> item.contains(":"))
                .map(item -> item.split(":", 2))
                .collect(Collectors.toMap(parts -> parts[0], parts -> Integer.parseInt(parts[1]), (a, b) -> b));

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.isAdmin(),
                user.getTotalKills(),
                user.getTotalAssists(),
                user.getTotalDeaths(),
                user.getWallet(),
                user.getXp(),
                user.getOutfitId() == null ? "classic" : user.getOutfitId(),
                user.getWeaponSkinId() == null ? "standard" : user.getWeaponSkinId(),
                Arrays.stream(owned.split(",")).filter(item -> !item.isBlank()).toList(),
                Arrays.stream(weaponSkins.split(",")).filter(item -> !item.isBlank()).toList(),
                upgrades
        );
    }
}
