export const starterRooms = [
  { id: 'ROOM-ALPHA', name: 'Alpha Rush', mapId: 'foundry', players: 3, bluePlayers: 2, redPlayers: 1, maxPlayers: 6, allowBots: true },
  { id: 'ROOM-NEON', name: 'Neon Duel', mapId: 'neon', players: 2, bluePlayers: 1, redPlayers: 1, maxPlayers: 4, allowBots: false },
  { id: 'ROOM-JUNGLE', name: 'Overgrowth Ops', mapId: 'jungle', players: 5, bluePlayers: 3, redPlayers: 2, maxPlayers: 6, allowBots: true },
];

export const savedUserKey = 'deadzone-user-id';
export const savedKeybindsKey = 'deadzone-keybinds';
export const guestProgressKey = 'deadzone-guest-progress';
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
};

export const KEYBIND_LABELS = {
  forward: 'Move Forward',
  backward: 'Move Backward',
  left: 'Move Left',
  right: 'Move Right',
  jump: 'Jump',
  reload: 'Reload',
  grenade: 'Throw Grenade',
};

export function loadKeybinds() {
  try {
    return { ...DEFAULT_KEYBINDS, ...(JSON.parse(localStorage.getItem(savedKeybindsKey)) || {}) };
  } catch {
    return DEFAULT_KEYBINDS;
  }
}
