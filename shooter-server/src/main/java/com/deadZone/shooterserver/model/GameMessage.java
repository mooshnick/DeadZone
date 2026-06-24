package com.deadZone.shooterserver.model;

public class GameMessage {
    private String type;
    private String roomId;
    private String playerId;
    private String shooterId;
    private String name;
    private String team;
    private String weaponId;
    private String weaponSkinId;
    private String outfitId;
    private String mapId;
    private java.util.List<String> accessoryIds;
    private double x;
    private double y;
    private double z;
    private double yaw;
    private double pitch;
    private double vx;
    private double vy;
    private int facing;
    private int health;
    private int damage;
    private int life;
    private boolean dead;
    private int kills;
    private int assists;
    private int deaths;
    private int score;

    public GameMessage() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getShooterId() { return shooterId; }
    public void setShooterId(String shooterId) { this.shooterId = shooterId; }

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

    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

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

    public double getVx() { return vx; }
    public void setVx(double vx) { this.vx = vx; }

    public double getVy() { return vy; }
    public void setVy(double vy) { this.vy = vy; }

    public int getFacing() { return facing; }
    public void setFacing(int facing) { this.facing = facing; }

    public int getHealth() { return health; }
    public void setHealth(int health) { this.health = health; }

    public int getDamage() { return damage; }
    public void setDamage(int damage) { this.damage = damage; }

    public int getLife() { return life; }
    public void setLife(int life) { this.life = life; }

    public boolean isDead() { return dead; }
    public void setDead(boolean dead) { this.dead = dead; }

    public int getKills() { return kills; }
    public void setKills(int kills) { this.kills = kills; }

    public int getAssists() { return assists; }
    public void setAssists(int assists) { this.assists = assists; }

    public int getDeaths() { return deaths; }
    public void setDeaths(int deaths) { this.deaths = deaths; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
}
