import { BOT_NAMES, OUTFITS, WEAPONS } from '../config';
import { makeId } from '../utils';
import { PlayerEntity } from './PlayerEntity';

export class BotPlayer extends PlayerEntity {
  constructor({ index, team, mapId = 'foundry' }) {
    const outfit = OUTFITS[(index + 1) % OUTFITS.length];
    super({
      id: `bot-${index}-${makeId()}`,
      name: `${BOT_NAMES[index % BOT_NAMES.length]}${index >= BOT_NAMES.length ? ` ${Math.floor(index / BOT_NAMES.length) + 1}` : ''}`,
      team,
      weaponId: Object.keys(WEAPONS)[index % Object.keys(WEAPONS).length],
      outfitId: outfit.id,
      isBot: true,
      mapId,
      index,
    });
    this.ai = {
      lastPosition: this.position.clone(),
      expectedTravel: 0,
      stuckFor: 0,
      followingWall: false,
      wallSide: 1,
      wallHeading: this.position.clone().set(0, 0, -1),
      clearPathSince: 0,
      wallModeUntil: 0,
      sideBlockedSince: 0,
      sideSwitchCooldownUntil: 0,
      steeringDirection: this.position.clone().set(0, 0, -1),
      nextJumpAt: 0,
    };
  }
}
