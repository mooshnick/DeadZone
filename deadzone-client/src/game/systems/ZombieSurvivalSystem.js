import * as THREE from 'three';
import { FLOOR_Y, PLAYER_RADIUS } from '../config';
import { clamp, nowMs } from '../utils';

const RECALL_RADIUS = 5.2;
const TAG_PICKUP_RADIUS = 2.4;
const ZOMBIE_HIT_RADIUS = 1.45;
const FIRE_RADIUS = 7.4;
const FIRE_DURATION_MS = 5600;
const FIRE_DAMAGE_PER_SECOND = 42;
const WAVE_INTERVAL_MS = 6500;

const ZOMBIE_TYPES = {
  small: { name: 'Small Zombie', hp: 38, speed: 11.2, damage: 8, cooldown: 850, score: 25, radius: 0.72, height: 1.55, color: '#75a44d', weight: 4 },
  normal: { name: 'Zombie', hp: 72, speed: 7.7, damage: 16, cooldown: 1050, score: 45, radius: 0.95, height: 2.05, color: '#527c3e', weight: 5 },
  tank: { name: 'Tank Zombie', hp: 210, speed: 4.3, damage: 36, cooldown: 1450, score: 120, radius: 1.35, height: 2.85, color: '#385a32', weight: 1 },
};

const SPAWNER_DEFS = [
  { id: 'north', position: new THREE.Vector3(-96, FLOOR_Y, -102), hp: 520 },
  { id: 'east', position: new THREE.Vector3(106, FLOOR_Y, 16), hp: 520 },
  { id: 'south', position: new THREE.Vector3(-72, FLOOR_Y, 104), hp: 520 },
];

const ALLY_BOT_RANGE = 54;
const ALLY_BOT_SHOOT_RANGE = 42;

export class ZombieSurvivalSystem {
  constructor({ scene, players, combatSystem, collisionSystem, localId, camera, onEvent, onHealthChange, onDeathChange, onScoreChange, onMatchEnd, revivePlayer }) {
    this.scene = scene;
    this.players = players;
    this.combatSystem = combatSystem;
    this.collisionSystem = collisionSystem;
    this.localId = localId;
    this.camera = camera;
    this.onEvent = onEvent;
    this.onHealthChange = onHealthChange;
    this.onDeathChange = onDeathChange;
    this.onScoreChange = onScoreChange;
    this.onMatchEnd = onMatchEnd;
    this.revivePlayer = revivePlayer;

    this.recallCenter = new THREE.Vector3(0, FLOOR_Y, 0);
    this.zombies = [];
    this.fireZones = [];
    this.recallTags = new Map();
    this.carriedRecallTags = new Map();
    this.spawners = [];
    this.lastWaveAt = 0;
    this.lastHudAt = 0;
    this.ended = false;
    this.setupWorld();
  }

  setupWorld() {
    this.createRecallCenter();
    this.spawners = SPAWNER_DEFS.map((definition) => this.createSpawner(definition));
  }

