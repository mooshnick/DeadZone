package com.deadZone.shooterserver.dto;

import com.deadZone.shooterserver.model.User;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record UserResponse(
        Long id,
        String username,
        String email,
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
    public static UserResponse from(User user) {
        String owned = user.getOwnedOutfits() == null || user.getOwnedOutfits().isBlank()
                ? "classic"
                : user.getOwnedOutfits();
        String weaponSkins = user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isBlank()
                ? "standard"
                : user.getOwnedWeaponSkins();
        String grenadeSkins = user.getOwnedGrenadeSkins() == null || user.getOwnedGrenadeSkins().isBlank()
                ? "standard"
                : user.getOwnedGrenadeSkins();
        String accessories = user.getOwnedAccessories() == null ? "" : user.getOwnedAccessories();
        String equippedAccessories = user.getAccessoryIds() == null ? "" : user.getAccessoryIds();
        Map<String, Integer> upgrades = user.getWeaponUpgrades() == null || user.getWeaponUpgrades().isBlank()
                ? Map.of()
                : Arrays.stream(user.getWeaponUpgrades().split(","))
                .filter(item -> item.contains(":"))
                .map(item -> item.split(":", 2))
                .collect(Collectors.toMap(parts -> parts[0], parts -> Integer.parseInt(parts[1]), (a, b) -> b));

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
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
                Arrays.stream(owned.split(",")).filter(item -> !item.isBlank()).toList(),
                Arrays.stream(weaponSkins.split(",")).filter(item -> !item.isBlank()).toList(),
                Arrays.stream(grenadeSkins.split(",")).filter(item -> !item.isBlank()).toList(),
                Arrays.stream(accessories.split(",")).filter(item -> !item.isBlank()).toList(),
                Arrays.stream(equippedAccessories.split(",")).filter(item -> !item.isBlank()).toList(),
                upgrades,
                user.getMissionStats() == null ? "" : user.getMissionStats()
        );
    }
}
