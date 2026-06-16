package com.deadZone.shooterserver.model;

public class GameMessage {
    private String type;
    private String roomId;
    private String playerId;
    private String shooterId;
    private String name;
    private String team;
    private String weaponId;
    private String mapId;
    private int x;
    private int y;
    private double vx;
    private double vy;
    private int facing;
    private int health;
    private int damage;
    private int life;

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

    public String getMapId() { return mapId; }
    public void setMapId(String mapId) { this.mapId = mapId; }

    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

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
}
