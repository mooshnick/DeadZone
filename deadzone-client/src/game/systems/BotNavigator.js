import * as THREE from 'three';

const FORWARD_PROBE_DISTANCE = 4.2;
const SIDE_PROBE_DISTANCE = 3.6;
const DIRECT_BLOCKED_THRESHOLD = 0.78;
const DIRECT_CLEAR_THRESHOLD = 0.96;
const CLEAR_PATH_CONFIRM_MS = 260;
const WALL_MODE_MIN_MS = 750;
const SIDE_BLOCK_CONFIRM_MS = 320;
const SIDE_SWITCH_COOLDOWN_MS = 900;
const STEERING_TURN_SPEED = 7.8;
const STUCK_TIME = 0.38;
const MIN_EXPECTED_TRAVEL = 0.04;
const MIN_PROGRESS_RATIO = 0.22;

export class BotNavigator {
  constructor(collisionSystem) {
    this.collisionSystem = collisionSystem;
    this.forward = new THREE.Vector3();
    this.candidate = new THREE.Vector3();
  }

  movementFor(bot, desiredDirection, distance, dt, time) {
    const ai = this.ensureState(bot);
    this.updateStuckState(bot, ai, dt, time);

    const desired = this.forward.copy(desiredDirection).setY(0);
    if (desired.lengthSq() < 0.0001 || distance <= 0) {
      ai.expectedTravel = 0;
      ai.lastPosition.copy(bot.position);
      return desired.set(0, 0, 0);
    }
    desired.normalize();

    const requestedDirection = this.chooseDirection(bot, desired, ai, time);
    const direction = this.smoothDirection(ai, requestedDirection, dt);
    const movement = direction.multiplyScalar(distance);
    ai.expectedTravel = distance;
    ai.lastPosition.copy(bot.position);
    return movement;
  }

  shouldJump(bot, desiredDirection, time) {
    const ai = this.ensureState(bot);
    if (!bot.isGrounded || time < ai.nextJumpAt) {
      return false;
    }

    const direction = this.candidate.copy(desiredDirection).setY(0);
    if (direction.lengthSq() < 0.0001) {
      return false;
    }

    const shouldJump = this.collisionSystem.hasJumpableObstacleAhead(
      bot.position,
      direction.normalize(),
      2.4,
    );
    if (shouldJump) {
      ai.nextJumpAt = time + 850;
    }
    return shouldJump;
  }

  reset(bot) {
    bot.ai = {
      lastPosition: bot.position.clone(),
      expectedTravel: 0,
      stuckFor: 0,
      followingWall: false,
      wallSide: 1,
      wallHeading: new THREE.Vector3(0, 0, -1),
      clearPathSince: 0,
      wallModeUntil: 0,
      sideBlockedSince: 0,
      sideSwitchCooldownUntil: 0,
      steeringDirection: new THREE.Vector3(0, 0, -1),
      nextJumpAt: 0,
    };
  }

  chooseDirection(bot, desired, ai, time) {
    const directClearance = this.collisionSystem.horizontalClearance(
      bot.position,
      desired,
      FORWARD_PROBE_DISTANCE,
    );
    const canJumpForward = this.collisionSystem.hasJumpableObstacleAhead(
      bot.position,
      desired,
      2.4,
    );

    if (!ai.followingWall && directClearance < DIRECT_BLOCKED_THRESHOLD && !canJumpForward) {
      ai.followingWall = true;
      ai.wallSide = 1;
      ai.wallHeading.copy(desired);
      ai.clearPathSince = 0;
      ai.wallModeUntil = time + WALL_MODE_MIN_MS;
      ai.sideBlockedSince = 0;
    }

    if (!ai.followingWall) {
      return desired.clone();
    }

    if (directClearance >= DIRECT_CLEAR_THRESHOLD && time >= ai.wallModeUntil) {
      ai.clearPathSince ||= time;
      if (time - ai.clearPathSince >= CLEAR_PATH_CONFIRM_MS) {
        ai.followingWall = false;
        ai.clearPathSince = 0;
        return desired.clone();
      }
    } else {
      ai.clearPathSince = 0;
    }

    let wallDirection = this.wallDirection(ai.wallHeading, ai.wallSide);
    let sideClearance = this.collisionSystem.horizontalClearance(
      bot.position,
      wallDirection,
      SIDE_PROBE_DISTANCE,
    );
    if (sideClearance < DIRECT_BLOCKED_THRESHOLD) {
      ai.sideBlockedSince ||= time;
      const blockageConfirmed = time - ai.sideBlockedSince >= SIDE_BLOCK_CONFIRM_MS;
      if (blockageConfirmed && time >= ai.sideSwitchCooldownUntil) {
        this.switchWallSide(ai, time);
        wallDirection = this.wallDirection(ai.wallHeading, ai.wallSide);
        sideClearance = this.collisionSystem.horizontalClearance(
          bot.position,
          wallDirection,
          SIDE_PROBE_DISTANCE,
        );
      }
    } else {
      ai.sideBlockedSince = 0;
    }

    if (sideClearance < DIRECT_BLOCKED_THRESHOLD) {
      // Back away steadily while the side-choice timer settles instead of
      // alternating left/right every rendered frame.
      return ai.wallHeading.clone().negate();
    }
    return wallDirection;
  }

