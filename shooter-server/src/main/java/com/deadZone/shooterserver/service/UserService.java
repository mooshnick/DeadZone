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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final EmailVerificationService emailVerificationService;
    private final ObjectMapper objectMapper;
    private final StoreCatalog storeCatalog;

    public UserService(
            UserRepository userRepository,
            PasswordService passwordService,
            JwtService jwtService,
            EmailVerificationService emailVerificationService,
            ObjectMapper objectMapper,
            StoreCatalog storeCatalog
    ) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.emailVerificationService = emailVerificationService;
        this.objectMapper = objectMapper;
        this.storeCatalog = storeCatalog;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateRegistration(request);
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        var existingUser = userRepository.findByUsername(username);
        if (existingUser.isPresent() && !existingUser.get().isEmailVerified() && email.equalsIgnoreCase(existingUser.get().getEmail())) {
            User user = existingUser.get();
            user.setPassword(passwordService.hash(request.password()));
            boolean verificationEmailSent = emailVerificationService.sendVerification(user);
            return new AuthResponse(null, UserResponse.from(userRepository.save(user)), verificationEmailSent);
        }
        if (existingUser.isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken!");
        }

        User user = new User(username, email, passwordService.hash(request.password()));
        user = userRepository.save(user);
        boolean verificationEmailSent = emailVerificationService.sendVerification(user);
        return new AuthResponse(null, UserResponse.from(user), verificationEmailSent);
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

    @Transactional
    public UserResponse updateProgress(Long id, ProgressRequest request) {
        User user = userRepository.findLockedById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found."));

        int purchaseCost = validateAndCalculatePurchaseCost(user, request);
        applyEconomyUpdate(user, request, purchaseCost);
        if (request.totalKills() != null) {
            requireBoundedIncrease(user.getTotalKills(), request.totalKills(), 20, "kills");
            user.setTotalKills(Math.max(user.getTotalKills(), request.totalKills()));
        }
        if (request.totalAssists() != null) {
            requireBoundedIncrease(user.getTotalAssists(), request.totalAssists(), 20, "assists");
            user.setTotalAssists(Math.max(user.getTotalAssists(), request.totalAssists()));
        }
        if (request.totalDeaths() != null) {
            requireBoundedIncrease(user.getTotalDeaths(), request.totalDeaths(), 20, "deaths");
            user.setTotalDeaths(Math.max(user.getTotalDeaths(), request.totalDeaths()));
        }
        if (request.outfitId() != null && isOwned(user.getOwnedOutfits(), request.ownedOutfits(), request.outfitId())) {
            user.setOutfitId(request.outfitId());
        }
        if (request.weaponId() != null && storeCatalog.isWeapon(request.weaponId())) {
            user.setWeaponId(request.weaponId());
        }
        if (request.weaponSkinId() != null && isOwned(user.getOwnedWeaponSkins(), request.ownedWeaponSkins(), request.weaponSkinId())) {
            user.setWeaponSkinId(request.weaponSkinId());
        }
        if (request.grenadeSkinId() != null && isOwned(user.getOwnedGrenadeSkins(), request.ownedGrenadeSkins(), request.grenadeSkinId())) {
            user.setGrenadeSkinId(request.grenadeSkinId());
        }
        if (request.ownedOutfits() != null && !request.ownedOutfits().isEmpty()) {
            user.setOwnedOutfits(merge(user.getOwnedOutfits(), request.ownedOutfits()));
        }
        if (request.ownedWeaponSkins() != null && !request.ownedWeaponSkins().isEmpty()) {
            user.setOwnedWeaponSkins(merge(user.getOwnedWeaponSkins(), request.ownedWeaponSkins()));
        }
        if (request.ownedGrenadeSkins() != null && !request.ownedGrenadeSkins().isEmpty()) {
            user.setOwnedGrenadeSkins(merge(user.getOwnedGrenadeSkins(), request.ownedGrenadeSkins()));
        }
        if (request.ownedAccessories() != null) {
            user.setOwnedAccessories(merge(user.getOwnedAccessories(), request.ownedAccessories()));
        }
        if (request.accessoryIds() != null) {
            List<String> effectiveAccessories = merge(user.getOwnedAccessories(), request.ownedAccessories() == null ? List.of() : request.ownedAccessories());
            List<String> equipped = request.accessoryIds().stream()
                    .filter(effectiveAccessories::contains)
                    .filter(storeCatalog::isAccessory)
                    .toList();
            user.setAccessoryIds(equipped);
        }
        if (request.weaponUpgrades() != null) {
            Map<String, Integer> mergedUpgrades = new LinkedHashMap<>(user.getWeaponUpgrades());
            request.weaponUpgrades().forEach((weapon, level) -> {
                if (storeCatalog.isWeapon(weapon) && level != null) {
                    mergedUpgrades.put(weapon, Math.max(mergedUpgrades.getOrDefault(weapon, 0), Math.min(10, level)));
                }
            });
            user.setWeaponUpgrades(mergedUpgrades);
        }
        if (request.missionStats() != null) {
            applyMissionStats(user, request.missionStats());
        }
        enforceAdminBenefits(user);
        return UserResponse.from(userRepository.save(user));
    }

    private int validateAndCalculatePurchaseCost(User user, ProgressRequest request) {
        try {
            int cost = addedCost(user.getOwnedOutfits(), request.ownedOutfits(), storeCatalog::outfitPrice);
            cost += addedCost(user.getOwnedWeaponSkins(), request.ownedWeaponSkins(), storeCatalog::weaponSkinPrice);
            cost += addedCost(user.getOwnedGrenadeSkins(), request.ownedGrenadeSkins(), storeCatalog::grenadeSkinPrice);
            cost += addedCost(user.getOwnedAccessories(), request.ownedAccessories(), storeCatalog::accessoryPrice);
            if (request.weaponUpgrades() != null) {
                for (var entry : request.weaponUpgrades().entrySet()) {
                    if (!storeCatalog.isWeapon(entry.getKey()) || entry.getValue() == null) {
                        throw new IllegalArgumentException("Unknown weapon upgrade.");
                    }
                    int current = user.getWeaponUpgrades().getOrDefault(entry.getKey(), 0);
                    int requested = Math.min(10, Math.max(0, entry.getValue()));
                    for (int level = current; level < requested; level += 1) {
                        cost += storeCatalog.upgradePrice(level);
                    }
                }
            }
            return cost;
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage());
        }
    }

    private void applyEconomyUpdate(User user, ProgressRequest request, int purchaseCost) {
        if (user.isAdmin()) return;
        if (request.wallet() != null) {
            int requestedWallet = Math.max(0, request.wallet());
            if (purchaseCost > 0 && requestedWallet != user.getWallet() - purchaseCost) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase total does not match the server catalog.");
            }
            int walletIncrease = requestedWallet - user.getWallet();
            if (purchaseCost == 0 && walletIncrease > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet reward is larger than an allowed match update.");
            }
            user.setWallet(requestedWallet);
        } else if (purchaseCost > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet total is required for a purchase.");
        }
        if (request.xp() != null) {
            int requestedXp = Math.max(0, request.xp());
            if (requestedXp - user.getXp() > 1_000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "XP reward is larger than an allowed match update.");
            }
            user.setXp(Math.max(user.getXp(), requestedXp));
        }
    }

    private int addedCost(List<String> owned, List<String> requested, java.util.function.ToIntFunction<String> price) {
        if (requested == null) return 0;
        Set<String> existing = new HashSet<>(owned);
        return requested.stream().filter(item -> !existing.contains(item)).distinct().mapToInt(price).sum();
    }

    private List<String> merge(List<String> existing, List<String> requested) {
        Set<String> merged = new java.util.LinkedHashSet<>(existing);
        merged.addAll(requested);
        return new ArrayList<>(merged);
    }

    private boolean isOwned(List<String> existing, List<String> requested, String itemId) {
        return existing.contains(itemId) || (requested != null && requested.contains(itemId));
    }

    private void requireBoundedIncrease(int current, int requested, int maximumDelta, String label) {
        if (requested - current > maximumDelta) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many " + label + " were submitted in one update.");
        }
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
        return new AuthResponse(jwtService.createToken(user.getId(), user.getUsername()), UserResponse.from(user), false);
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
