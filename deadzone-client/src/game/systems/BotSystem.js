import * as THREE from 'three';

export class BotSystem {
  constructor({ players, combatSystem, collisionSystem, directionFromPlayer }) {
    this.players = players;
    this.combatSystem = combatSystem;
    this.collisionSystem = collisionSystem;
    this.directionFromPlayer = directionFromPlayer;
  }

  update(dt, time) {
    const players = [...this.players.values()];
    for (const bot of players.filter((player) => player.isBot)) {
      this.combatSystem.updateReload(bot, time);
      if (bot.isDead) {
        if (time >= bot.respawnReadyAt) {
          bot.respawn();
        }
        continue;
      }
      bot.clearExpiredBuffs(time);
      const enemies = players.filter((player) => player.team !== bot.team && player.health > 0);
      const target = enemies.sort((a, b) => a.position.distanceTo(bot.position) - b.position.distanceTo(bot.position))[0];
      if (!target) continue;

      const toTarget = target.position.clone().sub(bot.position);
      bot.yaw = Math.atan2(-toTarget.x, -toTarget.z);
      const distance = toTarget.length();
      const moveDirection = toTarget.setY(0).normalize().multiplyScalar(distance > 13 ? 9 * dt : -4 * dt);
      if (Math.random() > 0.992 && bot.isGrounded) {
        this.collisionSystem.jump(bot);
      }
      bot.isGrounded = this.collisionSystem.move(bot.position, bot.velocity, moveDirection, dt);
      if (bot.ammo <= 0) {
        this.combatSystem.startReload(bot, time);
      } else if (distance < 42 && Math.random() > 0.42) {
        const aim = target.position.clone()
          .add(new THREE.Vector3(0, 1.25, 0))
          .sub(bot.position.clone().add(new THREE.Vector3(0, 1.25, 0)))
          .normalize();
        aim.x += (Math.random() - 0.5) * 0.08;
        aim.y += (Math.random() - 0.5) * 0.04;
        this.combatSystem.shoot(bot, aim.normalize());
      }
    }
  }
}
