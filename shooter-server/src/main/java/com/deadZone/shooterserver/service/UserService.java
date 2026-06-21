package com.deadZone.shooterserver.service;

import com.deadZone.shooterserver.dto.AuthRequest;
import com.deadZone.shooterserver.dto.ProgressRequest;
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

    public UserService(UserRepository userRepository, PasswordService passwordService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
    }

    public UserResponse register(AuthRequest request) {
        validateCredentials(request);
        String username = request.username().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken!");
        }

        User user = new User(username, passwordService.hash(request.password().trim()));
        return UserResponse.from(userRepository.save(user));
    }

    public UserResponse login(AuthRequest request) {
        validateCredentials(request);
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!"));

        if (!passwordService.matches(request.password().trim(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password!");
        }
        upgradePasswordHashIfNeeded(user, request.password().trim());
        return UserResponse.from(user);
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
        User user = userRepository.findByUsername(username).orElseGet(() -> new User(username, passwordService.hash(password)));
        if (!passwordService.matches(password, user.getPassword()) || !passwordService.isHashed(user.getPassword())) {
            user.setPassword(passwordService.hash(password));
        }
        user.setAdmin(true);
        user.setWallet(User.ADMIN_WALLET);
        user.setXp(User.ADMIN_XP);
        user.setOutfitId(User.ALL_OUTFITS.split(",")[4]);
        user.setWeaponSkinId("goldline");
        user.setOwnedOutfits(User.ALL_OUTFITS);
        user.setOwnedWeaponSkins(User.ALL_WEAPON_SKINS);
        user.setWeaponUpgrades(User.MAX_WEAPON_UPGRADES);
        return userRepository.save(user);
    }

    private void validateCredentials(AuthRequest request) {
        if (request == null
                || request.username() == null
                || request.username().isBlank()
                || request.password() == null
                || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required.");
        }
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
        return changed;
    }

    private void enforceAdminBenefits(User user) {
        if (user.isAdmin()) {
            user.setWallet(Math.max(user.getWallet(), User.ADMIN_WALLET));
            user.setXp(Math.max(user.getXp(), User.ADMIN_XP));
        }
    }
}
