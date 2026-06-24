package com.deadZone.shooterserver.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class StoreCatalog {
    private static final Map<String, Integer> OUTFITS = Map.of(
            "classic", 0, "shadow", 96, "neon", 156, "forest", 204,
            "gold", 288, "lava", 384, "knight", 336, "striker", 264
    );
    private static final Map<String, Integer> WEAPON_SKINS = Map.of(
            "standard", 0, "ember", 132, "arctic", 168,
            "toxic", 216, "royal", 288, "goldline", 384
    );
    private static final Map<String, Integer> GRENADE_SKINS = Map.of(
            "standard", 0, "signal", 108, "plasma", 192, "royal", 288
    );
    private static final Map<String, Integer> ACCESSORIES = Map.ofEntries(
            Map.entry("cap-red", 108), Map.entry("crown", 312),
            Map.entry("propeller-hat", 228), Map.entry("party-hat", 180),
            Map.entry("visor-blue", 144), Map.entry("shades", 180),
            Map.entry("clear-glasses", 132), Map.entry("tail-neon", 216),
            Map.entry("tail-lava", 264), Map.entry("boots-speed", 192),
            Map.entry("boots-ice", 228), Map.entry("boots-gold", 276),
            Map.entry("skateboard", 360), Map.entry("surfboard", 408),
            Map.entry("bimba", 336), Map.entry("segway", 456),
            Map.entry("belt-tactical", 168), Map.entry("belt-champion", 348),
            Map.entry("backpack-field", 228), Map.entry("backpack-neon", 324),
            Map.entry("watch-blue", 132), Map.entry("watch-gold", 252),
            Map.entry("duck-nose", 204), Map.entry("clown-nose", 168),
            Map.entry("hair-spikes", 216), Map.entry("hair-pink", 228),
            Map.entry("shirt-football-blue", 288), Map.entry("shirt-football-red", 288),
            Map.entry("shirt-stripes", 324)
    );
    private static final Set<String> WEAPONS = Set.of("rifle", "shotgun", "smg", "sniper", "blaster", "rpg");

    public int outfitPrice(String id) { return requiredPrice(OUTFITS, id, "outfit"); }
    public int weaponSkinPrice(String id) { return requiredPrice(WEAPON_SKINS, id, "weapon skin"); }
    public int grenadeSkinPrice(String id) { return requiredPrice(GRENADE_SKINS, id, "grenade skin"); }
    public int accessoryPrice(String id) { return requiredPrice(ACCESSORIES, id, "accessory"); }
    public boolean isWeapon(String id) { return id != null && WEAPONS.contains(id); }
    public boolean isOutfit(String id) { return id != null && OUTFITS.containsKey(id); }
    public boolean isWeaponSkin(String id) { return id != null && WEAPON_SKINS.containsKey(id); }
    public boolean isGrenadeSkin(String id) { return id != null && GRENADE_SKINS.containsKey(id); }
    public boolean isAccessory(String id) { return id != null && ACCESSORIES.containsKey(id); }

    public int upgradePrice(int currentLevel) {
        return 75 + Math.max(0, currentLevel) * 65;
    }

    private int requiredPrice(Map<String, Integer> prices, String id, String type) {
        Integer price = prices.get(id);
        if (price == null) {
            throw new IllegalArgumentException("Unknown " + type + ": " + id);
        }
        return price;
    }
}
