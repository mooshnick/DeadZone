package com.deadZone.shooterserver.config;

import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {
    private static final int ADMIN_WALLET = 1_000_000_000;
    private static final int ADMIN_XP = 10_000_000;
    private static final String ALL_OUTFITS = "classic,shadow,neon,forest,gold,lava,knight,striker";
    private static final String ALL_WEAPON_SKINS = "standard,ember,arctic,toxic,royal,goldline";
    private static final String MAX_WEAPON_UPGRADES = "rifle:10,shotgun:10,smg:10,sniper:10,blaster:10,rpg:10";

    private final UserRepository userRepository;

    public DatabaseSeeder(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(this::repairExistingUser);
        seedAdminUser();
    }

    private void repairExistingUser(User user) {
        boolean changed = false;
        if (user.getOutfitId() == null || user.getOutfitId().isBlank()) {
            user.setOutfitId("classic");
            changed = true;
        }
        if (user.getWeaponSkinId() == null || user.getWeaponSkinId().isBlank()) {
            user.setWeaponSkinId("standard");
            changed = true;
        }
        if (user.getOwnedOutfits() == null || user.getOwnedOutfits().isBlank()) {
            user.setOwnedOutfits("classic");
            changed = true;
        }
        if (user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isBlank()) {
            user.setOwnedWeaponSkins("standard");
            changed = true;
        }
        if (user.getWeaponUpgrades() == null) {
            user.setWeaponUpgrades("");
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
        }
    }

    private void seedAdminUser() {
        User testUser = userRepository.findByUsername("test").orElseGet(() -> new User("test", "1234"));
        testUser.setPassword("1234");
        testUser.setAdmin(true);
        testUser.setWallet(ADMIN_WALLET);
        testUser.setXp(ADMIN_XP);
        testUser.setOutfitId("gold");
        testUser.setWeaponSkinId("goldline");
        testUser.setOwnedOutfits(ALL_OUTFITS);
        testUser.setOwnedWeaponSkins(ALL_WEAPON_SKINS);
        testUser.setWeaponUpgrades(MAX_WEAPON_UPGRADES);
        userRepository.save(testUser);
    }
}
