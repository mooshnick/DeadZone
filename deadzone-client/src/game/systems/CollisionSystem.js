import { ARENA_LIMIT, FLOOR_Y, GRAVITY, JUMP_SPEED, PLAYER_HEIGHT, PLAYER_RADIUS } from '../config';
import { clamp } from '../utils';

const MAX_STEP_UP = 0.72;
const FLOOR_SNAP_DOWN = 1.15;

export class CollisionSystem {
  constructor(blocks) {
    this.blocks = blocks;
  }

  isFloorLike(block) {
    return block.kind?.includes('floor')
      || block.kind?.includes('roof')
      || block.kind?.includes('steps')
      || block.kind?.includes('landing')
      || block.kind?.includes('ramp')
      || block.kind?.includes('stand')
      || block.kind?.includes('platform')
      || block.kind?.includes('shelf')
      || block.kind?.includes('garden')
      || block.kind?.includes('island')
      || block.kind === 'catwalk'
      || block.kind === 'factory-deck'
      || block.kind === 'upper-module';
  }

  isStepLike(block) {
    return block.kind?.includes('steps')
      || block.kind?.includes('landing')
      || block.kind?.includes('ramp');
  }

  keepInsideArena(position) {
    position.x = clamp(position.x, -ARENA_LIMIT, ARENA_LIMIT);
    position.z = clamp(position.z, -ARENA_LIMIT, ARENA_LIMIT);
  }

  resolve(position, velocity = null, dt = 0) {
    if (velocity) {
      velocity.y -= GRAVITY * dt;
      position.y += velocity.y * dt;
    }

    this.keepInsideArena(position);
    let floorY = FLOOR_Y;

    for (const block of this.blocks) {
      const insideX = Math.abs(position.x - block.x) < block.w / 2 + PLAYER_RADIUS;
      const insideZ = Math.abs(position.z - block.z) < block.d / 2 + PLAYER_RADIUS;
      if (!insideX || !insideZ) {
        continue;
      }
      const blockTop = block.y + block.h / 2 + PLAYER_RADIUS;
      const blockBottom = block.y - block.h / 2;
      const verticalGap = blockTop - position.y;
      const canStepOnto = this.isFloorLike(block)
        && (!velocity || velocity.y <= 0)
        && verticalGap <= MAX_STEP_UP
        && verticalGap >= -FLOOR_SNAP_DOWN;
      if (canStepOnto) {
        floorY = Math.max(floorY, blockTop);
        continue;
      }
      if (this.isFloorLike(block) && verticalGap < -FLOOR_SNAP_DOWN) {
        continue;
      }
      const hitCeiling = velocity && velocity.y > 0 && position.y >= blockBottom - PLAYER_RADIUS && position.y < blockTop - 0.75;
      if (hitCeiling) {
        position.y = blockBottom - PLAYER_RADIUS - 0.02;
        velocity.y = 0;
        continue;
      }
      if (this.isFloorLike(block) && !this.isStepLike(block) && verticalGap > MAX_STEP_UP) {
        continue;
      }
      if (position.y > blockTop + PLAYER_HEIGHT || position.y < blockBottom - PLAYER_RADIUS) {
        continue;
      }
      const pushX = block.w / 2 + PLAYER_RADIUS - Math.abs(position.x - block.x);
      const pushZ = block.d / 2 + PLAYER_RADIUS - Math.abs(position.z - block.z);
      if (pushX < pushZ) {
        position.x += position.x > block.x ? pushX : -pushX;
      } else {
        position.z += position.z > block.z ? pushZ : -pushZ;
      }
    }

    if (position.y <= floorY) {
      position.y = floorY;
      if (velocity) {
        velocity.y = 0;
      }
      return true;
    }
    return false;
  }

  move(position, velocity, movement, dt = 0) {
    position.x += movement.x;
    this.resolve(position, null, 0);
    position.z += movement.z;
    return this.resolve(position, velocity, dt);
  }

  jump(player) {
    if (!player.isGrounded) {
      return;
    }
    player.velocity.y = JUMP_SPEED;
    player.isGrounded = false;
  }

  hitsSolid(position) {
    if (Math.abs(position.x) > ARENA_LIMIT || Math.abs(position.z) > ARENA_LIMIT) {
      return true;
    }
    return this.blocks.some((block) => (
      Math.abs(position.x - block.x) <= block.w / 2
      && Math.abs(position.z - block.z) <= block.d / 2
      && position.y >= block.y - block.h / 2
      && position.y <= block.y + block.h / 2
    ));
  }

  isOnRaisedBlock(position) {
    return this.blocks.some((block) => {
      const blockTop = block.y + block.h / 2 + PLAYER_RADIUS;
      return Math.abs(position.x - block.x) <= block.w / 2 + PLAYER_RADIUS
        && Math.abs(position.z - block.z) <= block.d / 2 + PLAYER_RADIUS
        && Math.abs(position.y - blockTop) < 0.35;
    });
  }
}
