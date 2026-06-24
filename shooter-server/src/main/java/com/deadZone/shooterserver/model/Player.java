package com.deadZone.shooterserver.model;

public class Player {
    private String id;
    private String name;
    private String team;
    private String weaponId;
    private String weaponSkinId;
    private String outfitId;
    private java.util.List<String> accessoryIds;
    private double x;
    private double y;
    private double z;
    private double yaw;
    private double pitch;
    private int facing;
    private int health;
    private int kills;
    private int assists;
    private int deaths;
    private int score;
    private boolean dead;

    public Player() {}

    public Player(String id, String name, String team, String weaponId, int x, int y, int facing) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.weaponId = weaponId;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.yaw = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
        this.pitch = -0.08;
        this.weaponSkinId = "standard";
        this.outfitId = "classic";
        this.accessoryIds = java.util.List.of();
        this.facing = facing;
        this.health = 100;
        this.kills = 0;
        this.assists = 0;
        this.deaths = 0;
        this.score = 0;
        this.dead = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTeam() { return team; }
    public void setTeam(String team) { this.team = team; }

    public String getWeaponId() { return weaponId; }
    public void setWeaponId(String weaponId) { this.weaponId = weaponId; }

    public String getWeaponSkinId() { return weaponSkinId; }
    public void setWeaponSkinId(String weaponSkinId) { this.weaponSkinId = weaponSkinId; }

    public String getOutfitId() { return outfitId; }
    public void setOutfitId(String outfitId) { this.outfitId = outfitId; }

    public java.util.List<String> getAccessoryIds() { return accessoryIds; }
    public void setAccessoryIds(java.util.List<String> accessoryIds) { this.accessoryIds = accessoryIds; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getZ() { return z; }
    public void setZ(double z) { this.z = z; }

    public double getYaw() { return yaw; }
    public void setYaw(double yaw) { this.yaw = yaw; }

    public double getPitch() { return pitch; }
    public void setPitch(double pitch) { this.pitch = pitch; }

    public int getFacing() { return facing; }
    public void setFacing(int facing) { this.facing = facing; }

    public int getHealth() { return health; }
    public void setHealth(int health) { this.health = health; }

    public int getKills() { return kills; }
    public void setKills(int kills) { this.kills = kills; }

    public int getAssists() { return assists; }
    public void setAssists(int assists) { this.assists = assists; }

    public int getDeaths() { return deaths; }
    public void setDeaths(int deaths) { this.deaths = deaths; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public boolean isDead() { return dead; }
    public void setDead(boolean dead) { this.dead = dead; }
}
