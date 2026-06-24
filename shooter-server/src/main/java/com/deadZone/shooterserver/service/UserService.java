package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.AuthResponse;
import com.deadZone.shooterserver.dto.LoginRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
import com.deadZone.shooterserver.dto.RegisterRequest;
import com.deadZone.shooterserver.dto.UserResponse;
import com.deadZone.shooterserver.dto.VerifyEmailRequest;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final EmailVerificationService emailVerificationService;
    private final ObjectMapper objectMapper;

    public UserService(
            UserRepository userRepository,
            PasswordService passwordService,
            JwtService jwtService,
            EmailVerificationService emailVerificationService,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.emailVerificationService = emailVerificationService;
        this.objectMapper = objectMapper;
    }

    public AuthResponse register(RegisterRequest request) {
        validateRegistration(request);
        String username = request.username().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken!");
        }
        String email = request.email().trim().toLowerCase();

        User user = new User(username, email, passwordService.hash(request.password()));
        user = userRepository.save(user);
        emailVerificationService.sendVerification(user);
        return new AuthResponse(null, UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        validateLogin(request);
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!"));

        if (!passwordService.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!");
        }
        if (!user.isEmailVerified()) {
            emailVerificationService.sendVerification(user);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email before logging in. We sent you a new 6-digit code.");
        }
        upgradePasswordHashIfNeeded(user, request.password());
        return authResponse(user);
    }

    public UserResponse verifyEmail(VerifyEmailRequest request) {
        User user = emailVerificationService.verify(request == null ? null : request.email(), request == null ? null : request.code());
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        return UserResponse.from(userRepository.save(user));
    }

    public UserResponse getUser(Long id) {
        return userRepository.findById(id)
                .map(UserResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found."));
    }

    public UserResponse updateProgress(Long id, ProgressRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found."));

        if (request.wallet() != null && !user.isAdmin()) {
            user.setWallet(Math.max(0, request.wallet()));
        }
        if (request.xp() != null && !user.isAdmin()) {
            user.setXp(Math.max(0, request.xp()));
        }
        if (request.totalKills() != null) {
            user.setTotalKills(Math.max(user.getTotalKills(), request.totalKills()));
        }
        if (request.totalAssists() != null) {
            user.setTotalAssists(Math.max(user.getTotalAssists(), request.totalAssists()));
        }
        if (request.totalDeaths() != null) {
            user.setTotalDeaths(Math.max(user.getTotalDeaths(), request.totalDeaths()));
        }
        if (request.outfitId() != null && !request.outfitId().isBlank()) {
            user.setOutfitId(request.outfitId());
        }
        if (request.weaponId() != null && !request.weaponId().isBlank()) {
            user.setWeaponId(request.weaponId());
        }
        if (request.weaponSkinId() != null && !request.weaponSkinId().isBlank()) {
            user.setWeaponSkinId(request.weaponSkinId());
        }
        if (request.grenadeSkinId() != null && !request.grenadeSkinId().isBlank()) {
            user.setGrenadeSkinId(request.grenadeSkinId());
        }
        if (request.ownedOutfits() != null && !request.ownedOutfits().isEmpty()) {
            user.setOwnedOutfits(request.ownedOutfits());
        }
        if (request.ownedWeaponSkins() != null && !request.ownedWeaponSkins().isEmpty()) {
            user.setOwnedWeaponSkins(request.ownedWeaponSkins());
        }
        if (request.ownedGrenadeSkins() != null && !request.ownedGrenadeSkins().isEmpty()) {
            user.setOwnedGrenadeSkins(request.ownedGrenadeSkins());
        }
        if (request.ownedAccessories() != null) {
            user.setOwnedAccessories(request.ownedAccessories());
        }
        if (request.accessoryIds() != null) {
            user.setAccessoryIds(request.accessoryIds());
        }
        if (request.weaponUpgrades() != null) {
            user.setWeaponUpgrades(request.weaponUpgrades());
        }
        if (request.missionStats() != null) {
            applyMissionStats(user, request.missionStats());
        }
        enforceAdminBenefits(user);
        return UserResponse.from(userRepository.save(user));
    }

    public User repairUserDefaults(User user) {
        boolean changed = applyMissingDefaults(user);
        if (!passwordService.isHashed(user.getPassword())) {
            user.setPassword(passwordService.hash(user.getPassword()));
            changed = true;
        }
        enforceAdminBenefits(user);
        return changed ? userRepository.save(user) : user;
    }

    public User seedAdminUser(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> new User(username, "test@deadzone.local", passwordService.hash(password)));
        if (!passwordService.matches(password, user.getPassword()) || !passwordService.isHashed(user.getPassword())) {
            user.setPassword(passwordService.hash(password));
        }
        user.setAdmin(true);
        user.setEmailVerified(true);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        user.setWallet(User.ADMIN_WALLET);
        user.setXp(User.ADMIN_XP);
        user.setOutfitId(User.ALL_OUTFITS.split(",")[4]);
        user.setWeaponId("rpg");
        user.setWeaponSkinId("goldline");
        user.setOwnedOutfits(csv(User.ALL_OUTFITS));
        user.setOwnedWeaponSkins(csv(User.ALL_WEAPON_SKINS));
        user.setGrenadeSkinId("royal");
        user.setOwnedGrenadeSkins(csv(User.ALL_GRENADE_SKINS));
        user.setOwnedAccessories(csv(User.ALL_ACCESSORIES));
        user.setAccessoryIds(csv("crown,shades,tail-neon,boots-speed"));
        user.setWeaponUpgrades(weaponUpgradeMap(User.MAX_WEAPON_UPGRADES));
        user.setClaimedMissions(java.util.List.of());
        user.setMapPlays(Map.of());
        user.setWeaponKills(Map.of());
        user.setMissionStatsJson("");
        return userRepository.save(user);
    }

    private void validateRegistration(RegisterRequest request) {
        if (request == null
                || request.username() == null
                || request.username().isBlank()
                || request.email() == null
                || request.email().isBlank()
                || request.password() == null
                || request.password().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username, email and password are required.");
        }
    }

    private void validateLogin(LoginRequest request) {
        if (request == null
                || request.username() == null
                || request.username().isBlank()
                || request.password() == null
                || request.password().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required.");
        }
    }

    private AuthResponse authResponse(User user) {
        return new AuthResponse(jwtService.createToken(user.getId(), user.getUsername()), UserResponse.from(user));
    }

    private void upgradePasswordHashIfNeeded(User user, String password) {
        if (!passwordService.isHashed(user.getPassword())) {
            user.setPassword(passwordService.hash(password));
            userRepository.save(user);
        }
    }

    private boolean applyMissingDefaults(User user) {
        boolean changed = false;
        if (user.getOutfitId() == null || user.getOutfitId().isBlank()) {
            user.setOutfitId(User.DEFAULT_OUTFIT_ID);
            changed = true;
        }
        if (user.getWeaponId() == null || user.getWeaponId().isBlank()) {
            user.setWeaponId(User.DEFAULT_WEAPON_ID);
            changed = true;
        }
        if (user.getWeaponSkinId() == null || user.getWeaponSkinId().isBlank()) {
            user.setWeaponSkinId(User.DEFAULT_WEAPON_SKIN_ID);
            changed = true;
        }
        if (user.getOwnedOutfits() == null || user.getOwnedOutfits().isEmpty()) {
            user.setOwnedOutfits(csv(User.DEFAULT_OUTFIT_ID));
            changed = true;
        }
        if (user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isEmpty()) {
            user.setOwnedWeaponSkins(csv(User.DEFAULT_WEAPON_SKIN_ID));
            changed = true;
        }
        if (user.getWeaponUpgrades() == null) {
            user.setWeaponUpgrades(Map.of());
            changed = true;
        }
        if (user.getGrenadeSkinId() == null || user.getGrenadeSkinId().isBlank()) {
            user.setGrenadeSkinId(User.DEFAULT_GRENADE_SKIN_ID);
            changed = true;
        }
        if (user.getOwnedGrenadeSkins() == null || user.getOwnedGrenadeSkins().isEmpty()) {
            user.setOwnedGrenadeSkins(csv(User.DEFAULT_GRENADE_SKIN_ID));
            changed = true;
        }
        if (user.getOwnedAccessories() == null) {
            user.setOwnedAccessories(java.util.List.of());
            changed = true;
        }
        if (user.getAccessoryIds() == null) {
            user.setAccessoryIds(java.util.List.of());
            changed = true;
        }
        if (user.getClaimedMissions() == null) {
            user.setClaimedMissions(java.util.List.of());
            changed = true;
        }
        if (user.getMapPlays() == null) {
            user.setMapPlays(Map.of());
            changed = true;
        }
        if (user.getWeaponKills() == null) {
            user.setWeaponKills(Map.of());
            changed = true;
        }
        if (user.getMissionStatsJson() == null) {
            user.setMissionStatsJson("");
            changed = true;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(user.getUsername() + "@deadzone.local");
            changed = true;
        }
        if (user.isAdmin() && !user.isEmailVerified()) {
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(Instant.now());
            changed = true;
        }
        return changed;
    }

    private void enforceAdminBenefits(User user) {
        if (user.isAdmin()) {
            user.setWallet(Math.max(user.getWallet(), User.ADMIN_WALLET));
            user.setXp(Math.max(user.getXp(), User.ADMIN_XP));
        }
    }

    private java.util.List<String> csv(String value) {
        if (value == null || value.isBlank()) {
            return java.util.List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private Map<String, Integer> weaponUpgradeMap(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        return Arrays.stream(value.split(","))
                .filter(item -> item.contains(":"))
                .map(item -> item.split(":", 2))
                .collect(Collectors.toMap(parts -> parts[0], parts -> Integer.parseInt(parts[1]), (a, b) -> b));
    }

    private void applyMissionStats(User user, String missionStats) {
        if (missionStats.isBlank()) {
            user.setClaimedMissions(java.util.List.of());
            user.setMapPlays(Map.of());
            user.setWeaponKills(Map.of());
            user.setMissionStatsJson("");
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(missionStats);
            java.util.List<String> claimed = new ArrayList<>();
            if (root.path("claimed").isArray()) {
                root.path("claimed").forEach(item -> {
                    if (item.isTextual() && !item.asText().isBlank()) {
                        claimed.add(item.asText());
                    }
                });
            }
            user.setClaimedMissions(claimed);
            user.setMapPlays(intMap(root.path("mapPlays")));
            user.setWeaponKills(intMap(root.path("weaponKills")));
            user.setMissionStatsJson(missionStats);
        } catch (Exception ignored) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mission stats are invalid.");
        }
    }

    private Map<String, Integer> intMap(JsonNode node) {
        Map<String, Integer> values = new LinkedHashMap<>();
        if (!node.isObject()) {
            return values;
        }
        node.fields().forEachRemaining(entry -> {
            if (!entry.getKey().isBlank() && entry.getValue().canConvertToInt()) {
                values.put(entry.getKey(), Math.max(0, entry.getValue().asInt()));
            }
        });
        return values;
    }
}