  createRecallCenter() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 4.1, 2.2, 18),
      new THREE.MeshStandardMaterial({ color: '#2d3b46', roughness: 0.7 }),
    );
    base.position.y = 1.1;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.1, 10, 16),
      new THREE.MeshStandardMaterial({ color: '#74808c', roughness: 0.55 }),
    );
    tower.position.y = 7;
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#dff8ff' }),
    );
    antenna.position.y = 16;
    const beacon = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: '#75f7ff', transparent: true, opacity: 0.75 }),
    );
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.08;
    group.add(base, tower, antenna, beacon);
    group.position.copy(this.recallCenter);
    group.userData.blocksBullets = true;
    this.scene.add(group);
  }

  createSpawner(definition) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(8, 5.5, 8),
      new THREE.MeshStandardMaterial({ color: '#2c3a2a', roughness: 0.86 }),
    );
    body.position.y = 2.75;
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 3.2, 0.18),
      new THREE.MeshBasicMaterial({ color: '#71ff5e', transparent: true, opacity: 0.42 }),
    );
    gate.position.set(0, 1.9, -4.12);
    const healthBar = this.createHealthBar(7.2, 0.56, '#58e59a');
    healthBar.position.set(0, 6.45, 0);
    group.add(body, gate, healthBar);
    group.position.copy(definition.position);
    group.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    this.scene.add(group);
    return { ...definition, hp: definition.hp, maxHp: definition.hp, alive: true, group, healthBar, healthFill: healthBar.userData.fill };
  }

  createHealthBar(width = 2.25, height = 0.28, color = '#58e59a') {
    const bar = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: '#101722', transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.48),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    fill.geometry.translate(width * 0.45, 0, 0);
    fill.position.set(-width * 0.45, 0, 0.01);
    bar.add(frame, fill);
    bar.userData.fill = fill;
    return bar;
  }

  update(dt, time, nightRemainingSeconds) {
    if (this.ended) return;
    this.ensureDownedPlayersHaveTags();
    this.spawnWave(time);
    this.updateZombies(dt, time);
    this.updateFireZones(dt, time);
    this.updateBullets();
    this.updateRecallTags(time);
    this.updateAlliedBots(dt, time);
    this.checkEndState(nightRemainingSeconds);
    this.updateHud(time, nightRemainingSeconds);
  }

  ensureDownedPlayersHaveTags() {
    for (const player of this.players.values()) {
      if (!player.isDead) continue;
      player.respawnReadyAt = Number.POSITIVE_INFINITY;
      if (this.isTagCarried(player.id)) continue;
      this.createRecallTag(player);
    }
  }

  spawnWave(time) {
    if (time - this.lastWaveAt < WAVE_INTERVAL_MS) return;
    this.lastWaveAt = time;
    this.spawners.filter((spawner) => spawner.alive).forEach((spawner) => {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let index = 0; index < count; index += 1) {
        const type = this.pickZombieType();
        const offset = new THREE.Vector3((Math.random() - 0.5) * 7, 0, -7 - Math.random() * 6);
        this.spawnZombie(type, spawner.position.clone().add(offset));
      }
    });
  }

  pickZombieType() {
    const total = Object.values(ZOMBIE_TYPES).reduce((sum, type) => sum + type.weight, 0);
    let roll = Math.random() * total;
    for (const [id, type] of Object.entries(ZOMBIE_TYPES)) {
      roll -= type.weight;
      if (roll <= 0) return { id, ...type };
    }
    return { id: 'normal', ...ZOMBIE_TYPES.normal };
  }

  spawnZombie(type, position) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(type.radius, type.height, 4, 10),
      new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.88 }),
    );
    body.position.y = type.height / 2;
    const eyes = new THREE.Mesh(
      new THREE.BoxGeometry(type.radius * 0.9, 0.16, 0.08),
      new THREE.MeshBasicMaterial({ color: '#ff4f4f' }),
    );
    eyes.position.set(0, type.height + 0.25, -type.radius * 0.75);
    const healthBar = this.createHealthBar(2.25, 0.28, '#58e59a');
    healthBar.position.y = type.height + 0.72;
    group.add(body, eyes, healthBar);
    group.position.copy(position);
    group.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    this.scene.add(group);
    this.zombies.push({
      id: `zombie-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      hp: type.hp,
      mesh: group,
      position: group.position,
      velocity: new THREE.Vector3(),
      lastAttackAt: 0,
      maxHp: type.hp,
      healthBar,
      healthFill: healthBar.userData.fill,
    });
  }

  updateZombies(dt, time) {
    this.zombies = this.zombies.filter((zombie) => {
      zombie.healthBar?.lookAt(this.camera.position);
      if (zombie.healthFill) {
        zombie.healthFill.scale.x = clamp(zombie.hp / zombie.maxHp, 0, 1);
      }
      const target = this.nearestLivingPlayer(zombie.position);
      if (!target) return true;
      const toTarget = target.position.clone().sub(zombie.position);
      toTarget.y = 0;
      const distance = toTarget.length();
      if (distance > 0.01) {
        const direction = toTarget.normalize();
        zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        if (distance > ZOMBIE_HIT_RADIUS + PLAYER_RADIUS) {
          const movement = direction.multiplyScalar(zombie.type.speed * dt);
          zombie.position.x += movement.x;
          zombie.position.z += movement.z;
          zombie.position.y = FLOOR_Y;
          this.collisionSystem.resolve(zombie.position, null, 0);
        }
      }
      if (distance <= ZOMBIE_HIT_RADIUS + PLAYER_RADIUS && time - zombie.lastAttackAt >= zombie.type.cooldown) {
        zombie.lastAttackAt = time;
        this.damageSurvivor(target, zombie.type.damage, time, zombie.type.name);
      }
      return zombie.hp > 0;
    });
  }

  damageSurvivor(player, damage, time, sourceName) {
    if (player.isDead || !player.applyDamage(damage)) {
      if (player.id === this.localId) this.onHealthChange?.(Math.round(player.health));
      return;
    }
    player.kill(time);
    player.respawnReadyAt = Number.POSITIVE_INFINITY;
    this.dropCarriedTags(player);
    this.createRecallTag(player);
    this.onEvent?.(`${sourceName} downed ${player.name}`);
    if (player.id === this.localId) {
      this.onHealthChange?.(0);
      this.onDeathChange?.({ isDead: true, ready: false, seconds: 0, killerName: sourceName, focusSeconds: 0 });
    }
  }

  markPlayerDown(player) {
    if (!player) return;
    player.respawnReadyAt = Number.POSITIVE_INFINITY;
    this.dropCarriedTags(player);
    this.createRecallTag(player);
  }

  updateBullets() {
    const bullets = this.combatSystem?.bullets || [];
    bullets.forEach((bullet) => {
      if (bullet.life <= 0) return;
      const zombie = this.zombies.find((item) => item.position.distanceTo(bullet.mesh.position) <= item.type.radius + 0.65);
      if (zombie) {
        this.damageZombie(zombie, bullet.damage, bullet.ownerId);
        bullet.life = 0;
        return;
      }
      const spawner = this.spawners.find((item) => item.alive && item.position.distanceTo(bullet.mesh.position) <= 6.2);
      if (spawner) {
        this.damageSpawner(spawner, bullet.damage, bullet.ownerId);
        bullet.life = 0;
      }
    });
  }

  damageZombie(zombie, damage, ownerId) {
    zombie.hp -= damage;
    if (zombie.hp > 0) return;
    const owner = this.players.get(ownerId);
    if (owner) {
      owner.score += zombie.type.score;
      owner.money += Math.max(2, Math.floor(zombie.type.score / 18));
      owner.kills += 1;
    }
    this.scene.remove(zombie.mesh);
    zombie.hp = 0;
  }

  damageSpawner(spawner, damage, ownerId) {
    spawner.hp = Math.max(0, spawner.hp - damage);
    spawner.healthFill.scale.x = clamp(spawner.hp / spawner.maxHp, 0, 1);
    if (spawner.hp > 0) return;
    spawner.alive = false;
    const owner = this.players.get(ownerId);
    if (owner) {
      owner.score += 250;
      owner.money += 35;
    }
    spawner.group.traverse((object) => {
      if (object.material) {
        object.material.color?.set?.('#1f241f');
        object.material.opacity = 0.45;
        object.material.transparent = true;
      }
    });
    this.onEvent?.('Zombie spawner destroyed');
  }

  addFireZone(position, ownerId) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(FIRE_RADIUS, 36),
      new THREE.MeshBasicMaterial({ color: '#ff6b1e', transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, FLOOR_Y + 0.06, position.z);
    this.scene.add(mesh);
    this.fireZones.push({ mesh, ownerId, bornAt: nowMs(), lastDamageAt: nowMs() });
    this.onEvent?.('Molotov fire is burning');
  }

  updateFireZones(dt, time) {
    this.fireZones = this.fireZones.filter((zone) => {
      const age = time - zone.bornAt;
      if (age >= FIRE_DURATION_MS) {
        this.scene.remove(zone.mesh);
        return false;
      }
      zone.mesh.material.opacity = 0.38 * (1 - age / FIRE_DURATION_MS);
      zone.mesh.rotation.z += dt * 0.55;
      this.zombies.forEach((zombie) => {
        if (zombie.position.distanceTo(zone.mesh.position) <= FIRE_RADIUS) {
          this.damageZombie(zombie, FIRE_DAMAGE_PER_SECOND * dt, zone.ownerId);
        }
      });
      return true;
    });
  }

  createRecallTag(player) {
    if (this.recallTags.has(player.id) || this.isTagCarried(player.id)) return;
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, 20),
      new THREE.MeshBasicMaterial({ color: '#75f7ff' }),
    );
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.62, 0.12),
      new THREE.MeshBasicMaterial({ color: '#f5ff9d' }),
    );
    group.add(ring, core);
    group.position.copy(player.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
    this.scene.add(group);
    this.recallTags.set(player.id, { playerId: player.id, mesh: group });
  }

  updateRecallTags(time) {
    this.spawners.forEach((spawner) => spawner.healthBar?.lookAt(this.camera.position));
    for (const tag of [...this.recallTags.values()]) {
      tag.mesh.rotation.y += 0.025;
      tag.mesh.position.y += Math.sin(time / 260) * 0.002;
      const carrier = this.livingPlayers().find((player) => player.position.distanceTo(tag.mesh.position) <= TAG_PICKUP_RADIUS);
      if (carrier) {
        this.scene.remove(tag.mesh);
        this.recallTags.delete(tag.playerId);
        this.addCarriedTag(carrier.id, tag.playerId);
        this.onEvent?.(`${carrier.name} collected a recall tag`);
      }
    }

    for (const [carrierId, tagSet] of [...this.carriedRecallTags.entries()]) {
      const carrier = this.players.get(carrierId);
      if (!carrier || carrier.isDead) {
        if (carrier) this.dropCarriedTags(carrier);
        continue;
      }
      if (carrier.position.distanceTo(this.recallCenter) > RECALL_RADIUS) continue;
      [...tagSet].forEach((playerId) => {
        this.revivePlayer?.(playerId, this.recallCenter);
        tagSet.delete(playerId);
        this.onEvent?.(`${carrier.name} recalled a teammate`);
      });
      if (tagSet.size === 0) {
        this.carriedRecallTags.delete(carrierId);
      }
    }
  }

  addCarriedTag(carrierId, playerId) {
    if (!this.carriedRecallTags.has(carrierId)) {
      this.carriedRecallTags.set(carrierId, new Set());
    }
    this.carriedRecallTags.get(carrierId).add(playerId);
  }

  isTagCarried(playerId) {
    return [...this.carriedRecallTags.values()].some((tagSet) => tagSet.has(playerId));
  }

  dropCarriedTags(carrier) {
    const tagSet = this.carriedRecallTags.get(carrier.id);
    if (!tagSet?.size) return;
    [...tagSet].forEach((playerId, index) => {
      const player = this.players.get(playerId);
      if (!player || !player.isDead) return;
      const dropPosition = carrier.position.clone().add(new THREE.Vector3((index - 0.5) * 1.2, 0, 0));
      player.position.copy(dropPosition);
      this.recallTags.delete(playerId);
      this.createRecallTag(player);
    });
    this.carriedRecallTags.delete(carrier.id);
    this.onEvent?.(`${carrier.name} dropped recall tags`);
  }

  updateAlliedBots(dt, time) {
    this.livingPlayers().filter((player) => player.isBot).forEach((bot) => {
      const target = this.nearestZombieOrSpawner(bot.position);
      if (!target) return;
      const toTarget = target.position.clone().sub(bot.position);
      toTarget.y = 0;
      const distance = toTarget.length();
      if (distance < 0.01 || distance > ALLY_BOT_RANGE) return;
      const direction = toTarget.normalize();
      bot.yaw = Math.atan2(-direction.x, -direction.z);
      if (distance > 17) {
        bot.isGrounded = this.collisionSystem.move(bot.position, bot.velocity, direction.multiplyScalar(10.5 * dt), dt);
      }
      if (distance <= ALLY_BOT_SHOOT_RANGE) {
        this.combatSystem.shoot(bot, direction.clone());
      }
    });
  }

  nearestLivingPlayer(position) {
    return this.livingPlayers()
      .map((player) => ({ player, distance: player.position.distanceTo(position) }))
      .sort((a, b) => a.distance - b.distance)[0]?.player || null;
  }

  nearestZombieOrSpawner(position) {
    const zombieTargets = this.zombies.map((zombie) => ({ position: zombie.position, distance: zombie.position.distanceTo(position) }));
    const spawnerTargets = this.spawners.filter((spawner) => spawner.alive).map((spawner) => ({ position: spawner.position, distance: spawner.position.distanceTo(position) }));
    return [...zombieTargets, ...spawnerTargets].sort((a, b) => a.distance - b.distance)[0] || null;
  }

  livingPlayers() {
    return [...this.players.values()].filter((player) => !player.isDead && player.health > 0);
  }

  checkEndState(nightRemainingSeconds) {
    if (this.livingPlayers().length === 0) {
      this.ended = true;
      this.onMatchEnd?.({ title: 'Squad wiped', winner: 'zombies', detail: 'The night overran the squad.' });
      return;
    }
    if (nightRemainingSeconds <= 0) {
      this.ended = true;
      this.onMatchEnd?.({ title: 'Night survived', winner: 'survivors', detail: 'At least one survivor made it to dawn.' });
    }
  }

  updateHud(time, nightRemainingSeconds) {
    if (time - this.lastHudAt < 450) return;
    this.lastHudAt = time;
    const activeSpawners = this.spawners.filter((spawner) => spawner.alive).length;
    this.onScoreChange?.({
      blue: this.zombies.length,
      red: activeSpawners,
      mode: 'zombie-survival',
      target: 0,
      remainingSeconds: nightRemainingSeconds,
      ended: this.ended,
      objective: `Survive the night | Zombies ${this.zombies.length} | Spawners ${activeSpawners}/3`,
      players: [...this.players.values()].map((player) => ({
        id: player.id,
        name: player.name,
        team: player.team,
        kills: player.kills,
        assists: player.assists,
        deaths: player.deaths,
        score: player.score,
        money: player.money,
      })),
    });
  }
}
