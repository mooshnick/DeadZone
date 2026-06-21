import {
  BARREL,
  CHARACTER_CLASSES,
  GAME_WORLD,
  INITIAL_PLAYER_POSITION,
  MOVEMENT,
  PLAYER_SIZE,
  PROJECTILE_SIZE
} from './gameConstants';

export class CanvasEngine {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.inputManager = options.inputManager;
    this.localPlayerId = options.localPlayerId;
    this.localCharacterClass = options.localCharacterClass;
    this.onLocalPlayerMove = options.onLocalPlayerMove;
    this.onLocalPlayerShoot = options.onLocalPlayerShoot;
    this.players = [];
    this.projectiles = [];
    this.localPosition = { ...INITIAL_PLAYER_POSITION };
    this.aimAngle = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.animationFrameId = null;
    this.previousFrameTime = 0;
    this.lastNetworkUpdateTime = 0;
  }

  start() {
    this.previousFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  setPlayers(players) {
    this.players = Array.isArray(players) ? players : [];
  }

  setProjectiles(projectiles) {
    this.projectiles = Array.isArray(projectiles) ? projectiles : [];
  }

  tick(timestamp) {
    const deltaSeconds = Math.min(
      (timestamp - this.previousFrameTime) / 1000,
      MOVEMENT.maxDeltaSeconds
    );

    this.previousFrameTime = timestamp;
    this.updateLocalPlayer(deltaSeconds, timestamp);
    this.updateAimAngle();
    this.handleShooting();
    this.render();
    this.animationFrameId = requestAnimationFrame((time) => this.tick(time));
  }

  updateLocalPlayer(deltaSeconds, timestamp) {
    const input = this.inputManager.getInputState();
    const previousPosition = { ...this.localPosition };

    if (input.moveLeft && !input.moveRight) {
      this.localPosition.x -= this.getLocalMovementSpeed() * deltaSeconds;
    }

    if (input.moveRight && !input.moveLeft) {
      this.localPosition.x += this.getLocalMovementSpeed() * deltaSeconds;
    }

    if (input.jump && this.isGrounded) {
      this.velocityY = MOVEMENT.jumpVelocity;
      this.isGrounded = false;
    }

    this.velocityY += MOVEMENT.gravity * deltaSeconds;
    this.localPosition.y += this.velocityY * deltaSeconds;
    this.clampLocalPlayerToWorld();

    if (this.hasPositionChanged(previousPosition) && this.canSendNetworkUpdate(timestamp)) {
      this.lastNetworkUpdateTime = timestamp;
      this.onLocalPlayerMove({
        playerId: this.localPlayerId,
        x: Math.round(this.localPosition.x),
        y: Math.round(this.localPosition.y)
      });
    }
  }

  clampLocalPlayerToWorld() {
    const minX = 0;
    const maxX = GAME_WORLD.width - PLAYER_SIZE.width;
    const floorY = GAME_WORLD.floorY - PLAYER_SIZE.height;

    this.localPosition.x = Math.max(minX, Math.min(maxX, this.localPosition.x));

    if (this.localPosition.y >= floorY) {
      this.localPosition.y = floorY;
      this.velocityY = 0;
      this.isGrounded = true;
    }
  }

  hasPositionChanged(previousPosition) {
    return (
      Math.round(previousPosition.x) !== Math.round(this.localPosition.x) ||
      Math.round(previousPosition.y) !== Math.round(this.localPosition.y)
    );
  }

  canSendNetworkUpdate(timestamp) {
    return timestamp - this.lastNetworkUpdateTime >= MOVEMENT.networkTickMs;
  }

  getLocalMovementSpeed() {
    return CHARACTER_CLASSES[this.localCharacterClass]?.movementSpeed ?? MOVEMENT.speed;
  }

  updateAimAngle() {
    const mousePosition = this.inputManager.getMousePosition();
    if (!mousePosition) {
      return;
    }

    const center = this.getLocalPlayerCenter();
    this.aimAngle = Math.atan2(mousePosition.y - center.y, mousePosition.x - center.x);
  }

  handleShooting() {
    if (!this.inputManager.consumeShootRequest()) {
      return;
    }

    const center = this.getLocalPlayerCenter();
    this.onLocalPlayerShoot({
      playerId: this.localPlayerId,
      x: Math.round(center.x),
      y: Math.round(center.y),
      angle: this.aimAngle
    });
  }

  getLocalPlayerCenter() {
    return this.getPlayerCenter(this.localPosition);
  }

  getPlayerCenter(player) {
    return {
      x: player.x + PLAYER_SIZE.width / 2,
      y: player.y + PLAYER_SIZE.height / 2
    };
  }

  render() {
    this.drawBackground();
    this.drawProjectiles();
    this.drawPlayers();
  }

  drawBackground() {
    this.context.clearRect(0, 0, GAME_WORLD.width, GAME_WORLD.height);
    this.context.fillStyle = '#151923';
    this.context.fillRect(0, 0, GAME_WORLD.width, GAME_WORLD.height);
    this.context.fillStyle = '#252b37';
    this.context.fillRect(0, GAME_WORLD.floorY, GAME_WORLD.width, GAME_WORLD.height - GAME_WORLD.floorY);
  }

  drawPlayers() {
    const playersById = new Map(this.players.map((player) => [player.id, player]));
    playersById.set(this.localPlayerId, {
      id: this.localPlayerId,
      x: Math.round(this.localPosition.x),
      y: Math.round(this.localPosition.y),
      characterClass: this.localCharacterClass,
      bot: false
    });

    for (const player of playersById.values()) {
      this.drawPlayer(player);
    }
  }

  drawPlayer(player) {
    const isLocalPlayer = player.id === this.localPlayerId;

    this.context.fillStyle = this.getPlayerColor(player, isLocalPlayer);
    this.context.fillRect(player.x, player.y, PLAYER_SIZE.width, PLAYER_SIZE.height);

    if (isLocalPlayer) {
      this.drawAimIndicator(player);
    }

    this.context.fillStyle = '#d8dee9';
    this.context.font = '12px system-ui, sans-serif';
    this.context.fillText(this.getPlayerLabel(player, isLocalPlayer), player.x, player.y - 8);
  }

  getPlayerColor(player, isLocalPlayer) {
    if (player.bot) {
      return '#e97171';
    }

    if (isLocalPlayer) {
      return CHARACTER_CLASSES[player.characterClass]?.color ?? '#62d2a2';
    }

    return '#c678dd';
  }

  getPlayerLabel(player, isLocalPlayer) {
    if (isLocalPlayer) {
      return 'you';
    }

    return player.bot ? 'bot' : 'player';
  }

  drawAimIndicator(player) {
    const center = this.getPlayerCenter(player);
    const endX = center.x + Math.cos(this.aimAngle) * BARREL.length;
    const endY = center.y + Math.sin(this.aimAngle) * BARREL.length;

    this.context.strokeStyle = '#f6d365';
    this.context.lineWidth = BARREL.width;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(center.x, center.y);
    this.context.lineTo(endX, endY);
    this.context.stroke();
  }

  drawProjectiles() {
    this.context.fillStyle = '#f6d365';

    for (const projectile of this.projectiles) {
      this.context.beginPath();
      this.context.arc(projectile.x, projectile.y, PROJECTILE_SIZE.radius, 0, Math.PI * 2);
      this.context.fill();
    }
  }
}
