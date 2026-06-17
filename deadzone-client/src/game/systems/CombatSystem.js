import * as THREE from 'three';
import { ASSIST_REWARD, ASSIST_SCORE, ASSIST_WINDOW, ASSIST_XP, KILL_REWARD, KILL_SCORE, KILL_XP, WEAPONS } from '../config';
import { nowMs } from '../utils';

export class CombatSystem {
  constructor({ scene, players, localId, collisionSystem, onScoreChange, onWalletChange, onProgressChange, onEvent, onRecoil }) {
    this.scene = scene;
    this.players = players;
    this.localId = localId;
    this.collisionSystem = collisionSystem;
    this.onScoreChange = onScoreChange;
    this.onWalletChange = onWalletChange;
    this.onProgressChange = onProgressChange;
    this.onEvent = onEvent;
    this.onRecoil = onRecoil;
    this.bullets = [];
  }

  updateReload(player, time) {
    if (player.updateReload(time) && player.id === this.localId) {
      this.onEvent('Reloaded');
    }
  }

  startReload(player, time) {
    if (player.startReload(time) && player.id === this.localId) {
      this.onEvent('Reloading...');
    }
  }

  shoot(player, targetDirection) {
    const time = nowMs();
    const weapon = WEAPONS[player.weaponId] || WEAPONS.rifle;
    if (!player.canShoot(time)) {
      return;
    }
    if (player.ammo <= 0) {
      this.startReload(player, time);
      return;
    }
    player.consumeAmmo(time);
    this.onRecoil?.(player, weapon);

    const origin = player.position.clone().add(new THREE.Vector3(0, 1.45, 0)).add(targetDirection.clone().multiplyScalar(1.6));
    const upgradeMultiplier = 1 + (player.weaponLevel || 0) * 0.08;
    const damage = Math.round(weapon.damage * upgradeMultiplier * (player.buffs.damage ? 1.45 : 1));
    for (let index = 0; index < weapon.pellets; index += 1) {
      const spread = weapon.pellets === 1 ? 0 : (index - (weapon.pellets - 1) / 2) * weapon.spread + (Math.random() - 0.5) * weapon.spread;
      const direction = targetDirection.clone().add(new THREE.Vector3(spread, (Math.random() - 0.5) * weapon.spread, Math.abs(spread) * 0.25)).normalize();
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(player.weaponId === 'sniper' ? 0.16 : 0.23, 12, 12),
        new THREE.MeshBasicMaterial({ color: weapon.color }),
      );
      mesh.position.copy(origin);
      this.scene.add(mesh);
      this.bullets.push({
        ownerId: player.id,
        team: player.team,
        mesh,
        velocity: direction.multiplyScalar(weapon.speed),
        damage,
        life: player.weaponId === 'shotgun' ? 55 : 110,
        radius: weapon.explosiveRadius || 0,
      });
    }
  }

  updateBullets() {
    const players = [...this.players.values()];
    this.bullets = this.bullets.filter((bullet) => {
      bullet.mesh.position.add(bullet.velocity);
      bullet.life -= 1;
      if (this.collisionSystem.hitsSolid(bullet.mesh.position)) {
        this.explodeOrRemove(bullet);
        return false;
      }
      if (bullet.life <= 0 || bullet.mesh.position.length() > 135) {
        this.scene.remove(bullet.mesh);
        return false;
      }

      const hit = players.find((player) => (
        player.id !== bullet.ownerId
        && player.team !== bullet.team
        && player.health > 0
        && player.position.distanceTo(bullet.mesh.position) < 1.55
      ));
      if (!hit) return true;

      if (bullet.radius > 0) {
        this.explodeOrRemove(bullet);
        return false;
      }
      this.damagePlayer(hit, bullet.ownerId, bullet.damage);
      this.scene.remove(bullet.mesh);
      return false;
    });
  }

  explodeOrRemove(bullet) {
    if (bullet.radius <= 0) {
      this.scene.remove(bullet.mesh);
      return;
    }
    this.makeExplosion(bullet.mesh.position, bullet.radius, bullet.damage, bullet.ownerId, bullet.team);
    this.scene.remove(bullet.mesh);
  }

  makeExplosion(position, radius, damage, ownerId, team) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 16),
      new THREE.MeshBasicMaterial({ color: '#ff8b3d', transparent: true, opacity: 0.22 }),
    );
    marker.position.copy(position);
    this.scene.add(marker);
    setTimeout(() => this.scene.remove(marker), 140);

    for (const player of this.players.values()) {
      if (player.id === ownerId || player.team === team || player.isDead) continue;
      const distance = player.position.distanceTo(position);
      if (distance > radius) continue;
      const scaledDamage = Math.round(damage * (1 - distance / (radius * 1.25)));
      this.damagePlayer(player, ownerId, Math.max(18, scaledDamage));
    }
  }

  damagePlayer(target, shooterId, baseDamage) {
    const shooter = this.players.get(shooterId);
    if (!shooter) {
      return;
    }
    const time = nowMs();
    target.recordDamage(shooterId, time);
    const damage = Math.round(baseDamage * (target.buffs.shield ? 0.58 : 1));
    if (!target.applyDamage(damage)) {
      return;
    }
    this.makeEliminationEffect(target.position, shooter.team);
    this.awardKill(shooter, target, time);
    target.kill(time);
  }

  makeEliminationEffect(position, team) {
    const color = team === 'blue' ? '#66c2ff' : '#ff7180';
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 24, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }),
    );
    flash.position.copy(position.clone().add(new THREE.Vector3(0, 1.3, 0)));
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 180);

    for (let index = 0; index < 12; index += 1) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? color : '#ffffff' }),
      );
      shard.position.copy(position.clone().add(new THREE.Vector3(0, 1.4, 0)));
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.55,
        Math.random() * 0.45,
        (Math.random() - 0.5) * 0.55,
      );
      this.scene.add(shard);
      let frames = 0;
      const animateShard = () => {
        frames += 1;
        shard.position.add(velocity);
        velocity.y -= 0.025;
        shard.rotation.x += 0.18;
        shard.rotation.y += 0.14;
        if (frames < 26) {
          requestAnimationFrame(animateShard);
        } else {
          this.scene.remove(shard);
        }
      };
      animateShard();
    }
  }

  awardKill(shooter, target, time) {
    shooter.kills += 1;
    shooter.score += KILL_SCORE;
    shooter.money += KILL_REWARD;
    this.onWalletChange?.(shooter);
    this.onProgressChange?.({ playerId: shooter.id, xp: KILL_XP, reason: 'kill' });
    this.onEvent(`${shooter.name} eliminated ${target.name} +NIS ${KILL_REWARD}`);

    for (const [helperId, lastDamageAt] of target.damageLog.entries()) {
      if (helperId === shooter.id || time - lastDamageAt > ASSIST_WINDOW) continue;
      const helper = this.players.get(helperId);
      if (!helper || helper.team !== shooter.team) continue;
      helper.assists += 1;
      helper.score += ASSIST_SCORE;
      helper.money += ASSIST_REWARD;
      this.onWalletChange?.(helper);
      this.onProgressChange?.({ playerId: helper.id, xp: ASSIST_XP, reason: 'assist' });
      this.onEvent(`${helper.name} assisted +NIS ${ASSIST_REWARD}`);
    }
  }
}
