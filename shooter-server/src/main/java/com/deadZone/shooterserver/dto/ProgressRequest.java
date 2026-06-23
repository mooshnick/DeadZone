package com.deadZone.shooterserver.dto;

import java.util.List;
import java.util.Map;

public record ProgressRequest(
        Integer wallet,
        Integer xp,
        Integer totalKills,
        Integer totalAssists,
        Integer totalDeaths,
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
) {}
