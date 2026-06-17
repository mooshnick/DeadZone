import * as THREE from 'three';
import { MAX_PLAYERS, POWERUPS, WEAPONS } from './config';
import { makeBot, makePlayer } from './players';
import { InputController } from './input/InputController';
import { PlayerMeshFactory } from './rendering/PlayerMeshFactory';
import { ArenaBuilder } from './systems/ArenaBuilder';
import { BotSystem } from './systems/BotSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { CombatSystem } from './systems/CombatSystem';
import { GrenadeSystem } from './systems/GrenadeSystem';
import { PowerupSystem } from './systems/PowerupSystem';
import { ArenaLayouts } from './world/ArenaLayouts';
import { clamp, nowMs } from './utils';

const MIN_LOOK_PITCH = -1.15;
const MAX_LOOK_PITCH = 1.18;

export class GameWorld {
  constructor({ canvas, config, localId, keys, mouse, onScoreChange, onBuffsChange, onAmmoChange, onDeathChange, onWalletChange, onEvent, onScopeChange }) {
    this.canvas = canvas;
    this.config = config;
    this.localId = localId;
    this.keys = keys;
    this.mouse = mouse;
    this.onScoreChange = onScoreChange;
    this.onBuffsChange = onBuffsChange;
    this.onAmmoChange = onAmmoChange;
    this.onDeathChange = onDeathChange;
    this.onWalletChange = onWalletChange;
    this.onEvent = onEvent;
    this.onScopeChange = onScopeChange;
    this.onProgressChange = config.onProgressChange;

    this.mapIndex = Math.max(0, config.maps.findIndex((map) => map.id === config.mapId));
    this.selectedMap = config.maps[this.mapIndex] || config.maps[0];
    this.maxPlayers = config.maxPlayers || MAX_PLAYERS;
    this.keybinds = config.keybinds || {};
    this.blocks = ArenaLayouts.blocksFor(this.selectedMap);
    this.players = new Map();
    this.isScoped = false;
    this.recoilOffset = { pitch: 0, yaw: 0 };

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.frame = null;
    this.blockMeshes = [];

    this.inputController = null;
    this.collisionSystem = new CollisionSystem(this.blocks);
    this.combatSystem = null;
    this.powerupSystem = null;
    this.botSystem = null;
    this.grenadeSystem = null;
    this.qWasDown = false;
    this.jumpWasDown = false;
    this.deathInputReleased = false;
  }

  start() {
    this.setupRenderer();
    this.setupScene();
    this.setupSystems();
    this.addPlayers();
    this.inputController.bind();
    this.animate();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
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
    this.blockMeshes = new ArenaBuilder(this.scene, this.selectedMap).build(this.blocks);
  }

  setupSystems() {
    this.combatSystem = new CombatSystem({
      scene: this.scene,
      players: this.players,
      localId: this.localId,
      collisionSystem: this.collisionSystem,
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
    });
    this.grenadeSystem = new GrenadeSystem({
      scene: this.scene,
      players: this.players,
      combatSystem: this.combatSystem,
      collisionSystem: this.collisionSystem,
      onEvent: this.onEvent,
    });
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
      weaponId: this.config.weaponId,
      outfitId: this.config.outfitId,
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
      this.addPlayer(makeBot({ index, team: botTeam, mapId: this.config.mapId }));
    }
  }

  addPlayer(player) {
    const mesh = new PlayerMeshFactory(this.localId).create(player);
    mesh.position.copy(player.position);
    mesh.rotation.y = player.yaw;
    this.scene.add(mesh);
    this.players.set(player.id, player);
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

  fireLocalWeapon() {
    const player = this.localPlayer();
    if (!player) return;
    this.combatSystem.shoot(player, this.aimDirectionFromCrosshair(player));
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
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    const muzzle = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const target = this.camera.position.clone().add(cameraDirection.multiplyScalar(140));
    return target.sub(muzzle).normalize();
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / Math.max(1, clientHeight);
    this.camera.fov = this.isScoped ? 42 : 70;
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
    this.onDeathChange({ isDead: false, ready: false, seconds: 0 });
    this.onEvent('Back in the arena');
  }

  updateLocal(dt, time) {
    const player = this.localPlayer();
    if (!player) return;

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
      }
      const remaining = Math.max(0, Math.ceil((player.respawnReadyAt - time) / 1000));
      this.onDeathChange({ isDead: true, ready: remaining === 0, seconds: remaining });
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
      this.grenadeSystem.throw(player, this.directionFromPlayer(player));
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
    const cameraTarget = localPlayer.position.clone().add(new THREE.Vector3(0, 1.75, 0));
    const lookDirection = this.directionFromAngles(
      localPlayer.yaw + this.recoilOffset.yaw * 0.35,
      localPlayer.pitch + this.recoilOffset.pitch * 0.42,
    );
    const cameraDistance = this.isScoped ? -4.6 : -8;
    const cameraHeight = this.isScoped ? 2.45 : 4.2;
    const cameraOffset = lookDirection.clone().multiplyScalar(cameraDistance).add(new THREE.Vector3(0, cameraHeight, 0));
    const desiredCamera = cameraTarget.clone().add(cameraOffset);
    for (let step = 0; step < 8 && this.collisionSystem.hitsSolid(desiredCamera); step += 1) {
      desiredCamera.lerp(cameraTarget, 0.22);
      desiredCamera.y += 0.18;
    }
    this.camera.position.lerp(desiredCamera, 0.22);
    this.camera.lookAt(cameraTarget.clone().add(lookDirection.multiplyScalar(10)));
  }

  directionFromAngles(yaw, pitch) {
    return new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
  }

  syncHud() {
    const localPlayer = this.localPlayer();
    this.onScoreChange({
      blue: [...this.players.values()].filter((player) => player.team === 'blue').reduce((sum, player) => sum + player.kills, 0),
      red: [...this.players.values()].filter((player) => player.team === 'red').reduce((sum, player) => sum + player.kills, 0),
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
    this.updateLocal(dt, time);
    this.botSystem.update(dt, time);
    this.combatSystem.updateBullets();
    this.powerupSystem.update(time);
    this.grenadeSystem.update(time, dt);
    this.syncMeshes();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }
}
