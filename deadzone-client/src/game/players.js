import { BotPlayer } from './entities/BotPlayer';
import { PlayerEntity } from './entities/PlayerEntity';
import { NameSpriteFactory } from './rendering/NameSpriteFactory';
import { spawnFor } from './world/SpawnPoints';

export { spawnFor };

export function makePlayer(options) {
  return new PlayerEntity(options);
}

export function makeBot(options) {
  return new BotPlayer(options);
}

export function createNameSprite(text) {
  return NameSpriteFactory.create(text);
}
