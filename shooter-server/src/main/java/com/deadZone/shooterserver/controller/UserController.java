package com.deadZone.shooterserver.controller;

import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().isBlank() || user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Username and password are required.");
        }
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken!");
        }

        User savedUser = userRepository.save(new User(user.getUsername(), user.getPassword()));
        return ResponseEntity.ok(UserResponse.from(savedUser));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser) {
        User existingUser = userRepository.findByUsername(loginUser.getUsername()).orElse(null);

        if (existingUser != null && existingUser.getPassword().equals(loginUser.getPassword())) {
            return ResponseEntity.ok(UserResponse.from(existingUser));
        }

        return ResponseEntity.status(401).body("Invalid username or password!");
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserResponse.from(user)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<?> updateProgress(@PathVariable Long id, @RequestBody ProgressRequest request) {
        return userRepository.findById(id)
                .<ResponseEntity<?>>map(user -> {
                    if (request.wallet() != null) {
                        user.setWallet(Math.max(0, request.wallet()));
                    }
                    if (request.xp() != null) {
                        user.setXp(Math.max(0, request.xp()));
                    }
                    if (request.outfitId() != null && !request.outfitId().isBlank()) {
                        user.setOutfitId(request.outfitId());
                    }
                    if (request.weaponSkinId() != null && !request.weaponSkinId().isBlank()) {
                        user.setWeaponSkinId(request.weaponSkinId());
                    }
                    if (request.ownedOutfits() != null && !request.ownedOutfits().isEmpty()) {
                        user.setOwnedOutfits(String.join(",", request.ownedOutfits()));
                    }
                    if (request.ownedWeaponSkins() != null && !request.ownedWeaponSkins().isEmpty()) {
                        user.setOwnedWeaponSkins(String.join(",", request.ownedWeaponSkins()));
                    }
                    if (request.weaponUpgrades() != null) {
                        user.setWeaponUpgrades(request.weaponUpgrades().entrySet().stream()
                                .map(entry -> entry.getKey() + ":" + entry.getValue())
                                .collect(Collectors.joining(",")));
                    }
                    return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record ProgressRequest(Integer wallet, Integer xp, String outfitId, String weaponSkinId, List<String> ownedOutfits, List<String> ownedWeaponSkins, Map<String, Integer> weaponUpgrades) {}

    public record UserResponse(Long id, String username, int totalKills, int wallet, int xp, String outfitId, String weaponSkinId, List<String> ownedOutfits, List<String> ownedWeaponSkins, Map<String, Integer> weaponUpgrades) {
        public static UserResponse from(User user) {
            String owned = user.getOwnedOutfits() == null || user.getOwnedOutfits().isBlank()
                    ? "classic"
                    : user.getOwnedOutfits();
            String weaponSkins = user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isBlank()
                    ? "standard"
                    : user.getOwnedWeaponSkins();
            Map<String, Integer> upgrades = user.getWeaponUpgrades() == null || user.getWeaponUpgrades().isBlank()
                    ? Map.of()
                    : Arrays.stream(user.getWeaponUpgrades().split(","))
                    .filter(item -> item.contains(":"))
                    .map(item -> item.split(":"))
                    .collect(Collectors.toMap(parts -> parts[0], parts -> Integer.parseInt(parts[1]), (a, b) -> b));
            return new UserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getTotalKills(),
                    user.getWallet(),
                    user.getXp(),
                    user.getOutfitId() == null ? "classic" : user.getOutfitId(),
                    user.getWeaponSkinId() == null ? "standard" : user.getWeaponSkinId(),
                    Arrays.stream(owned.split(",")).filter(item -> !item.isBlank()).toList(),
                    Arrays.stream(weaponSkins.split(",")).filter(item -> !item.isBlank()).toList(),
                    upgrades
            );
        }
    }
}
