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
        String weaponSkinId,
        List<String> ownedOutfits,
        List<String> ownedWeaponSkins,
        Map<String, Integer> weaponUpgrades
) {}
