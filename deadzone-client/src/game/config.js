export const MAX_PLAYERS = 6;
export const BOT_NAMES = ['Byte', 'Nova', 'Rift', 'Vex', 'Echo'];
export const PLAYER_RADIUS = 1.15;
export const ARENA_LIMIT = 66;
export const PLAYER_HEIGHT = 2.5;
export const PLAYER_EYE_HEIGHT = 1.75;
export const FLOOR_Y = 1.25;
export const GRAVITY = 34;
export const JUMP_SPEED = 18.5;
export const KILL_SCORE = 100;
export const ASSIST_SCORE = 40;
export const KILL_REWARD = 25;
export const ASSIST_REWARD = 8;
export const KILL_XP = 120;
export const ASSIST_XP = 45;
export const ASSIST_WINDOW = 7000;
export const DEFAULT_GAME_MODE = 'team-deathmatch';

export const GAME_MODES = [
  { id: 'team-deathmatch', name: 'Red vs Blue', short: 'TDM', description: 'Two teams fight for eliminations.' },
  { id: 'free-for-all', name: 'Free For All', short: 'FFA', description: 'Every player is an enemy.' },
  { id: 'capture-flag', name: 'Capture the Flag', short: 'CTF', description: 'Bring the enemy flag home while your flag is safe.' },
  { id: 'attack-defend', name: 'Attackers vs Defenders', short: 'A/D', description: 'Red plants the sword. Blue defends the zone.' },
  { id: 'circle-control', name: 'Circle Control', short: 'Zones', description: 'Stand inside circles to capture and score.' },
];

export const GAME_MODE_RULES = {
  'team-deathmatch': { minScore: 20, maxScore: 60, defaultScore: 30, scoreStep: 5 },
  'free-for-all': { minScore: 15, maxScore: 50, defaultScore: 25, scoreStep: 5 },
  'capture-flag': { minScore: 3, maxScore: 15, defaultScore: 5, scoreStep: 1 },
  'attack-defend': { minScore: 15, maxScore: 60, defaultScore: 30, scoreStep: 5 },
  'circle-control': { minScore: 10, maxScore: 30, defaultScore: 20, scoreStep: 5 },
};

export const MATCH_TIME_OPTIONS = [5, 10, 15, 20];

const premiumPrice = (price) => (price === 0 ? 0 : Math.round(price * 2.4));

export const WEAPONS = {
  rifle: { name: 'Auto Rifle', tag: 'Controlled recoil', unlockLevel: 1, damage: 16, speed: 1.2, cooldown: 120, pellets: 1, spread: 0.026, color: '#79c9ff', magazineSize: 30, reloadTime: 1450, recoilPitch: 0.028, recoilYaw: 0.024, recoilRecovery: 0.024 },
  shotgun: { name: 'Shotgun', tag: 'Kickback shells', unlockLevel: 2, damage: 14, speed: 1.05, cooldown: 620, pellets: 8, spread: 0.17, color: '#ffd36b', magazineSize: 2, reloadTime: 1900, recoilPitch: 0.105, recoilYaw: 0.055, recoilRecovery: 0.016 },
  smg: { name: 'SMG', tag: 'Fast spray', unlockLevel: 3, damage: 10, speed: 1.25, cooldown: 80, pellets: 1, spread: 0.04, color: '#bdfbff', magazineSize: 40, reloadTime: 1300, recoilPitch: 0.024, recoilYaw: 0.038, recoilRecovery: 0.026 },
  sniper: { name: 'Sniper', tag: 'One shot mag', unlockLevel: 4, damage: 72, speed: 1.9, cooldown: 780, pellets: 1, spread: 0, color: '#f9fbff', magazineSize: 1, reloadTime: 1650, recoilPitch: 0, recoilYaw: 0 },
  blaster: { name: 'Pulse Blaster', tag: 'Balanced kick', unlockLevel: 5, damage: 25, speed: 0.95, cooldown: 260, pellets: 1, spread: 0.018, color: '#c98cff', magazineSize: 14, reloadTime: 1600, recoilPitch: 0.04, recoilYaw: 0.024, recoilRecovery: 0.017 },
  rpg: { name: 'RPG', tag: 'Heavy blast', unlockLevel: 7, damage: 74, speed: 0.62, cooldown: 950, pellets: 1, spread: 0.012, color: '#ff884d', magazineSize: 1, reloadTime: 3200, recoilPitch: 0.12, recoilYaw: 0.03, recoilRecovery: 0.012, explosiveRadius: 8.8 },
};

