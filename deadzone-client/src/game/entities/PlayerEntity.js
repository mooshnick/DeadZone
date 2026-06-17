import * as THREE from 'three';
import { FLOOR_Y, WEAPONS } from '../config';
import { spawnFor } from '../world/SpawnPoints';
import { nowMs } from '../utils';

export class PlayerEntity {
  constructor({ id, name, team, weaponId, outfitId = 'classic', weaponSkinId = 'standard', weaponLevel = 0, mapId = 'foundry', isBot = false, index = 0, money = 0 }) {
    const weapon = WEAPONS[weaponId] || WEAPONS.rifle;
    this.id = id;
    this.name = name;
    this.team = team;
    this.weaponId = weaponId;
    this.outfitId = outfitId;
    this.weaponSkinId = weaponSkinId;
    this.weaponLevel = weaponLevel;
    this.mapId = mapId;
    this.isBot = isBot;
    this.position = spawnFor(team, index, mapId);
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.yaw = team === 'blue' ? -Math.PI / 2 : Math.PI / 2;
    this.pitch = -0.08;
    this.health = 100;
    this.ammo = weapon.magazineSize;
    this.isReloading = false;
    this.reloadEndsAt = 0;
    this.isDead = false;
    this.respawnReadyAt = 0;
    this.kills = 0;
    this.assists = 0;
    this.score = 0;
    this.money = money;
    this.deaths = 0;
    this.grenades = 1;
    this.damageLog = new Map();
    this.buffs = {};
    this.lastShot = 0;
    this.invulnerableUntil = nowMs() + 3000;
    this.mesh = null;
    this.nameSprite = null;
  }

  get weapon() {
    return WEAPONS[this.weaponId] || WEAPONS.rifle;
  }

  clearExpiredBuffs(time) {
    this.buffs = Object.fromEntries(Object.entries(this.buffs).filter(([, expiry]) => expiry > time));
  }

  canShoot(time) {
    const cooldown = this.buffs.rapid ? this.weapon.cooldown * 0.55 : this.weapon.cooldown;
    return !this.isDead && !this.isReloading && this.health > 0 && time - this.lastShot >= cooldown;
  }

  consumeAmmo(time) {
    this.lastShot = time;
    this.ammo -= 1;
  }

  startReload(time) {
    if (this.isDead || this.isReloading || this.ammo === this.weapon.magazineSize) {
      return false;
    }
    this.isReloading = true;
    this.reloadEndsAt = time + this.weapon.reloadTime;
    return true;
  }

  updateReload(time) {
    if (!this.isReloading || time < this.reloadEndsAt) {
      return false;
    }
    this.ammo = this.weapon.magazineSize;
    this.isReloading = false;
    this.reloadEndsAt = 0;
    return true;
  }

  applyDamage(damage) {
    if (nowMs() < this.invulnerableUntil) {
      return false;
    }
    this.health = Math.max(0, this.health - damage);
    return this.health === 0;
  }

  recordDamage(shooterId, time) {
    this.damageLog.set(shooterId, time);
  }

  jump() {
    if (!this.isGrounded || this.isDead) {
      return false;
    }
    this.velocity.y = 15.5;
    this.isGrounded = false;
    return true;
  }

  kill(time) {
    this.deaths += 1;
    this.health = 0;
    this.isDead = true;
    this.isReloading = false;
    this.respawnReadyAt = time + 5000;
    if (this.mesh) {
      this.mesh.visible = false;
    }
  }

  respawn(index = Math.floor(Math.random() * 4)) {
    this.health = 100;
    this.buffs = {};
    this.isDead = false;
    this.isReloading = false;
    this.reloadEndsAt = 0;
    this.ammo = this.weapon.magazineSize;
    this.position.copy(spawnFor(this.team, index, this.mapId));
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.damageLog.clear();
    this.invulnerableUntil = performance.now() + 3000;
    if (this.mesh) {
      this.mesh.visible = true;
    }
  }

  fallToFloor() {
    if (this.position.y < FLOOR_Y - 28) {
      this.kill(performance.now());
    }
  }
}
