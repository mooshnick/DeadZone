package com.deadZone.shooterserver.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
    public static final String DEFAULT_OUTFIT_ID = "classic";
    public static final String DEFAULT_WEAPON_SKIN_ID = "standard";
    public static final String ALL_OUTFITS = "classic,shadow,neon,forest,gold,lava,knight,striker";
    public static final String ALL_WEAPON_SKINS = "standard,ember,arctic,toxic,royal,goldline";
    public static final String MAX_WEAPON_UPGRADES = "rifle:10,shotgun:10,smg:10,sniper:10,blaster:10,rpg:10";
    public static final int ADMIN_WALLET = 1_000_000_000;
    public static final int ADMIN_XP = 10_000_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String username;

    @Column(nullable = false)
    private String password;

    private int totalKills;
    private int totalAssists;
    private int totalDeaths;
    private int wallet;
    private int xp;
    private String outfitId;
    private String weaponSkinId;
    private String ownedOutfits;
    private String ownedWeaponSkins;
    private String weaponUpgrades;
    private boolean admin;

    public User() {}

    public User(String username, String password) {
        this.username = username;
        this.password = password;
        this.totalKills = 0;
        this.totalAssists = 0;
        this.totalDeaths = 0;
        this.wallet = 0;
        this.xp = 0;
        this.outfitId = DEFAULT_OUTFIT_ID;
        this.weaponSkinId = DEFAULT_WEAPON_SKIN_ID;
        this.ownedOutfits = DEFAULT_OUTFIT_ID;
        this.ownedWeaponSkins = DEFAULT_WEAPON_SKIN_ID;
        this.weaponUpgrades = "";
        this.admin = false;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public int getTotalKills() { return totalKills; }
    public void setTotalKills(int totalKills) { this.totalKills = totalKills; }

    public int getTotalAssists() { return totalAssists; }
    public void setTotalAssists(int totalAssists) { this.totalAssists = totalAssists; }

    public int getTotalDeaths() { return totalDeaths; }
    public void setTotalDeaths(int totalDeaths) { this.totalDeaths = totalDeaths; }

    public int getWallet() { return wallet; }
    public void setWallet(int wallet) { this.wallet = wallet; }

    public int getXp() { return xp; }
    public void setXp(int xp) { this.xp = xp; }

    public String getOutfitId() { return outfitId; }
    public void setOutfitId(String outfitId) { this.outfitId = outfitId; }

    public String getWeaponSkinId() { return weaponSkinId; }
    public void setWeaponSkinId(String weaponSkinId) { this.weaponSkinId = weaponSkinId; }

    public String getOwnedOutfits() { return ownedOutfits; }
    public void setOwnedOutfits(String ownedOutfits) { this.ownedOutfits = ownedOutfits; }

    public String getOwnedWeaponSkins() { return ownedWeaponSkins; }
    public void setOwnedWeaponSkins(String ownedWeaponSkins) { this.ownedWeaponSkins = ownedWeaponSkins; }

    public String getWeaponUpgrades() { return weaponUpgrades; }
    public void setWeaponUpgrades(String weaponUpgrades) { this.weaponUpgrades = weaponUpgrades; }

    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }
}
