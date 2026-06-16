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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String username;

    @Column(nullable = false)
    private String password;

    private int totalKills;
    private int wallet;
    private int xp;
    private String outfitId;
    private String weaponSkinId;
    private String ownedOutfits;
    private String ownedWeaponSkins;
    private String weaponUpgrades;

    public User() {}

    public User(String username, String password) {
        this.username = username;
        this.password = password;
        this.totalKills = 0;
        this.wallet = 0;
        this.xp = 0;
        this.outfitId = "classic";
        this.weaponSkinId = "standard";
        this.ownedOutfits = "classic";
        this.ownedWeaponSkins = "standard";
        this.weaponUpgrades = "";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public int getTotalKills() { return totalKills; }
    public void setTotalKills(int totalKills) { this.totalKills = totalKills; }

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
}
