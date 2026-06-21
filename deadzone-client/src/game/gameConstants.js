export const GAME_WORLD = {
  width: 900,
  height: 500,
  floorY: 420
};

export const PLAYER_SIZE = {
  width: 32,
  height: 44
};

export const BARREL = {
  length: 28,
  width: 5
};

export const PROJECTILE_SIZE = {
  radius: 4
};

export const MOVEMENT = {
  speed: 260,
  jumpVelocity: -560,
  gravity: 1500,
  maxDeltaSeconds: 0.05,
  networkTickMs: 50
};

export const CHARACTER_CLASSES = {
  ASSAULT: {
    label: 'Assault',
    movementSpeed: 280,
    color: '#62d2a2'
  },
  TANK: {
    label: 'Tank',
    movementSpeed: 190,
    color: '#7aa2f7'
  },
  SNIPER: {
    label: 'Sniper',
    movementSpeed: 230,
    color: '#e0af68'
  }
};

export const INITIAL_PLAYER_POSITION = {
  x: 120,
  y: GAME_WORLD.floorY - PLAYER_SIZE.height
};