export const OUTFITS = [
  { id: 'classic', name: 'Classic Shell', shell: '#f3f7ff', trim: '#cbd8ea', price: 0 },
  { id: 'shadow', name: 'Shadow Ops', shell: '#2f3746', trim: '#7b88a0', price: premiumPrice(40) },
  { id: 'neon', name: 'Neon Runner', shell: '#ff5fd2', trim: '#ffd1f2', price: premiumPrice(65) },
  { id: 'forest', name: 'Forest Guard', shell: '#35c864', trim: '#d8ffd8', price: premiumPrice(85) },
  { id: 'gold', name: 'Gold Unit', shell: '#f5c84b', trim: '#fff1b7', price: premiumPrice(120) },
  { id: 'lava', name: 'Lava Core', shell: '#ff5b2e', trim: '#ffd0bd', price: premiumPrice(160) },
  { id: 'knight', name: 'Castle Knight', shell: '#dce4ed', trim: '#7d8a99', price: premiumPrice(140) },
  { id: 'striker', name: 'Pitch Striker', shell: '#38d16a', trim: '#f7fff3', price: premiumPrice(110) },
];

export const WEAPON_SKINS = [
  { id: 'standard', name: 'Standard Steel', color: '#cbd8ea', price: 0 },
  { id: 'ember', name: 'Ember Barrel', color: '#ff7a3d', price: premiumPrice(55) },
  { id: 'arctic', name: 'Arctic Chrome', color: '#9cf7ff', price: premiumPrice(70) },
  { id: 'toxic', name: 'Toxic Glow', color: '#78ff73', price: premiumPrice(90) },
  { id: 'royal', name: 'Royal Guard', color: '#d8b4ff', price: premiumPrice(120) },
  { id: 'goldline', name: 'Goldline', color: '#f5c84b', price: premiumPrice(160) },
];

export const GRENADE_SKINS = [
  { id: 'standard', name: 'Field Grenade', color: '#687386', price: 0 },
  { id: 'signal', name: 'Signal Red', color: '#ef4444', price: premiumPrice(45) },
  { id: 'plasma', name: 'Plasma Core', color: '#22d3ee', price: premiumPrice(80) },
  { id: 'royal', name: 'Royal Charge', color: '#f5c84b', price: premiumPrice(120) },
];

export const ACCESSORIES = [
  { id: 'cap-red', slot: 'hat', name: 'Red Cap', color: '#ef4444', price: premiumPrice(45) },
  { id: 'crown', slot: 'hat', name: 'Gold Crown', color: '#f5c84b', price: premiumPrice(130) },
  { id: 'propeller-hat', slot: 'hat', name: 'Propeller Hat', color: '#22d3ee', price: premiumPrice(95) },
  { id: 'party-hat', slot: 'hat', name: 'Party Hat', color: '#c084fc', price: premiumPrice(75) },
  { id: 'visor-blue', slot: 'glasses', name: 'Blue Visor', color: '#38bdf8', price: premiumPrice(60) },
  { id: 'shades', slot: 'glasses', name: 'Dark Shades', color: '#111827', price: premiumPrice(75) },
  { id: 'clear-glasses', slot: 'glasses', name: 'Clear Glasses', color: '#dbeafe', price: premiumPrice(55) },
  { id: 'tail-neon', slot: 'tail', name: 'Neon Tail', color: '#78ff73', price: premiumPrice(90) },
  { id: 'tail-lava', slot: 'tail', name: 'Lava Tail', color: '#ff5b2e', price: premiumPrice(110) },
  { id: 'boots-speed', slot: 'shoes', name: 'Speed Boots', color: '#f97316', price: premiumPrice(80) },
  { id: 'boots-ice', slot: 'shoes', name: 'Ice Boots', color: '#9cf7ff', price: premiumPrice(95) },
  { id: 'boots-gold', slot: 'shoes', name: 'Gold Boots', color: '#f5c84b', price: premiumPrice(115) },
  { id: 'skateboard', slot: 'shoes', name: 'Skateboard', color: '#22d3ee', price: premiumPrice(150) },
  { id: 'surfboard', slot: 'shoes', name: 'Surfboard', color: '#fb7185', price: premiumPrice(170) },
  { id: 'bimba', slot: 'shoes', name: 'Mini Ride', color: '#ef4444', price: premiumPrice(140) },
  { id: 'segway', slot: 'shoes', name: 'Segway', color: '#94a3b8', price: premiumPrice(190) },
  { id: 'belt-tactical', slot: 'belt', name: 'Tactical Belt', color: '#94a3b8', price: premiumPrice(70) },
  { id: 'belt-champion', slot: 'belt', name: 'Champion Belt', color: '#facc15', price: premiumPrice(145) },
  { id: 'backpack-field', slot: 'backpack', name: 'Field Backpack', color: '#64748b', price: premiumPrice(95) },
  { id: 'backpack-neon', slot: 'backpack', name: 'Neon Backpack', color: '#22c55e', price: premiumPrice(135) },
  { id: 'watch-blue', slot: 'watch', name: 'Blue Watch', color: '#38bdf8', price: premiumPrice(55) },
  { id: 'watch-gold', slot: 'watch', name: 'Gold Watch', color: '#f5c84b', price: premiumPrice(105) },
  { id: 'duck-nose', slot: 'nose', name: 'Duck Nose', color: '#f59e0b', price: premiumPrice(85) },
  { id: 'clown-nose', slot: 'nose', name: 'Clown Nose', color: '#ef4444', price: premiumPrice(70) },
  { id: 'hair-spikes', slot: 'hair', name: 'Spiky Hair', color: '#111827', price: premiumPrice(90) },
  { id: 'hair-pink', slot: 'hair', name: 'Pink Hair', color: '#fb7185', price: premiumPrice(95) },
  { id: 'shirt-football-blue', slot: 'shirt', name: 'Blue Football Shirt', color: '#2563eb', price: premiumPrice(120) },
  { id: 'shirt-football-red', slot: 'shirt', name: 'Red Football Shirt', color: '#dc2626', price: premiumPrice(120) },
  { id: 'shirt-stripes', slot: 'shirt', name: 'Striped Shirt', color: '#10b981', price: premiumPrice(135) },
];

