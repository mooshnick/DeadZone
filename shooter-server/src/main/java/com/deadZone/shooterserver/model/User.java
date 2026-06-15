package com.deadZone.shooterserver.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "total_kills")
    private int totalKills;

    public User() {}

    public User(String username, String password) {
        this.username = username;
        this.password = password;
        this.totalKills = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public int getTotalKills() { return totalKills; }
    public void setTotalKills(int totalKills) { this.totalKills = totalKills; }
}