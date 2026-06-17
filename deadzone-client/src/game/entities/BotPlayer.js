import { BOT_NAMES, OUTFITS, WEAPONS } from '../config';
import { makeId } from '../utils';
import { PlayerEntity } from './PlayerEntity';

export class BotPlayer extends PlayerEntity {
  constructor({ index, team, mapId = 'foundry' }) {
    const outfit = OUTFITS[(index + 1) % OUTFITS.length];
    super({
      id: `bot-${index}-${makeId()}`,
      name: BOT_NAMES[index],
      team,
      weaponId: Object.keys(WEAPONS)[index % Object.keys(WEAPONS).length],
      outfitId: outfit.id,
      isBot: true,
      mapId,
      index,
    });
    this.ai = { turnAt: 0, jumpAt: 0 };
  }
}