  switchWallSide(ai, time) {
    ai.wallSide *= -1;
    ai.sideBlockedSince = 0;
    ai.sideSwitchCooldownUntil = time + SIDE_SWITCH_COOLDOWN_MS;
    ai.wallModeUntil = Math.max(ai.wallModeUntil, time + WALL_MODE_MIN_MS);
  }

  smoothDirection(ai, requestedDirection, dt) {
    const requested = requestedDirection.clone().setY(0).normalize();
    if (ai.steeringDirection.lengthSq() < 0.0001) {
      ai.steeringDirection.copy(requested);
      return requested;
    }

    const currentAngle = Math.atan2(ai.steeringDirection.x, ai.steeringDirection.z);
    const targetAngle = Math.atan2(requested.x, requested.z);
    const delta = Math.atan2(
      Math.sin(targetAngle - currentAngle),
      Math.cos(targetAngle - currentAngle),
    );
    const nextAngle = currentAngle + THREE.MathUtils.clamp(
      delta,
      -STEERING_TURN_SPEED * dt,
      STEERING_TURN_SPEED * dt,
    );
    ai.steeringDirection.set(Math.sin(nextAngle), 0, Math.cos(nextAngle));
    return ai.steeringDirection.clone();
  }

  wallDirection(desired, side) {
    // side=1 deliberately means "turn right first".
    return desired.clone()
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, -side * Math.PI / 2)
      .normalize();
  }

  updateStuckState(bot, ai, dt, time) {
    const actualTravel = ai.lastPosition.distanceTo(bot.position);
    const expected = ai.expectedTravel;
    if (expected >= MIN_EXPECTED_TRAVEL && actualTravel < expected * MIN_PROGRESS_RATIO) {
      ai.stuckFor += dt;
    } else {
      ai.stuckFor = Math.max(0, ai.stuckFor - dt * 1.8);
    }

    if (ai.stuckFor >= STUCK_TIME) {
      ai.followingWall = true;
      ai.wallHeading.copy(this.forward);
      ai.clearPathSince = 0;
      if (ai.sideSwitchCooldownUntil <= time) {
        this.switchWallSide(ai, time);
      }
      ai.stuckFor = 0;
    }
  }

  ensureState(bot) {
    bot.ai ||= {};
    bot.ai.lastPosition ||= bot.position.clone();
    bot.ai.expectedTravel ??= 0;
    bot.ai.stuckFor ??= 0;
    bot.ai.followingWall ??= false;
    bot.ai.wallSide ??= 1;
    bot.ai.wallHeading ||= new THREE.Vector3(0, 0, -1);
    bot.ai.clearPathSince ??= 0;
    bot.ai.wallModeUntil ??= 0;
    bot.ai.sideBlockedSince ??= 0;
    bot.ai.sideSwitchCooldownUntil ??= 0;
    bot.ai.steeringDirection ||= bot.ai.wallHeading.clone();
    bot.ai.nextJumpAt ??= 0;
    return bot.ai;
  }
}
