package com.deadZone.shooterserver.model;

public class Player {
    private String id;
    private String name;
    private String team;
    private String weaponId;
    private int x;
    private int y;
    private int facing;
    private int health;
    private int kills;
    private int deaths;

    public Player() {}

    public Player(String id, String name, String team, String weaponId, int x, int y, int facing) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.weaponId = weaponId;
        this.x = x;
        this.y = y;
        this.facing = facing;
        this.health = 100;
        this.kills = 0;
        this.deaths = 0;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTeam() { return team; }
    public void setTeam(String team) { this.team = team; }

    public String getWeaponId() { return weaponId; }
    public void setWeaponId(String weaponId) { this.weaponId = weaponId; }

    public int getX() { return x; }
    public void setX(int x) { this.x = x; }

    public int getY() { return y; }
    public void setY(int y) { this.y = y; }

    public int getFacing() { return facing; }
    public void setFacing(int facing) { this.facing = facing; }

    public int getHealth() { return health; }
    public void setHealth(int health) { this.health = health; }

    public int getKills() { return kills; }
    public void setKills(int kills) { this.kills = kills; }

    public int getDeaths() { return deaths; }
    public void setDeaths(int deaths) { this.deaths = deaths; }
}