export const POWERUPS = {
  health: { name: 'Health', short: '+HP', color: '#58e59a', duration: 0 },
  damage: { name: 'Power Shot', short: 'DMG', color: '#ffce57', duration: 9500 },
  shield: { name: 'Shield', short: 'DEF', color: '#74d7ff', duration: 9500 },
  speed: { name: 'Speed', short: 'SPD', color: '#c993ff', duration: 8500 },
  rapid: { name: 'Rapid Fire', short: 'RPD', color: '#ff8c5f', duration: 8500 },
};

export const MAPS = [
  { id: 'foundry', name: 'Iron Foundry', unlockLevel: 1, theme: 'foundry', sky: '#3a1e1a', ground: '#35251e', accent: '#f5a524' },
  { id: 'pitch', name: 'Football Pitch', unlockLevel: 1, theme: 'pitch', sky: '#7ec9ff', ground: '#245f35', accent: '#ffffff' },
  { id: 'castle', name: 'Knight Castle', unlockLevel: 2, theme: 'castle', sky: '#76879f', ground: '#323947', accent: '#c6ced8' },
  { id: 'jungle', name: 'Overgrowth', unlockLevel: 3, theme: 'jungle', sky: '#174831', ground: '#1e3525', accent: '#62e86b' },
  { id: 'lava', name: 'Lava Rift', unlockLevel: 4, theme: 'lava', sky: '#32100d', ground: '#201412', accent: '#ff5b2e', hazard: 'lava' },
  { id: 'neon', name: 'Neon Docks', unlockLevel: 5, theme: 'neon', sky: '#24164a', ground: '#191b38', accent: '#ff5fd2' },
  { id: 'ice', name: 'Ice Ridge', unlockLevel: 6, theme: 'ice', sky: '#a4e9ff', ground: '#315a76', accent: '#9cf7ff' },
  { id: 'station', name: 'Orbital Station', unlockLevel: 8, theme: 'station', sky: '#111827', ground: '#20263a', accent: '#d7e3ff' },
  { id: 'apocalyptic', name: 'Apocalyptic City', unlockLevel: 1, theme: 'apocalyptic', sky: '#111821', ground: '#25282b', accent: '#ff9f43' },
];

export const MISSIONS = [
  { id: 'first-bloods', title: 'First Blood Drill', description: 'Get 3 eliminations in any arena.', type: 'kills', target: 3, rewardMoney: 90, rewardXp: 180 },
  { id: 'team-helper', title: 'Squad Support', description: 'Earn 2 assists.', type: 'assists', target: 2, rewardMoney: 70, rewardXp: 140 },
  { id: 'rifle-control', title: 'Rifle Control', description: 'Get 5 eliminations with the Auto Rifle.', type: 'weaponKills', weaponId: 'rifle', target: 5, rewardMoney: 145, rewardXp: 260 },
  { id: 'shotgun-breach', title: 'Breach Practice', description: 'Get 3 eliminations with the Shotgun.', type: 'weaponKills', weaponId: 'shotgun', target: 3, rewardMoney: 130, rewardXp: 240 },
  { id: 'foundry-deployment', title: 'Foundry Deployment', description: 'Play 2 matches in Iron Foundry.', type: 'mapPlays', mapId: 'foundry', target: 2, rewardMoney: 110, rewardXp: 210 },
  { id: 'castle-operation', title: 'Castle Operation', description: 'Play 2 matches in Knight Castle.', type: 'mapPlays', mapId: 'castle', target: 2, rewardMoney: 150, rewardXp: 280 },
  { id: 'marksman-track', title: 'Marksman Track', description: 'Get 2 eliminations with the Sniper.', type: 'weaponKills', weaponId: 'sniper', target: 2, rewardMoney: 180, rewardXp: 330 },
];

export function levelForXp(xp = 0) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 220)) + 1);
}

export function xpForLevel(level = 1) {
  return Math.max(0, (level - 1) ** 2 * 220);
}
