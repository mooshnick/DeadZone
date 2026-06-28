import * as THREE from 'three';
import { BotNavigator } from './BotNavigator.js';

const BOT_TURN_SPEED = 17;
const BOT_FIRE_ALIGNMENT = Math.cos(THREE.MathUtils.degToRad(11));

function smoothAngle(current, target, maxStep) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + THREE.MathUtils.clamp(delta, -maxStep, maxStep);
}

export class BotSystem {
  constructor({ players, combatSystem, collisionSystem, directionFromPlayer, gameMode, objectiveTargetFor }) {
    this.players = players;
    this.combatSystem = combatSystem;
    this.collisionSystem = collisionSystem;
    this.directionFromPlayer = directionFromPlayer;
    this.gameMode = gameMode;
    this.objectiveTargetFor = objectiveTargetFor;
    this.navigator = new BotNavigator(collisionSystem);
  }

  update(dt, time) {
    const players = [...this.players.values()];
    for (const bot of players.filter((player) => player.isBot)) {
      this.combatSystem.updateReload(bot, time);
      if (bot.isDead) {
        if (time >= bot.respawnReadyAt) {
          bot.respawn();
          this.navigator.reset(bot);
        }
        continue;
      }
      bot.clearExpiredBuffs(time);
      const enemies = players.filter((player) => (
        player.id !== bot.id
        && player.health > 0
        && (this.gameMode === 'free-for-all' || player.team !== bot.team)
      ));
      const target = enemies.sort((a, b) => a.position.distanceTo(bot.position) - b.position.distanceTo(bot.position))[0];
      const objectiveTarget = this.objectiveTargetFor?.(bot);
      const movementTarget = objectiveTarget || target?.position;
      if (!movementTarget) continue;

      const toMovementTarget = movementTarget.clone().sub(bot.position);
      const objectiveDistance = toMovementTarget.length();
      const desiredDirection = toMovementTarget.setY(0).normalize();
      const movementDistance = objectiveTarget
        ? (objectiveDistance > 2.5 ? 10 * dt : 0)
        : (objectiveDistance > 13 ? 9 * dt : -4 * dt);
      const moveDirection = this.navigator.movementFor(
        bot,
        movementDistance < 0 ? desiredDirection.clone().negate() : desiredDirection,
        Math.abs(movementDistance),
        dt,
        time,
      );
      const targetDirection = target
        ? target.position.clone().sub(bot.position).setY(0).normalize()
        : null;
      const facingDirection = targetDirection?.lengthSq() > 0.0001
        ? targetDirection
        : moveDirection;
      if (facingDirection.lengthSq() > 0.0001) {
        const targetYaw = Math.atan2(-facingDirection.x, -facingDirection.z);
        bot.yaw = smoothAngle(bot.yaw, targetYaw, BOT_TURN_SPEED * dt);
      }
      if (this.navigator.shouldJump(bot, desiredDirection, time)) {
        this.collisionSystem.jump(bot);
      }
      bot.isGrounded = this.collisionSystem.move(bot.position, bot.velocity, moveDirection, dt);
      if (bot.ammo <= 0) {
        this.combatSystem.startReload(bot, time);
      } else if (
        target
        && target.position.distanceTo(bot.position) < 42
        && this.isFacingTarget(bot, target)
        && Math.random() > 0.42
      ) {
        const aimTarget = target.position.clone().add(new THREE.Vector3(0, 1.25, 0));
        const roughOrigin = this.weaponMuzzlePosition(bot);
        const roughAim = aimTarget.clone().sub(roughOrigin).normalize();
        bot.pitch = THREE.MathUtils.clamp(Math.asin(roughAim.y), -0.72, 0.72);
        const shotOrigin = this.weaponMuzzlePosition(bot);
        const aim = aimTarget
          .sub(shotOrigin)
          .normalize();
        aim.x += (Math.random() - 0.5) * 0.08;
        aim.y += (Math.random() - 0.5) * 0.04;
        this.combatSystem.shoot(bot, aim.normalize(), shotOrigin);
      }
    }
  }

  isFacingTarget(bot, target) {
    const toTarget = target.position.clone().sub(bot.position).setY(0);
    if (toTarget.lengthSq() < 0.0001) {
      return true;
    }
    toTarget.normalize();
    const facing = new THREE.Vector3(-Math.sin(bot.yaw), 0, -Math.cos(bot.yaw));
    return facing.dot(toTarget) >= BOT_FIRE_ALIGNMENT;
  }

  weaponMuzzlePosition(bot) {
    if (!bot.mesh || !bot.weaponMuzzle) {
      return bot.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    }

    bot.mesh.position.copy(bot.position);
    bot.mesh.rotation.y = bot.yaw;
    if (bot.weaponModel) {
      bot.weaponModel.rotation.x = bot.pitch;
    }
    bot.mesh.updateMatrixWorld(true);
    return bot.weaponMuzzle.getWorldPosition(new THREE.Vector3());
  }
}
