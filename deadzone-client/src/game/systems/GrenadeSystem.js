import * as THREE from 'three';
import { ARENA_LIMIT } from '../config';
import { randomItem } from '../utils';

const GRENADE_RADIUS = 0.34;
const GRENADE_FLOOR_Y = 0.48;
const GRENADE_GRAVITY = 0.038;
const BOUNCE_DAMPING = 0.48;
const ROLL_FRICTION = 0.91;
const AIR_DRAG = 0.996;
const MIN_THROW_FORCE = 0.46;
const MAX_THROW_FORCE = 0.78;
const MIN_ARC_FORCE = 0.38;
const MAX_ARC_FORCE = 0.58;
const BLAST_RADIUS = 8.6;
const BLAST_DAMAGE = 72;
const GRENADE_SOUND_URL = '/sound/grenade_trimmed.wav';

export class GrenadeSystem {
  constructor({ scene, players, combatSystem, collisionSystem, gameMode, onEvent }) {
    this.scene = scene;
    this.players = players;
    this.combatSystem = combatSystem;
    this.collisionSystem = collisionSystem;
    this.gameMode = gameMode;
    this.onEvent = onEvent;
    this.pickups = [];
    this.thrown = [];
    this.lastSpawnAt = 0;
    this.grenadeSound = this.createGrenadeSound();
  }

  createGrenadeSound() {
    if (typeof Audio === 'undefined') {
      return null;
    }
    const sound = new Audio(GRENADE_SOUND_URL);
    sound.preload = 'auto';
    sound.volume = 0.5;
    return sound;
  }

  playGrenadeSound(player) {
    if (player.isBot || !this.grenadeSound) {
      return;
    }
    this.grenadeSound.pause();
    this.grenadeSound.currentTime = 0;
    this.grenadeSound.play().catch(() => {});
  }

  update(time, dt) {
    this.spawn(time);
    this.updatePickups(time);
    this.updateThrown(dt);
  }

