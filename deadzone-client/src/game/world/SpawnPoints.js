import * as THREE from 'three';

export function spawnFor(team, index = 0, mapId = 'foundry') {
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
  const side = team === 'blue' ? -1 : 1;
  return new THREE.Vector3(side * (28 + index * 2), 1.25, -18 + index * 7);
}
