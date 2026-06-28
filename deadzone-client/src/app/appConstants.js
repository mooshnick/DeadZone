export const starterRooms = [
  { id: 'ROOM-ALPHA', name: 'Alpha Rush', mapId: 'foundry', gameMode: 'team-deathmatch', scoreLimit: 30, timeLimitMinutes: 20, players: 3, bluePlayers: 2, redPlayers: 1, maxPlayers: 10, allowBots: true },
  { id: 'ROOM-CITY', name: 'City Ruins', mapId: 'apocalyptic', gameMode: 'free-for-all', scoreLimit: 25, timeLimitMinutes: 20, players: 0, bluePlayers: 0, redPlayers: 0, maxPlayers: 10, allowBots: true },
  { id: 'ROOM-NEON', name: 'Neon Duel', mapId: 'neon', gameMode: 'capture-flag', scoreLimit: 5, timeLimitMinutes: 20, players: 2, bluePlayers: 1, redPlayers: 1, maxPlayers: 10, allowBots: false },
  { id: 'ROOM-JUNGLE', name: 'Overgrowth Ops', mapId: 'jungle', gameMode: 'circle-control', scoreLimit: 20, timeLimitMinutes: 20, players: 5, bluePlayers: 3, redPlayers: 2, maxPlayers: 10, allowBots: true },
];

export const savedKeybindsKey = 'deadzone-keybinds';
export const ADMIN_WALLET = 1000000000;
export const ADMIN_XP = 10000000;

export const DEFAULT_KEYBINDS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  reload: 'KeyR',
  grenade: 'KeyQ',
  interact: 'KeyE',
};

export const KEYBIND_LABELS = {
  forward: 'Move Forward',
  backward: 'Move Backward',
  left: 'Move Left',
  right: 'Move Right',
  jump: 'Jump',
  reload: 'Reload',
  grenade: 'Throw Grenade',
  interact: 'Interact',
};

export function keybindsKeyForUser(user) {
  const identifier = typeof user === 'string' ? user : user?.username || user?.id;
  return identifier ? `${savedKeybindsKey}:${identifier}` : savedKeybindsKey;
}

export function loadKeybindsForUser(user) {
  try {
    return { ...DEFAULT_KEYBINDS, ...(JSON.parse(localStorage.getItem(keybindsKeyForUser(user))) || {}) };
  } catch {
    return DEFAULT_KEYBINDS;
  }
}
