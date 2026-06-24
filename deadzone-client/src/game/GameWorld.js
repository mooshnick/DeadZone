import * as THREE from 'three';
import { DEFAULT_GAME_MODE, MAX_PLAYERS, PLAYER_EYE_HEIGHT, POWERUPS, WEAPONS, WEAPON_SKINS } from './config';
import { makeBot, makePlayer } from './players';
import { InputController } from './input/InputController';
import { PlayerMeshFactory } from './rendering/PlayerMeshFactory';
import { ArenaBuilder } from './systems/ArenaBuilder';
import { BotSystem } from './systems/BotSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { CombatSystem } from './systems/CombatSystem';
import { GrenadeSystem } from './systems/GrenadeSystem';
import { PowerupSystem } from './systems/PowerupSystem';
import { PlayerCollisionSystem } from './systems/PlayerCollisionSystem';
import { RealtimeClient } from './network/RealtimeClient';
import { ArenaLayouts } from './world/ArenaLayouts';
import { clamp, nowMs } from './utils';

const MIN_LOOK_PITCH = -1.15;
const MAX_LOOK_PITCH = 1.18;
const TEAM_MODES = new Set(['team-deathmatch', 'capture-flag', 'attack-defend', 'circle-control']);
const WIN_BONUS = { score: 75, xp: 100, money: 20 };
const OBJECTIVE_REWARDS = {
  flagCapture: { score: 300, xp: 180, money: 30, label: 'flag capture' },
  flagReturn: { score: 120, xp: 75, money: 12, label: 'flag return' },
  circleCapture: { score: 140, xp: 80, money: 12, label: 'zone capture' },
  swordPlant: { score: 260, xp: 160, money: 28, label: 'successful attack' },
  swordDefense: { score: 170, xp: 100, money: 18, label: 'carrier defense' },
};

export class GameWorld {
  constructor({ canvas, config, localId, keys, mouse, onScoreChange, onBuffsChange, onAmmoChange, onDeathChange, onHealthChange, onWalletChange, onEvent, onScopeChange, onGrenadeChargeChange, onMatchEnd }) {
    this.canvas = canvas;
    this.config = config;
    this.localId = localId;
    this.keys = keys;
    this.mouse = mouse;
    this.onScoreChange = onScoreChange;
    this.onBuffsChange = onBuffsChange;
    this.onAmmoChange = onAmmoChange;
    this.onDeathChange = onDeathChange;
    this.onHealthChange = onHealthChange;
    this.onWalletChange = onWalletChange;
    this.onEvent = onEvent;
    this.onScopeChange = onScopeChange;
    this.onGrenadeChargeChange = onGrenadeChargeChange;
    this.onMatchEnd = onMatchEnd;
    this.onProgressChange = config.onProgressChange;

    this.mapIndex = Math.max(0, config.maps.findIndex((map) => map.id === config.mapId));
    this.selectedMap = config.maps[this.mapIndex] || config.maps[0];
    this.gameMode = config.gameMode || DEFAULT_GAME_MODE;
    this.maxPlayers = config.maxPlayers || MAX_PLAYERS;
    this.scoreLimit = config.scoreLimit || 30;
    this.timeLimitMinutes = Math.min(20, Math.max(5, config.timeLimitMinutes || 20));
    this.matchStartedAt = nowMs();
    this.matchEnded = false;
    this.matchResult = null;
    this.isPaused = false;
    this.pauseStartedAt = 0;
    this.keybinds = config.keybinds || {};
    this.blocks = ArenaLayouts.blocksFor(this.selectedMap);
    this.players = new Map();
    this.isScoped = false;
    this.scopeVisualProgress = 0;
    this.recoilOffset = { pitch: 0, yaw: 0 };

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.viewWeapon = null;
    this.viewWeaponKey = '';
    this.clock = null;
    this.frame = null;
    this.blockMeshes = [];
    this.objectiveObjects = [];
    this.objectiveState = this.createObjectiveState();

    this.inputController = null;
    this.collisionSystem = new CollisionSystem(this.blocks);
    this.combatSystem = null;
    this.powerupSystem = null;
    this.botSystem = null;
    this.grenadeSystem = null;
    this.playerCollisionSystem = null;
    this.qWasDown = false;
    this.grenadeChargeStartedAt = 0;
    this.grenadeCharge = 0;
    this.jumpWasDown = false;
    this.deathInputReleased = false;
    this.localDeathFocus = null;
    this.realtimeClient = null;
  }

