package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.AuthResponse;
import com.deadZone.shooterserver.dto.LoginRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
import com.deadZone.shooterserver.dto.RegisterRequest;
import com.deadZone.shooterserver.dto.UserResponse;
import com.deadZone.shooterserver.model.User;
import com.deadZone.shooterserver.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository, PasswordService passwordService, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        validateRegistration(request);
        String username = request.username().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken!");
        }

        User user = new User(username, request.email().trim(), passwordService.hash(request.password()));
        user = userRepository.save(user);
        return authResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        validateLogin(request);
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!"));

        if (!passwordService.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!");
        }
        upgradePasswordHashIfNeeded(user, request.password());
        return authResponse(user);
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
            user.setOwnedOutfits(String.join(",", request.ownedOutfits()));
        }
        if (request.ownedWeaponSkins() != null && !request.ownedWeaponSkins().isEmpty()) {
            user.setOwnedWeaponSkins(String.join(",", request.ownedWeaponSkins()));
        }
        if (request.ownedGrenadeSkins() != null && !request.ownedGrenadeSkins().isEmpty()) {
            user.setOwnedGrenadeSkins(String.join(",", request.ownedGrenadeSkins()));
        }
        if (request.ownedAccessories() != null) {
            user.setOwnedAccessories(String.join(",", request.ownedAccessories()));
        }
        if (request.accessoryIds() != null) {
            user.setAccessoryIds(String.join(",", request.accessoryIds()));
        }
        if (request.weaponUpgrades() != null) {
            user.setWeaponUpgrades(request.weaponUpgrades().entrySet().stream()
                    .map(entry -> entry.getKey() + ":" + entry.getValue())
                    .collect(Collectors.joining(",")));
        }
        if (request.missionStats() != null) {
            user.setMissionStats(request.missionStats());
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
        user.setWallet(User.ADMIN_WALLET);
        user.setXp(User.ADMIN_XP);
        user.setOutfitId(User.ALL_OUTFITS.split(",")[4]);
        user.setWeaponId("rpg");
        user.setWeaponSkinId("goldline");
        user.setOwnedOutfits(User.ALL_OUTFITS);
        user.setOwnedWeaponSkins(User.ALL_WEAPON_SKINS);
        user.setGrenadeSkinId("royal");
        user.setOwnedGrenadeSkins(User.ALL_GRENADE_SKINS);
        user.setOwnedAccessories(User.ALL_ACCESSORIES);
        user.setAccessoryIds("crown,shades,tail-neon,boots-speed");
        user.setWeaponUpgrades(User.MAX_WEAPON_UPGRADES);
        user.setMissionStats("");
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
        if (user.getOwnedOutfits() == null || user.getOwnedOutfits().isBlank()) {
            user.setOwnedOutfits(User.DEFAULT_OUTFIT_ID);
            changed = true;
        }
        if (user.getOwnedWeaponSkins() == null || user.getOwnedWeaponSkins().isBlank()) {
            user.setOwnedWeaponSkins(User.DEFAULT_WEAPON_SKIN_ID);
            changed = true;
        }
        if (user.getWeaponUpgrades() == null) {
            user.setWeaponUpgrades("");
            changed = true;
        }
        if (user.getGrenadeSkinId() == null || user.getGrenadeSkinId().isBlank()) {
            user.setGrenadeSkinId(User.DEFAULT_GRENADE_SKIN_ID);
            changed = true;
        }
        if (user.getOwnedGrenadeSkins() == null || user.getOwnedGrenadeSkins().isBlank()) {
            user.setOwnedGrenadeSkins(User.DEFAULT_GRENADE_SKIN_ID);
            changed = true;
        }
        if (user.getOwnedAccessories() == null) {
            user.setOwnedAccessories("");
            changed = true;
        }
        if (user.getAccessoryIds() == null) {
            user.setAccessoryIds("");
            changed = true;
        }
        if (user.getMissionStats() == null) {
            user.setMissionStats("");
            changed = true;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(user.getUsername() + "@deadzone.local");
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
}
