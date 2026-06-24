package com.deadZone.shooterserver.model;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {
    public static final String DEFAULT_OUTFIT_ID = "classic";
    public static final String DEFAULT_WEAPON_ID = "rifle";
    public static final String DEFAULT_WEAPON_SKIN_ID = "standard";
    public static final String DEFAULT_GRENADE_SKIN_ID = "standard";
    public static final String ALL_OUTFITS = "classic,shadow,neon,forest,gold,lava,knight,striker";
    public static final String ALL_WEAPON_SKINS = "standard,ember,arctic,toxic,royal,goldline";
    public static final String ALL_GRENADE_SKINS = "standard,signal,plasma,royal";
    public static final String ALL_ACCESSORIES = "cap-red,crown,visor-blue,shades,tail-neon,tail-lava,boots-speed,boots-ice";
    public static final String MAX_WEAPON_UPGRADES = "rifle:10,shotgun:10,smg:10,sniper:10,blaster:10,rpg:10";
    public static final int ADMIN_WALLET = 1_000_000_000;
    public static final int ADMIN_XP = 10_000_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String username;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private boolean emailVerified;

    private Instant emailVerifiedAt;

    private int totalKills;
    private int totalAssists;
    private int totalDeaths;
    private int wallet;
    private int xp;
    private String outfitId;
    private String weaponId;
    private String weaponSkinId;
    private String grenadeSkinId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_owned_outfits", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "outfit_id", nullable = false, length = 64)
    private List<String> ownedOutfits = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_owned_weapon_skins", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "skin_id", nullable = false, length = 64)
    private List<String> ownedWeaponSkins = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_owned_grenade_skins", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "skin_id", nullable = false, length = 64)
    private List<String> ownedGrenadeSkins = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_owned_accessories", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "accessory_id", nullable = false, length = 64)
    private List<String> ownedAccessories = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_equipped_accessories", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "accessory_id", nullable = false, length = 64)
    private List<String> accessoryIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_weapon_upgrades", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "weapon_id", length = 64)
    @Column(name = "upgrade_level", nullable = false)
    private Map<String, Integer> weaponUpgrades = new LinkedHashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_claimed_missions", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "mission_id", nullable = false, length = 64)
    private List<String> claimedMissions = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_map_plays", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "map_id", length = 64)
    @Column(name = "plays", nullable = false)
    private Map<String, Integer> mapPlays = new LinkedHashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_weapon_kills", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "weapon_id", length = 64)
    @Column(name = "kills", nullable = false)
    private Map<String, Integer> weaponKills = new LinkedHashMap<>();

    @Column(name = "mission_stats_json", length = 8000)
    private String missionStatsJson;
    private boolean admin;

    public User() {}

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.totalKills = 0;
        this.totalAssists = 0;
        this.totalDeaths = 0;
        this.wallet = 0;
        this.xp = 0;
        this.outfitId = DEFAULT_OUTFIT_ID;
        this.weaponId = DEFAULT_WEAPON_ID;
        this.weaponSkinId = DEFAULT_WEAPON_SKIN_ID;
        this.grenadeSkinId = DEFAULT_GRENADE_SKIN_ID;
        this.ownedOutfits = new ArrayList<>(List.of(DEFAULT_OUTFIT_ID));
        this.ownedWeaponSkins = new ArrayList<>(List.of(DEFAULT_WEAPON_SKIN_ID));
        this.ownedGrenadeSkins = new ArrayList<>(List.of(DEFAULT_GRENADE_SKIN_ID));
        this.ownedAccessories = new ArrayList<>();
        this.accessoryIds = new ArrayList<>();
        this.weaponUpgrades = new LinkedHashMap<>();
        this.claimedMissions = new ArrayList<>();
        this.mapPlays = new LinkedHashMap<>();
        this.weaponKills = new LinkedHashMap<>();
        this.missionStatsJson = "";
        this.admin = false;
        this.emailVerified = false;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public void setEmailVerifiedAt(Instant emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }

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

    public String getWeaponId() { return weaponId; }
    public void setWeaponId(String weaponId) { this.weaponId = weaponId; }

    public String getWeaponSkinId() { return weaponSkinId; }
    public void setWeaponSkinId(String weaponSkinId) { this.weaponSkinId = weaponSkinId; }

    public String getGrenadeSkinId() { return grenadeSkinId; }
    public void setGrenadeSkinId(String grenadeSkinId) { this.grenadeSkinId = grenadeSkinId; }

    public List<String> getOwnedOutfits() { return ownedOutfits; }
    public void setOwnedOutfits(Collection<String> ownedOutfits) { this.ownedOutfits = cleanList(ownedOutfits); }

    public List<String> getOwnedWeaponSkins() { return ownedWeaponSkins; }
    public void setOwnedWeaponSkins(Collection<String> ownedWeaponSkins) { this.ownedWeaponSkins = cleanList(ownedWeaponSkins); }

    public List<String> getOwnedGrenadeSkins() { return ownedGrenadeSkins; }
    public void setOwnedGrenadeSkins(Collection<String> ownedGrenadeSkins) { this.ownedGrenadeSkins = cleanList(ownedGrenadeSkins); }

    public List<String> getOwnedAccessories() { return ownedAccessories; }
    public void setOwnedAccessories(Collection<String> ownedAccessories) { this.ownedAccessories = cleanList(ownedAccessories); }

    public List<String> getAccessoryIds() { return accessoryIds; }
    public void setAccessoryIds(Collection<String> accessoryIds) { this.accessoryIds = cleanList(accessoryIds); }

    public Map<String, Integer> getWeaponUpgrades() { return weaponUpgrades; }
    public void setWeaponUpgrades(Map<String, Integer> weaponUpgrades) {
        this.weaponUpgrades = new LinkedHashMap<>();
        if (weaponUpgrades == null) {
            return;
        }
        weaponUpgrades.forEach((weaponId, level) -> {
            if (weaponId != null && !weaponId.isBlank() && level != null) {
                this.weaponUpgrades.put(weaponId.trim(), Math.max(0, level));
            }
        });
    }

    public List<String> getClaimedMissions() { return claimedMissions; }
    public void setClaimedMissions(Collection<String> claimedMissions) { this.claimedMissions = cleanList(claimedMissions); }

    public Map<String, Integer> getMapPlays() { return mapPlays; }
    public void setMapPlays(Map<String, Integer> mapPlays) { this.mapPlays = cleanPositiveMap(mapPlays); }

    public Map<String, Integer> getWeaponKills() { return weaponKills; }
    public void setWeaponKills(Map<String, Integer> weaponKills) { this.weaponKills = cleanPositiveMap(weaponKills); }

    public String getMissionStatsJson() { return missionStatsJson; }
    public void setMissionStatsJson(String missionStatsJson) {
        this.missionStatsJson = missionStatsJson == null ? "" : missionStatsJson;
    }

    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }

    private List<String> cleanList(Collection<String> values) {
        Set<String> unique = new LinkedHashSet<>();
        if (values == null) {
            return new ArrayList<>();
        }
        values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .forEach(unique::add);
        return new ArrayList<>(unique);
    }

    private Map<String, Integer> cleanPositiveMap(Map<String, Integer> values) {
        Map<String, Integer> cleaned = new LinkedHashMap<>();
        if (values == null) {
            return cleaned;
        }
        values.forEach((key, value) -> {
            if (key != null && !key.isBlank() && value != null && value > 0) {
                cleaned.put(key.trim(), value);
            }
        });
        return cleaned;
    }
}
