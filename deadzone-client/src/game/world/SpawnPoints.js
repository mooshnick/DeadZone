import * as THREE from 'three';

const FFA_SPAWNS = {
  castle: [
    [-48, 1.25, -42], [48, 1.25, 42], [-42, 1.25, 42], [42, 1.25, -42],
    [-16, 1.25, 34], [16, 1.25, -34], [-24, 8.65, -18], [24, 8.65, 18],
  ],
  apocalyptic: [
    [-54, 1.25, -46], [52, 1.25, 44], [-46, 1.25, 42], [46, 1.25, -42],
    [-8, 1.25, 52], [12, 1.25, -52], [-56, 1.25, 4], [56, 1.25, -4],
  ],
  default: [
    [-48, 1.25, -42], [48, 1.25, 42], [-48, 1.25, 42], [48, 1.25, -42],
    [-12, 1.25, -50], [12, 1.25, 50], [-54, 1.25, 0], [54, 1.25, 0],
    [-24, 1.25, 24], [24, 1.25, -24],
  ],
};

function freeForAllSpawn(index, mapId) {
  const points = FFA_SPAWNS[mapId] || FFA_SPAWNS.default;
  const base = points[(index + Math.floor(Math.random() * points.length)) % points.length];
  return new THREE.Vector3(
    base[0] + (Math.random() - 0.5) * 5,
    base[1],
    base[2] + (Math.random() - 0.5) * 5,
  );
}

export function spawnFor(team, index = 0, mapId = 'foundry', gameMode = 'team-deathmatch') {
  if (gameMode === 'free-for-all') {
    return freeForAllSpawn(index, mapId);
  }
  if (mapId === 'castle') {
    const blueSpawns = [
      [-22, 1.65, 18],
      [-22, 8.65, 15],
      [-22, 15.65, 20],
      [-22, 22.65, 20],
    ];
    const redSpawns = [
      [22, 1.65, -18],
      [22, 8.65, -21],
      [22, 15.65, -13],
      [22, 22.65, -13],
    ];
    const point = (team === 'blue' ? blueSpawns : redSpawns)[index % 4];
    return new THREE.Vector3(...point);
  }
  if (mapId === 'apocalyptic') {
    const blueSpawns = [
      [-42, 1.25, 18],
      [-38, 1.25, -16],
      [-24, 1.25, 6],
      [-18, 1.25, 34],
    ];
    const redSpawns = [
      [42, 1.25, -18],
      [38, 1.25, 16],
      [24, 1.25, -6],
      [18, 1.25, -34],
    ];
    const point = (team === 'blue' ? blueSpawns : redSpawns)[index % 4];
    return new THREE.Vector3(...point);
  }
  if (mapId === 'zombie-outpost') {
    const squadSpawns = [
      [-10, 1.25, 12],
      [-4, 1.25, 18],
      [6, 1.25, 15],
      [12, 1.25, 8],
    ];
    return new THREE.Vector3(...squadSpawns[index % squadSpawns.length]);
  }
  const side = team === 'blue' ? -1 : 1;
  return new THREE.Vector3(side * (28 + index * 2), 1.25, -18 + index * 7);
}