  throw(player, direction, charge = 0) {
    if (player.isDead || player.grenades <= 0) {
      return;
    }
    const throwCharge = Math.min(1, Math.max(0, charge));
    const throwForce = MIN_THROW_FORCE + (MAX_THROW_FORCE - MIN_THROW_FORCE) * throwCharge;
    const arcForce = MIN_ARC_FORCE + (MAX_ARC_FORCE - MIN_ARC_FORCE) * throwCharge;
    const throwDirection = direction.clone().normalize();
    player.grenades -= 1;
    this.playGrenadeSound(player);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#243042', emissive: '#53ff9a', emissiveIntensity: 0.28 }),
    );
    mesh.position.copy(player.position.clone().add(new THREE.Vector3(0, 1.45, 0)).add(throwDirection.clone().multiplyScalar(1.0)));
    this.scene.add(mesh);
    this.thrown.push({
      ownerId: player.id,
      team: player.team,
      mesh,
      velocity: throwDirection.multiplyScalar(throwForce).add(new THREE.Vector3(0, arcForce, 0)),
      fuse: 132,
    });
    this.onEvent(`${player.name} threw a grenade`);
  }

  spawn(time) {
    if (this.pickups.length >= 6 || time - this.lastSpawnAt < 5200) {
      return;
    }
    this.lastSpawnAt = time;
    const spots = [-32, -20, -8, 8, 20, 32];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({ color: '#4cff91', emissive: '#4cff91', emissiveIntensity: 0.38, roughness: 0.35 }),
    );
    mesh.position.set(randomItem(spots) + (Math.random() - 0.5) * 4, 1.15, randomItem(spots) + (Math.random() - 0.5) * 4);
    this.scene.add(mesh);
    this.pickups.push({ mesh, bornAt: time });
  }

  updatePickups(time) {
    const players = [...this.players.values()];
    this.pickups = this.pickups.filter((pickup) => {
      pickup.mesh.rotation.y += 0.04;
      pickup.mesh.position.y = 1.15 + Math.sin(time / 300 + pickup.bornAt) * 0.18;
      const taker = players.find((player) => (
        !player.isDead
        && player.grenades < 3
        && player.position.distanceTo(pickup.mesh.position) < 2.2
      ));
      if (!taker) return true;
      taker.grenades = Math.min(3, taker.grenades + 1);
      if (!taker.isBot) {
        this.onEvent('Picked grenade');
      }
      this.scene.remove(pickup.mesh);
      return false;
    });
  }

  updateThrown(dt) {
    this.thrown = this.thrown.filter((grenade) => {
      const frameScale = Math.min(2, Math.max(0.5, dt * 60));
      grenade.velocity.y -= GRENADE_GRAVITY * frameScale;
      grenade.velocity.x *= AIR_DRAG ** frameScale;
      grenade.velocity.z *= AIR_DRAG ** frameScale;
      this.moveGrenade(grenade, frameScale);
      this.applyRolling(grenade, frameScale);
      grenade.fuse -= frameScale;

      if (this.hitEnemyPlayer(grenade) || grenade.fuse <= 0) {
        this.explode(grenade);
        return false;
      }

      return true;
    });
  }

  moveGrenade(grenade, frameScale) {
    const position = grenade.mesh.position;
    const nextX = position.clone();
    nextX.x += grenade.velocity.x * frameScale;
    if (this.isBlocked(nextX)) {
      grenade.velocity.x *= -BOUNCE_DAMPING;
    } else {
      position.x = nextX.x;
    }

    const nextZ = position.clone();
    nextZ.z += grenade.velocity.z * frameScale;
    if (this.isBlocked(nextZ)) {
      grenade.velocity.z *= -BOUNCE_DAMPING;
    } else {
      position.z = nextZ.z;
    }

    const nextY = position.clone();
    nextY.y += grenade.velocity.y * frameScale;
    if (nextY.y <= GRENADE_FLOOR_Y) {
      position.y = GRENADE_FLOOR_Y;
      grenade.velocity.y = Math.abs(grenade.velocity.y) > 0.08 ? Math.abs(grenade.velocity.y) * BOUNCE_DAMPING : 0;
      grenade.velocity.x *= ROLL_FRICTION;
      grenade.velocity.z *= ROLL_FRICTION;
      return;
    }
    if (this.isBlocked(nextY)) {
      grenade.velocity.y *= -BOUNCE_DAMPING;
    } else {
      position.y = nextY.y;
    }
  }

  applyRolling(grenade, frameScale) {
    const horizontalSpeed = Math.hypot(grenade.velocity.x, grenade.velocity.z);
    grenade.mesh.rotation.x += (grenade.velocity.z * 0.18 + horizontalSpeed * 0.05) * frameScale;
    grenade.mesh.rotation.z -= grenade.velocity.x * 0.18 * frameScale;
    grenade.mesh.rotation.y += 0.04 * frameScale;
  }

  isBlocked(position) {
    if (Math.abs(position.x) > ARENA_LIMIT - GRENADE_RADIUS || Math.abs(position.z) > ARENA_LIMIT - GRENADE_RADIUS) {
      return true;
    }
    return this.collisionSystem.hitsSolid(position);
  }

  hitEnemyPlayer(grenade) {
    return [...this.players.values()].some((player) => (
      player.id !== grenade.ownerId
      && (this.gameMode === 'free-for-all' || player.team !== grenade.team)
      && !player.isDead
      && player.health > 0
      && player.position.clone().add(new THREE.Vector3(0, 1.1, 0)).distanceTo(grenade.mesh.position) < 1.75
    ));
  }

  explode(grenade) {
    this.combatSystem.makeExplosion(grenade.mesh.position, BLAST_RADIUS, BLAST_DAMAGE, grenade.ownerId, grenade.team);
    this.scene.remove(grenade.mesh);
  }
}