  start() {
    this.setupRenderer();
    this.setupScene();
    this.setupSystems();
    this.addPlayers();
    this.setupRealtime();
    this.inputController.bind();
    this.animate();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.realtimeClient?.dispose();
    this.inputController?.dispose();
    this.renderer?.dispose();
    this.scene?.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 220);
    this.clock = new THREE.Clock();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.selectedMap.sky);
    this.scene.fog = new THREE.Fog(this.selectedMap.sky, 58, 120);
    this.scene.add(this.camera);
    this.blockMeshes = new ArenaBuilder(this.scene, this.selectedMap).build(this.blocks);
    this.setupObjectives();
  }

  createObjectiveState() {
    return {
      blue: 0,
      red: 0,
      message: '',
      flags: {
        blue: { base: new THREE.Vector3(-42, 1.4, 0), carrierId: null, atBase: true, droppedPosition: null },
        red: { base: new THREE.Vector3(42, 1.4, 0), carrierId: null, atBase: true, droppedPosition: null },
      },
      sword: {
        home: new THREE.Vector3(40, 1.4, -18),
        plant: new THREE.Vector3(-40, 1.2, 18),
        carrierId: null,
      },
      circles: [
        { id: 'A', position: new THREE.Vector3(-24, 1.05, -18), owner: null, capturingTeam: null, capture: 0 },
        { id: 'B', position: new THREE.Vector3(0, 1.05, 0), owner: null, capturingTeam: null, capture: 0 },
        { id: 'C', position: new THREE.Vector3(24, 1.05, 18), owner: null, capturingTeam: null, capture: 0 },
      ],
      scoreTick: 0,
    };
  }

  setupObjectives() {
    if (this.gameMode === 'capture-flag') {
      this.addObjectiveMarker(this.objectiveState.flags.blue.base, '#4aa8ff', 'flag', { team: 'blue' });
      this.addObjectiveMarker(this.objectiveState.flags.red.base, '#ff5d70', 'flag', { team: 'red' });
      this.objectiveState.message = 'Capture the enemy flag and bring it home';
    }
    if (this.gameMode === 'attack-defend') {
      this.addObjectiveMarker(this.objectiveState.sword.home, '#ff5d70', 'sword');
      this.addObjectiveMarker(this.objectiveState.sword.plant, '#4aa8ff', 'plant');
      this.objectiveState.message = 'Red carries the sword. Blue defends the plant zone';
    }
    if (this.gameMode === 'circle-control') {
      this.objectiveState.circles.forEach((circle) => {
        this.addObjectiveMarker(circle.position, '#53ff9a', 'circle', { id: circle.id });
      });
      this.objectiveState.message = 'Hold the circles to score points';
    }
  }

  addObjectiveMarker(position, color, kind, metadata = {}) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(kind === 'circle' ? 4.2 : 2.1, kind === 'circle' ? 5.2 : 2.9, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    if (kind === 'circle') {
      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(4, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.025;
      fill.scale.setScalar(0.05);
      group.add(fill);
      group.position.copy(position);
      this.scene.add(group);
      this.objectiveObjects.push({ group, fill, kind, color, position: position.clone(), ...metadata });
      return;
    }

    const pole = new THREE.Mesh(
      kind === 'sword' ? new THREE.BoxGeometry(0.22, 3.4, 0.22) : new THREE.CylinderGeometry(0.12, 0.12, 3.1, 10),
      new THREE.MeshBasicMaterial({ color }),
    );
    pole.position.y = 1.55;
    group.add(pole);

    const top = new THREE.Mesh(
      kind === 'plant' ? new THREE.BoxGeometry(2.2, 0.22, 2.2) : new THREE.BoxGeometry(1.25, 0.72, 0.12),
      new THREE.MeshBasicMaterial({ color }),
    );
    top.position.set(kind === 'plant' ? 0 : 0.58, kind === 'plant' ? 0.22 : 2.65, 0);
    group.add(top);

    group.position.copy(position);
    this.scene.add(group);
    this.objectiveObjects.push({ group, kind, color, position: position.clone(), ...metadata });
  }

  setupSystems() {
    this.combatSystem = new CombatSystem({
      scene: this.scene,
      players: this.players,
      localId: this.localId,
      collisionSystem: this.collisionSystem,
      gameMode: this.gameMode,
      onScoreChange: this.onScoreChange,
      onWalletChange: (player) => {
        if (player.id === this.localId) {
          this.onWalletChange?.(player.money);
        }
      },
      onProgressChange: (progress) => {
        if (progress.playerId === this.localId) {
          this.onProgressChange?.(progress);
        }
      },
      onEvent: this.onEvent,
      onRecoil: (player, weapon) => this.applyRecoil(player, weapon),
      onDamage: (hit) => this.reportHit(hit),
      onElimination: (shooter, target, time) => this.handleElimination(shooter, target, time),
    });
    this.powerupSystem = new PowerupSystem({
      scene: this.scene,
      players: this.players,
      onEvent: this.onEvent,
    });
    this.botSystem = new BotSystem({
      players: this.players,
      combatSystem: this.combatSystem,
      collisionSystem: this.collisionSystem,
      directionFromPlayer: (player) => this.directionFromPlayer(player),
      gameMode: this.gameMode,
      objectiveTargetFor: (player) => this.objectiveTargetFor(player),
    });
    this.grenadeSystem = new GrenadeSystem({
      scene: this.scene,
      players: this.players,
      combatSystem: this.combatSystem,
      collisionSystem: this.collisionSystem,
      gameMode: this.gameMode,
      onEvent: this.onEvent,
    });
    this.playerCollisionSystem = new PlayerCollisionSystem(this.players, this.collisionSystem);
    this.inputController = new InputController({
      canvas: this.canvas,
      keys: this.keys,
      mouse: this.mouse,
      onLook: (movementX, movementY) => this.look(movementX, movementY),
      onFire: () => this.fireLocalWeapon(),
      onScopeChange: (value) => this.setScoped(value),
    });
  }

  addPlayers() {
    this.addPlayer(makePlayer({
      id: this.localId,
      name: this.config.name,
      team: this.config.team,
      gameMode: this.gameMode,
      weaponId: this.config.weaponId,
      outfitId: this.config.outfitId,
      accessoryIds: this.config.accessoryIds,
      weaponSkinId: this.config.weaponSkinId,
      weaponLevel: this.config.weaponLevel || 0,
      mapId: this.config.mapId,
      money: this.config.money || 0,
    }));

    if (!this.config.allowBots) {
      return;
    }

    for (let index = 0; index < this.maxPlayers - 1; index += 1) {
      const botTeam = index % 2 === 0 ? (this.config.team === 'blue' ? 'red' : 'blue') : this.config.team;
      this.addPlayer(makeBot({ index, team: botTeam, gameMode: this.gameMode, mapId: this.config.mapId }));
    }
  }

  addPlayer(player) {
    const mesh = new PlayerMeshFactory(this.localId).create(player);
    mesh.position.copy(player.position);
    mesh.rotation.y = player.yaw;
    this.scene.add(mesh);
    this.players.set(player.id, player);
  }

  setupRealtime() {
    if (!this.config.roomId) {
      return;
    }
    const localPlayer = this.localPlayer();
    if (!localPlayer) {
      return;
    }
    this.realtimeClient = new RealtimeClient({
      localId: this.localId,
      roomId: this.config.roomId,
      onEvent: this.onEvent,
      onMessage: (message) => this.handleRealtimeMessage(message),
    });
    this.realtimeClient.connect(this.networkPayloadFor(localPlayer));
  }

  networkPayloadFor(player) {
    return {
      name: player.name,
      team: player.team,
      weaponId: player.weaponId,
      weaponSkinId: player.weaponSkinId,
      outfitId: player.outfitId,
      accessoryIds: player.accessoryIds || [],
      mapId: this.config.mapId,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      yaw: player.yaw,
      pitch: player.pitch,
      health: Math.round(player.health),
      dead: player.isDead,
      kills: player.kills,
      assists: player.assists,
      deaths: player.deaths,
      score: player.score,
    };
  }

  handleRealtimeMessage(message) {
    if (message.type === 'ERROR') {
      this.onEvent?.(message.message || 'Online room error');
      return;
    }
    if (message.type === 'STATE') {
      this.applyRealtimeState(message.players || []);
    }
  }

  applyRealtimeState(remotePlayers) {
    const seenIds = new Set();
    remotePlayers.forEach((remote, index) => {
      if (!remote?.id) {
        return;
      }
      seenIds.add(remote.id);
      if (remote.id === this.localId) {
        this.applyLocalServerState(remote);
        return;
      }
      let player = this.players.get(remote.id);
      if (!player) {
        player = makePlayer({
          id: remote.id,
          name: remote.name || 'Player',
          team: remote.team || 'blue',
          gameMode: this.gameMode,
          weaponId: remote.weaponId || 'rifle',
          outfitId: remote.outfitId || 'classic',
          accessoryIds: remote.accessoryIds || [],
          weaponSkinId: remote.weaponSkinId || 'standard',
          mapId: this.config.mapId,
          index,
        });
        this.addPlayer(player);
        this.onEvent?.(`${player.name} joined the arena`);
      }
      this.applyRemotePlayerState(player, remote);
    });

    for (const [id, player] of this.players.entries()) {
      if (id === this.localId || player.isBot || seenIds.has(id)) {
        continue;
      }
      this.scene.remove(player.mesh);
      this.players.delete(id);
      this.onEvent?.(`${player.name} left the arena`);
    }
  }

  applyLocalServerState(remote) {
    const player = this.localPlayer();
    if (!player) {
      return;
    }
    if (typeof remote.health === 'number' && remote.health < player.health) {
      player.health = Math.max(0, remote.health);
      this.onHealthChange?.(player.health);
      if (player.health <= 0 && !player.isDead) {
        player.kill(nowMs());
      }
    }
  }

  applyRemotePlayerState(player, remote) {
    const previousWeaponKey = `${player.weaponId}:${player.weaponSkinId}:${player.outfitId}:${(player.accessoryIds || []).join('|')}`;
    player.name = remote.name || player.name;
    player.team = remote.team || player.team;
    player.weaponId = remote.weaponId || player.weaponId;
    player.weaponSkinId = remote.weaponSkinId || player.weaponSkinId;
    player.outfitId = remote.outfitId || player.outfitId;
    player.accessoryIds = remote.accessoryIds || player.accessoryIds;
    player.health = typeof remote.health === 'number' ? remote.health : player.health;
    player.kills = remote.kills || 0;
    player.assists = remote.assists || 0;
    player.deaths = remote.deaths || 0;
    player.score = remote.score || 0;
    player.isDead = Boolean(remote.dead) || player.health <= 0;
    player.position.set(remote.x ?? player.position.x, remote.y ?? player.position.y, remote.z ?? player.position.z);
    player.velocity.set(0, 0, 0);
    player.yaw = remote.yaw ?? player.yaw;
    player.pitch = remote.pitch ?? player.pitch;

    const nextWeaponKey = `${player.weaponId}:${player.weaponSkinId}:${player.outfitId}:${(player.accessoryIds || []).join('|')}`;
    if (previousWeaponKey !== nextWeaponKey) {
      const previousMesh = player.mesh;
      const nextMesh = new PlayerMeshFactory(this.localId).create(player);
      nextMesh.position.copy(player.position);
      nextMesh.rotation.y = player.yaw;
      if (previousMesh) {
        this.scene.remove(previousMesh);
      }
      this.scene.add(nextMesh);
    }
  }

  updateLocalCosmetics({ accessoryIds, outfitId, weaponId, weaponLevel, weaponSkinId }) {
    const player = this.localPlayer();
    if (!player) return;
    player.outfitId = outfitId || player.outfitId;
    player.accessoryIds = accessoryIds || player.accessoryIds;
    player.weaponId = weaponId || player.weaponId;
    player.weaponLevel = weaponLevel ?? player.weaponLevel;
    player.weaponSkinId = weaponSkinId || player.weaponSkinId;
    if (weaponId || weaponSkinId) {
      this.viewWeaponKey = '';
    }
    if (weaponId) {
      player.isReloading = false;
      player.reloadEndsAt = 0;
      player.ammo = player.isDead ? player.weapon.magazineSize : Math.min(player.ammo, player.weapon.magazineSize);
    }
    const previousMesh = player.mesh;
    const nextMesh = new PlayerMeshFactory(this.localId).create(player);
    nextMesh.position.copy(player.position);
    nextMesh.rotation.copy(previousMesh?.rotation || nextMesh.rotation);
    nextMesh.visible = previousMesh?.visible ?? true;
    if (previousMesh) {
      this.scene.remove(previousMesh);
    }
    this.scene.add(nextMesh);
  }

  localPlayer() {
    return this.players.get(this.localId);
  }

  look(movementX, movementY) {
    const localPlayer = this.localPlayer();
    if (!localPlayer) return;
    localPlayer.yaw -= movementX * (this.isScoped ? 0.0011 : 0.0025);
    localPlayer.pitch = clamp(localPlayer.pitch - movementY * (this.isScoped ? 0.00085 : 0.0018), MIN_LOOK_PITCH, MAX_LOOK_PITCH);
  }

  setScoped(value) {
    this.isScoped = value;
    this.onScopeChange(value);
  }

  isSniperScoped() {
    const localPlayer = this.localPlayer();
    return this.isScoped && localPlayer?.weaponId === 'sniper';
  }

  fireLocalWeapon() {
    const player = this.localPlayer();
    if (!player || this.matchEnded) return;
    this.combatSystem.shoot(player, this.aimDirectionFromCrosshair(player), this.shotOriginForLocalWeapon(player));
  }

  reportHit({ shooterId, targetId, damage }) {
    if (shooterId !== this.localId || !this.realtimeClient || targetId === this.localId) {
      return;
    }
    this.realtimeClient.sendHit({
      shooterId,
      playerId: targetId,
      damage,
    });
  }

  applyRecoil(player, weapon) {
    if (player.id !== this.localId) {
      return;
    }
    const scopeControl = this.isScoped ? 0.55 : 1;
    const pitchKick = (weapon.recoilPitch || 0) * scopeControl;
    const yawKick = (Math.random() - 0.5) * (weapon.recoilYaw || 0) * scopeControl;
    this.recoilOffset.pitch = clamp(this.recoilOffset.pitch + pitchKick, 0, 0.34);
    this.recoilOffset.yaw = clamp(this.recoilOffset.yaw + yawKick, -0.28, 0.28);
    player.pitch = clamp(player.pitch + pitchKick, MIN_LOOK_PITCH, MAX_LOOK_PITCH);
    player.yaw += yawKick;
  }

  directionFromPlayer(player) {
    return new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch),
    ).normalize();
  }

  aimDirectionFromCrosshair(player) {
    return this.directionFromAngles(
      player.yaw + this.recoilOffset.yaw * 0.35,
      player.pitch + this.recoilOffset.pitch * 0.42,
    );
  }

  shotOriginForLocalWeapon(player) {
    if (!this.viewWeapon || player.weaponId === 'sniper') {
      return null;
    }
    const muzzleByWeapon = {
      shotgun: new THREE.Vector3(0, 0.05, -1.54),
      rpg: new THREE.Vector3(0, 0, -1.86),
      smg: new THREE.Vector3(0, 0.02, -1.08),
      blaster: new THREE.Vector3(0, 0, -1.42),
    };
    return this.viewWeapon.localToWorld((muzzleByWeapon[player.weaponId] || new THREE.Vector3(0, 0.02, -1.68)).clone());
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / Math.max(1, clientHeight);
    this.camera.fov = this.isSniperScoped() ? 24 : this.isScoped ? 42 : 70;
    this.camera.updateProjectionMatrix();
  }

  respawnLocal() {
    const player = this.localPlayer();
    if (!player || !player.isDead || nowMs() < player.respawnReadyAt) {
      return;
    }
    player.respawn();
    this.deathInputReleased = false;
    this.jumpWasDown = false;
    this.qWasDown = false;
    this.grenadeChargeStartedAt = 0;
    this.grenadeCharge = 0;
    this.onGrenadeChargeChange?.(0);
    this.localDeathFocus = null;
    this.onHealthChange?.(player.health);
    this.onDeathChange({ isDead: false, ready: false, seconds: 0, killerName: '', focusSeconds: 0 });
    this.onEvent('Back in the arena');
  }

  setPaused(value) {
    if (this.matchEnded || this.isPaused === value) return;
    const time = nowMs();
    this.isPaused = value;
    this.mouse.current.down = false;
    if (value) {
      this.pauseStartedAt = time;
      this.setScoped(false);
      document.exitPointerLock?.();
      return;
    }
    if (this.pauseStartedAt > 0) {
      this.matchStartedAt += time - this.pauseStartedAt;
    }
    this.pauseStartedAt = 0;
  }

  updateLocal(dt, time) {
    const player = this.localPlayer();
    if (!player) return;
    if (this.matchEnded) {
      this.mouse.current.down = false;
      return;
    }

    this.combatSystem.updateReload(player, time);
    const weapon = WEAPONS[player.weaponId] || WEAPONS.rifle;
    const recovery = (weapon.recoilRecovery || 0.016) * (this.isScoped ? 0.72 : 1);
    this.recoilOffset.pitch = Math.max(0, this.recoilOffset.pitch - recovery * dt * 60);
    if (Math.abs(this.recoilOffset.yaw) < 0.002) {
      this.recoilOffset.yaw = 0;
    } else {
      this.recoilOffset.yaw -= Math.sign(this.recoilOffset.yaw) * recovery * 0.65 * dt * 60;
    }
    if (this.keys.current.has(this.keybinds.reload || 'KeyR')) {
      this.combatSystem.startReload(player, time);
    }
    if (player.isDead) {
      if (!this.deathInputReleased) {
        document.exitPointerLock?.();
        this.mouse.current.down = false;
        this.setScoped(false);
        this.deathInputReleased = true;
        this.grenadeChargeStartedAt = 0;
        this.grenadeCharge = 0;
        this.onGrenadeChargeChange?.(0);
        this.qWasDown = false;
      }
      const remaining = Math.max(0, Math.ceil((player.respawnReadyAt - time) / 1000));
      const focusRemaining = Math.max(0, Math.ceil(((this.localDeathFocus?.until || 0) - time) / 1000));
      this.onDeathChange({
        isDead: true,
        ready: remaining === 0,
        seconds: remaining,
        killerName: this.localDeathFocus?.killerName || '',
        focusSeconds: focusRemaining,
      });
      return;
    }

    player.clearExpiredBuffs(time);
    const jumpDown = this.keys.current.has(this.keybinds.jump || 'Space');
    if (jumpDown && !this.jumpWasDown && player.isGrounded) {
      this.collisionSystem.jump(player);
    }
    this.jumpWasDown = jumpDown;
    const qDown = this.keys.current.has(this.keybinds.grenade || 'KeyQ');
    if (qDown && !this.qWasDown) {
      this.grenadeChargeStartedAt = time;
    }
    if (qDown) {
      this.grenadeCharge = Math.min(1, Math.max(0, (time - this.grenadeChargeStartedAt) / 950));
      this.onGrenadeChargeChange?.(this.grenadeCharge);
    }
    if (!qDown && this.qWasDown) {
      const chargeMs = Math.min(950, Math.max(0, time - this.grenadeChargeStartedAt));
      const charge = chargeMs / 950;
      this.grenadeSystem.throw(player, this.directionFromPlayer(player), charge);
      this.grenadeChargeStartedAt = 0;
      this.grenadeCharge = 0;
      this.onGrenadeChargeChange?.(0);
    }
    this.qWasDown = qDown;
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const wish = new THREE.Vector3();
    if (this.keys.current.has(this.keybinds.forward || 'KeyW')) wish.add(forward);
    if (this.keys.current.has(this.keybinds.backward || 'KeyS')) wish.sub(forward);
    if (this.keys.current.has(this.keybinds.right || 'KeyD')) wish.add(right);
    if (this.keys.current.has(this.keybinds.left || 'KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();
    const speed = player.buffs.speed ? 21 : 15;
    player.isGrounded = this.collisionSystem.move(player.position, player.velocity, wish.multiplyScalar(speed * dt), dt);
    if (this.selectedMap.hazard === 'lava' && player.position.y <= 1.35 && !this.collisionSystem.isOnRaisedBlock(player.position)) {
      player.kill(time);
      this.localDeathFocus = null;
      this.onHealthChange?.(0);
      this.onDeathChange?.({ isDead: true, ready: false, seconds: 5, killerName: '', focusSeconds: 0 });
      this.onEvent('You fell into the lava');
    }
    if (this.mouse.current.down) {
      this.fireLocalWeapon();
    }
  }

  syncMeshes() {
    for (const player of this.players.values()) {
      player.mesh.position.copy(player.position);
      player.mesh.rotation.y = player.yaw;
      player.mesh.scale.set(1, 1, 1);
      if (player.id === this.localId) {
        player.mesh.visible = false;
        continue;
      }
      if (!player.isDead && nowMs() < player.invulnerableUntil) {
        player.mesh.visible = Math.floor(nowMs() / 150) % 2 === 0;
      } else if (!player.isDead) {
        player.mesh.visible = true;
      }
      if (player.healthFill) {
        player.healthFill.scale.x = clamp(player.health / 100, 0, 1);
      }
      if (player.healthBar) {
        player.healthBar.lookAt(this.camera.position);
      }
    }
    this.syncCamera();
    this.syncOccluders();
    this.syncHud();
  }

  syncOccluders() {
    const localPlayer = this.localPlayer();
    if (!localPlayer || this.selectedMap.theme !== 'castle') {
      return;
    }
    this.blockMeshes.forEach((mesh) => {
      const block = mesh.userData.block;
      if (!block || (!block.kind?.includes('floor') && !block.kind?.includes('roof'))) {
        return;
      }
      const abovePlayer = block.y > localPlayer.position.y + 2 && block.y < localPlayer.position.y + 9.5;
      const playerUnderBlock = Math.abs(localPlayer.position.x - block.x) < block.w / 2 + 3
        && Math.abs(localPlayer.position.z - block.z) < block.d / 2 + 3;
      const cameraUnderOrNear = this.camera.position.y < block.y + block.h / 2 + 1.2;
      const shouldFade = abovePlayer && playerUnderBlock && cameraUnderOrNear;
      mesh.material.transparent = shouldFade;
      mesh.material.opacity = shouldFade ? 0.16 : mesh.userData.baseOpacity;
      mesh.material.depthWrite = !shouldFade;
    });
  }

  syncCamera() {
    const localPlayer = this.localPlayer();
    if (!localPlayer) {
      return;
    }
    if (localPlayer.isDead && this.syncDeathFocusCamera()) {
      this.updateFirstPersonWeapon(localPlayer);
      return;
    }
    const eyePosition = localPlayer.position.clone().add(new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0));
    const lookDirection = this.directionFromAngles(
      localPlayer.yaw + this.recoilOffset.yaw * 0.35,
      localPlayer.pitch + this.recoilOffset.pitch * 0.42,
    );
    this.camera.position.copy(eyePosition);
    this.camera.lookAt(eyePosition.clone().add(lookDirection.multiplyScalar(10)));
    this.updateFirstPersonWeapon(localPlayer);
  }

  syncDeathFocusCamera() {
    const time = nowMs();
    const killer = this.localDeathFocus?.killerId ? this.players.get(this.localDeathFocus.killerId) : null;
    if (!killer || killer.isDead || time > this.localDeathFocus.until) {
      return false;
    }
    const localPlayer = this.localPlayer();
    const killerHead = killer.position.clone().add(new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0));
    const fromKillerToVictim = localPlayer.position.clone().sub(killer.position);
    if (fromKillerToVictim.lengthSq() < 0.01) {
      fromKillerToVictim.set(Math.sin(killer.yaw), 0, Math.cos(killer.yaw));
    }
    const cameraOffset = fromKillerToVictim.normalize().multiplyScalar(8).add(new THREE.Vector3(0, 3.2, 0));
    this.camera.position.copy(killer.position.clone().add(cameraOffset));
    this.camera.lookAt(killerHead);
    return true;
  }

  updateFirstPersonWeapon(localPlayer) {
    if (!this.camera || !localPlayer || localPlayer.isDead) {
      this.scopeVisualProgress = 0;
      if (this.viewWeapon) {
        this.viewWeapon.visible = false;
      }
      return;
    }

    const weaponSkin = WEAPON_SKINS.find((item) => item.id === localPlayer.weaponSkinId) || WEAPON_SKINS[0];
    const weaponKey = `${localPlayer.weaponId}:${weaponSkin.id}`;
    if (this.viewWeaponKey !== weaponKey) {
      if (this.viewWeapon) {
        this.camera.remove(this.viewWeapon);
      }
      this.viewWeapon = new PlayerMeshFactory(this.localId).createWeapon(localPlayer.weaponId, weaponSkin.color);
      this.viewWeapon.scale.setScalar(0.48);
      this.viewWeapon.rotation.set(-0.08, 0.18, 0.02);
      this.viewWeapon.traverse((object) => {
        if (!object.isMesh) return;
        object.frustumCulled = false;
        object.castShadow = false;
        object.receiveShadow = false;
        object.renderOrder = 20;
        if (object.material) {
          object.material.depthTest = false;
          object.material.depthWrite = false;
        }
      });
      this.camera.add(this.viewWeapon);
      this.viewWeaponKey = weaponKey;
    }

    const targetProgress = this.isScoped ? 1 : 0;
    this.scopeVisualProgress += (targetProgress - this.scopeVisualProgress) * 0.22;
    const aim = this.scopeVisualProgress * this.scopeVisualProgress * (3 - 2 * this.scopeVisualProgress);
    const pose = this.firstPersonWeaponPose(localPlayer.weaponId);
    const bob = localPlayer.isGrounded ? Math.sin(nowMs() * 0.008) * 0.012 * (1 - aim) : 0;
    this.viewWeapon.visible = true;
    this.viewWeapon.position.set(
      THREE.MathUtils.lerp(pose.hip.position.x, pose.aim.position.x, aim),
      THREE.MathUtils.lerp(pose.hip.position.y, pose.aim.position.y, aim) + bob,
      THREE.MathUtils.lerp(pose.hip.position.z, pose.aim.position.z, aim),
    );
    this.viewWeapon.rotation.set(
      THREE.MathUtils.lerp(pose.hip.rotation.x, pose.aim.rotation.x, aim),
      THREE.MathUtils.lerp(pose.hip.rotation.y, pose.aim.rotation.y, aim),
      THREE.MathUtils.lerp(pose.hip.rotation.z, pose.aim.rotation.z, aim),
    );
    this.viewWeapon.scale.setScalar(THREE.MathUtils.lerp(pose.hip.scale, pose.aim.scale, aim));
  }

  firstPersonWeaponPose(weaponId) {
    const poses = {
      sniper: {
        hip: { position: new THREE.Vector3(0.54, -0.43, -1.12), rotation: new THREE.Euler(-0.08, 0.18, 0.02), scale: 0.48 },
        aim: { position: new THREE.Vector3(0.015, -0.39, -0.74), rotation: new THREE.Euler(-0.01, 0, 0), scale: 0.58 },
      },
      shotgun: {
        hip: { position: new THREE.Vector3(0.58, -0.45, -1.0), rotation: new THREE.Euler(-0.08, 0.2, 0.025), scale: 0.49 },
        aim: { position: new THREE.Vector3(0.02, -0.27, -0.72), rotation: new THREE.Euler(-0.015, 0.006, 0), scale: 0.58 },
      },
      rpg: {
        hip: { position: new THREE.Vector3(0.76, -0.5, -1.22), rotation: new THREE.Euler(-0.09, 0.18, 0.02), scale: 0.46 },
        aim: { position: new THREE.Vector3(0.08, -0.31, -0.86), rotation: new THREE.Euler(-0.02, 0.005, 0), scale: 0.54 },
      },
    };
    return poses[weaponId] || {
      hip: { position: new THREE.Vector3(0.56, -0.43, -1.02), rotation: new THREE.Euler(-0.08, 0.18, 0.02), scale: 0.48 },
      aim: { position: new THREE.Vector3(0.015, -0.26, -0.72), rotation: new THREE.Euler(-0.012, 0.004, 0), scale: 0.58 },
    };
  }

  directionFromAngles(yaw, pitch) {
    return new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
  }

  livingPlayers() {
    return [...this.players.values()].filter((player) => !player.isDead && player.health > 0);
  }

  teamColor(team) {
    return team === 'blue' ? '#4aa8ff' : '#ff5d70';
  }

  objectiveTargetFor(player) {
    if (this.gameMode === 'capture-flag') {
      const enemyTeam = player.team === 'blue' ? 'red' : 'blue';
      const enemyFlag = this.objectiveState.flags[enemyTeam];
      return enemyFlag.carrierId === player.id
        ? this.objectiveState.flags[player.team].base
        : enemyFlag.base;
    }
    if (this.gameMode === 'attack-defend') {
      if (player.team === 'red') {
        return this.objectiveState.sword.carrierId === player.id
          ? this.objectiveState.sword.plant
          : this.objectiveState.sword.home;
      }
      const carrier = this.objectiveState.sword.carrierId
        ? this.players.get(this.objectiveState.sword.carrierId)
        : null;
      return carrier?.position || this.objectiveState.sword.plant;
    }
    if (this.gameMode === 'circle-control') {
      return this.objectiveState.circles
        .filter((circle) => circle.owner !== player.team)
        .sort((a, b) => a.position.distanceTo(player.position) - b.position.distanceTo(player.position))[0]?.position || null;
    }
    return null;
  }

  updateObjectives(time, dt) {
    if (this.matchEnded) return;
    if (this.gameMode === 'capture-flag') {
      this.updateCaptureFlag();
    }
    if (this.gameMode === 'attack-defend') {
      this.updateAttackDefend();
    }
    if (this.gameMode === 'circle-control') {
      this.updateCircleControl(time, dt);
    }
    this.syncObjectiveVisuals(time);
  }

  syncObjectiveVisuals(time) {
    for (const objective of this.objectiveObjects) {
      if (objective.kind === 'flag') {
        const flag = this.objectiveState.flags[objective.team];
        const carrier = flag.carrierId ? this.players.get(flag.carrierId) : null;
        objective.group.position.copy(carrier
          ? carrier.position.clone().add(new THREE.Vector3(0, 2.8, 0))
          : flag.droppedPosition || flag.base);
      }
      if (objective.kind === 'sword') {
        const carrier = this.objectiveState.sword.carrierId
          ? this.players.get(this.objectiveState.sword.carrierId)
          : null;
        objective.group.position.copy(carrier
          ? carrier.position.clone().add(new THREE.Vector3(0, 2.7, 0))
          : this.objectiveState.sword.home);
      }
      if (objective.kind === 'circle') {
        const circle = this.objectiveState.circles.find((item) => item.id === objective.id);
        const activeTeam = circle?.capturingTeam || circle?.owner;
        const color = activeTeam ? this.teamColor(activeTeam) : '#53ff9a';
        objective.group.children.forEach((child) => child.material?.color?.set(color));
        const fillAmount = circle?.owner && !circle?.capturingTeam ? 1 : Math.max(0.02, (circle?.capture || 0) / 100);
        objective.fill?.scale.setScalar(fillAmount);
        if (objective.fill?.material) {
          objective.fill.material.opacity = circle?.capturingTeam ? 0.62 : circle?.owner ? 0.4 : 0.2;
        }
      }
      objective.group.rotation.y = Math.sin(time * 0.0015) * 0.08;
    }
  }

  updateCaptureFlag() {
    const { flags } = this.objectiveState;
    for (const player of this.livingPlayers()) {
      const enemyTeam = player.team === 'blue' ? 'red' : 'blue';
      const ownFlag = flags[player.team];
      const enemyFlag = flags[enemyTeam];
      if (!ownFlag.atBase && !ownFlag.carrierId && ownFlag.droppedPosition && player.position.distanceTo(ownFlag.droppedPosition) < 3.2) {
        ownFlag.atBase = true;
        ownFlag.droppedPosition = null;
        this.awardObjective(player, OBJECTIVE_REWARDS.flagReturn);
        this.objectiveState.message = `${player.name} returned the ${player.team} flag`;
        this.onEvent?.(this.objectiveState.message);
      }
      const enemyFlagPosition = enemyFlag.droppedPosition || enemyFlag.base;
      if (!enemyFlag.carrierId && player.position.distanceTo(enemyFlagPosition) < 3.2) {
        enemyFlag.carrierId = player.id;
        enemyFlag.atBase = false;
        enemyFlag.droppedPosition = null;
        this.objectiveState.message = `${player.name} took the ${enemyTeam} flag`;
        this.onEvent?.(this.objectiveState.message);
      }
      if (enemyFlag.carrierId === player.id && ownFlag.atBase && player.position.distanceTo(ownFlag.base) < 4) {
        this.objectiveState[player.team] += 1;
        enemyFlag.carrierId = null;
        enemyFlag.atBase = true;
        enemyFlag.droppedPosition = null;
        this.awardObjective(player, OBJECTIVE_REWARDS.flagCapture);
        this.objectiveState.message = `${player.name} captured the flag`;
        this.onEvent?.(`${player.name} scored for ${player.team}`);
      }
    }

    for (const team of ['blue', 'red']) {
      const flag = flags[team];
      const carrier = flag.carrierId ? this.players.get(flag.carrierId) : null;
      if (carrier?.isDead) {
        flag.droppedPosition = carrier.position.clone();
        flag.carrierId = null;
        flag.atBase = false;
        this.objectiveState.message = `${team} flag dropped`;
      }
    }
  }

  updateAttackDefend() {
    const sword = this.objectiveState.sword;
    const carrier = sword.carrierId ? this.players.get(sword.carrierId) : null;
    if (carrier?.isDead || carrier?.team !== 'red') {
      sword.carrierId = null;
    }

    for (const player of this.livingPlayers()) {
      if (player.team === 'red' && !sword.carrierId && player.position.distanceTo(sword.home) < 3.2) {
        sword.carrierId = player.id;
        this.objectiveState.message = `${player.name} picked up the sword`;
        this.onEvent?.(this.objectiveState.message);
      }
      if (sword.carrierId === player.id && player.position.distanceTo(sword.plant) < 4.2) {
        this.objectiveState.red += 1;
        sword.carrierId = null;
        this.awardObjective(player, OBJECTIVE_REWARDS.swordPlant);
        this.objectiveState.message = `${player.name} planted the sword`;
        this.onEvent?.('Red attackers scored');
      }
    }
  }

  updateCircleControl(time, dt) {
    for (const circle of this.objectiveState.circles) {
      const inside = this.livingPlayers().filter((player) => player.position.distanceTo(circle.position) < 6.2);
      const blue = inside.filter((player) => player.team === 'blue').length;
      const red = inside.filter((player) => player.team === 'red').length;
      if (blue === red) continue;
      const owner = blue > red ? 'blue' : 'red';
      if (circle.capturingTeam !== owner) {
        circle.capturingTeam = owner;
        circle.capture = 0;
      }
      circle.capture = clamp(circle.capture + dt * 35, 0, 100);
      if (circle.capture >= 100 && circle.owner !== owner) {
        circle.owner = owner;
        circle.capturingTeam = null;
        circle.capture = 0;
        this.objectiveState.message = `${owner} captured circle ${circle.id}`;
        this.onEvent?.(this.objectiveState.message);
        inside.filter((player) => player.team === owner).forEach((player) => {
          this.awardObjective(player, OBJECTIVE_REWARDS.circleCapture);
        });
      }
    }

    if (time - this.objectiveState.scoreTick > 1000) {
      this.objectiveState.scoreTick = time;
      for (const circle of this.objectiveState.circles) {
        if (circle.owner) {
          this.objectiveState[circle.owner] += 1;
        }
      }
    }
  }

  syncHud() {
    const localPlayer = this.localPlayer();
    const killScoreBlue = [...this.players.values()].filter((player) => player.team === 'blue').reduce((sum, player) => sum + player.kills, 0);
    const killScoreRed = [...this.players.values()].filter((player) => player.team === 'red').reduce((sum, player) => sum + player.kills, 0);
    const usesObjectiveScore = TEAM_MODES.has(this.gameMode) && this.gameMode !== 'team-deathmatch';
    const ffaLeader = [...this.players.values()].sort((a, b) => b.score - a.score)[0];
    this.onScoreChange({
      blue: usesObjectiveScore ? this.objectiveState.blue : killScoreBlue,
      red: usesObjectiveScore ? this.objectiveState.red : killScoreRed,
      mode: this.gameMode,
      target: this.scoreLimit,
      remainingSeconds: this.remainingSeconds(),
      ended: this.matchEnded,
      objective: this.gameMode === 'free-for-all'
        ? `Leader: ${ffaLeader?.name || 'None'}`
        : this.objectiveState.message,
      players: [...this.players.values()]
        .map((player) => ({
          id: player.id,
          name: player.name,
          team: player.team,
          kills: player.kills,
          assists: player.assists,
          deaths: player.deaths,
          score: player.score,
          money: player.money,
        }))
        .sort((a, b) => b.score - a.score),
    });
    this.onBuffsChange(Object.keys(localPlayer.buffs).map((buff) => POWERUPS[buff].short).join(' / ') || 'No buffs');
    this.onHealthChange?.(Math.round(localPlayer.health));
    const weapon = WEAPONS[localPlayer.weaponId] || WEAPONS.rifle;
    this.onAmmoChange({
      ammo: localPlayer.ammo,
      magazineSize: weapon.magazineSize,
      reloading: localPlayer.isReloading,
      reloadProgress: localPlayer.isReloading ? clamp(1 - ((localPlayer.reloadEndsAt - nowMs()) / weapon.reloadTime), 0, 1) : 1,
      grenades: localPlayer.grenades,
      money: localPlayer.money,
    });
  }

  animate() {
    const dt = Math.min(0.033, this.clock.getDelta());
    const time = nowMs();
    this.resize();
    if (!this.isPaused) {
      this.updateLocal(dt, time);
      this.sendRealtimeMove(time);
    }
    if (!this.matchEnded && !this.isPaused) {
      this.botSystem.update(dt, time);
      this.playerCollisionSystem.resolve();
      this.combatSystem.updateBullets();
      this.powerupSystem.update(time);
      this.grenadeSystem.update(time, dt);
      this.updateObjectives(time, dt);
      this.checkMatchEnd(time);
    }
    this.syncMeshes();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }

  sendRealtimeMove(time) {
    const player = this.localPlayer();
    if (!player || !this.realtimeClient) {
      return;
    }
    this.realtimeClient.sendMove(this.networkPayloadFor(player), time);
  }

  handleElimination(shooter, target, time) {
    if (target.id === this.localId) {
      this.localDeathFocus = {
        killerId: shooter.id,
        killerName: shooter.name,
        until: time + 5000,
      };
      this.onHealthChange?.(0);
      this.onDeathChange?.({
        isDead: true,
        ready: false,
        seconds: 5,
        killerName: shooter.name,
        focusSeconds: 5,
      });
    }
    this.handleObjectiveElimination(shooter, target);
  }

  handleObjectiveElimination(shooter, target) {
    if (this.gameMode !== 'attack-defend' || target.id !== this.objectiveState.sword.carrierId || shooter.team !== 'blue') {
      return;
    }
    this.objectiveState.blue += 1;
    this.objectiveState.sword.carrierId = null;
    this.awardObjective(shooter, OBJECTIVE_REWARDS.swordDefense);
    this.objectiveState.message = `${shooter.name} stopped the sword carrier`;
    this.onEvent?.('Blue defenders scored by eliminating the carrier');
  }

  awardObjective(player, reward) {
    player.score += reward.score;
    player.money += reward.money;
    this.combatSystem?.onWalletChange?.(player);
    this.combatSystem?.onProgressChange?.({
      playerId: player.id,
      xp: reward.xp,
      reason: reward.label,
      weaponId: player.weaponId,
      wallet: player.money,
    });
    this.onEvent?.(`${player.name}: ${reward.label} +🪙 ${reward.money} +${reward.xp} XP`);
  }

  remainingSeconds() {
    const durationMs = this.timeLimitMinutes * 60 * 1000;
    return Math.max(0, Math.ceil((durationMs - (nowMs() - this.matchStartedAt)) / 1000));
  }

  currentScores() {
    if (this.gameMode === 'free-for-all') {
      const leader = [...this.players.values()].sort((a, b) => b.kills - a.kills || b.score - a.score)[0];
      return { blue: 0, red: 0, leader, highScore: leader?.kills || 0 };
    }
    if (this.gameMode === 'team-deathmatch') {
      return {
        blue: [...this.players.values()].filter((player) => player.team === 'blue').reduce((sum, player) => sum + player.kills, 0),
        red: [...this.players.values()].filter((player) => player.team === 'red').reduce((sum, player) => sum + player.kills, 0),
      };
    }
    return { blue: this.objectiveState.blue, red: this.objectiveState.red };
  }

  checkMatchEnd(time) {
    if (this.matchEnded) return;
    const scores = this.currentScores();
    const reachedTarget = this.gameMode === 'free-for-all'
      ? scores.highScore >= this.scoreLimit
      : scores.blue >= this.scoreLimit || scores.red >= this.scoreLimit;
    const timedOut = this.remainingSeconds() <= 0;
    if (!reachedTarget && !timedOut) return;

    let winner = null;
    if (this.gameMode === 'free-for-all') {
      winner = scores.leader?.id || null;
    } else if (scores.blue !== scores.red) {
      winner = scores.blue > scores.red ? 'blue' : 'red';
    }
    this.finishMatch(winner, timedOut ? 'Time limit reached' : 'Score target reached', time);
  }

  finishMatch(winner, reason) {
    this.matchEnded = true;
    this.mouse.current.down = false;
    document.exitPointerLock?.();
    const localPlayer = this.localPlayer();
    const localWon = this.gameMode === 'free-for-all'
      ? winner === localPlayer?.id
      : winner === localPlayer?.team;
    if (localWon && localPlayer) {
      this.awardObjective(localPlayer, { ...WIN_BONUS, label: 'match victory' });
    }
    const winnerName = this.gameMode === 'free-for-all'
      ? this.players.get(winner)?.name
      : winner ? `${winner === 'blue' ? 'Blue' : 'Red'} Team` : null;
    this.matchResult = {
      winner,
      winnerName: winnerName || 'Draw',
      reason,
      localWon,
    };
    this.onMatchEnd?.(this.matchResult);
    this.onEvent?.(`${this.matchResult.winnerName} won. ${reason}`);
  }
}
