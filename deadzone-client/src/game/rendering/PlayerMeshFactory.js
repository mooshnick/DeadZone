import * as THREE from 'three';
import { OUTFITS, PLAYER_RADIUS, WEAPON_SKINS } from '../config';
import { NameSpriteFactory } from './NameSpriteFactory';

export class PlayerMeshFactory {
  constructor(localId) {
    this.localId = localId;
  }

  create(player) {
    const group = new THREE.Group();
    const outfit = OUTFITS.find((item) => item.id === player.outfitId) || OUTFITS[0];
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: player.team === 'blue' ? '#1c86ee' : '#e33d4e',
      roughness: 0.45,
    });
    const shellMaterial = new THREE.MeshStandardMaterial({ color: outfit.shell, roughness: 0.38 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(PLAYER_RADIUS, 28, 20), shellMaterial);
    body.position.y = 1.35;
    body.scale.y = 1.18;
    body.castShadow = true;

    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, 0.62, 28), bodyMaterial);
    band.position.y = 0.72;
    band.castShadow = true;

    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.34, 0.18), new THREE.MeshStandardMaterial({ color: '#0b1018' }));
    visor.position.set(0, 1.55, -0.98);

    const weaponSkin = WEAPON_SKINS.find((item) => item.id === player.weaponSkinId) || WEAPON_SKINS[0];
    const weapon = this.createWeapon(player.weaponId, weaponSkin.color || outfit.trim);
    const healthBar = this.createHealthBar(player);

    group.add(body, band, visor, weapon, healthBar);
    if (player.id !== this.localId) {
      player.nameSprite = NameSpriteFactory.create(player.name);
      player.nameSprite.position.set(0, 3.35, 0);
      group.add(player.nameSprite);
    }
    player.mesh = group;
    return group;
  }

  createHealthBar(player) {
    const bar = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 0.28),
      new THREE.MeshBasicMaterial({ color: '#101722', transparent: true, opacity: 0.92 }),
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(2.12, 0.14),
      new THREE.MeshBasicMaterial({ color: player.team === 'blue' ? '#51b7ff' : '#ff6676' }),
    );
    fill.position.set(-0.01, 0, 0.01);
    fill.geometry.translate(1.06, 0, 0);
    fill.position.x = -1.06;

    bar.position.set(0, 3.05, 0);
    bar.add(frame, fill);
    player.healthBar = bar;
    player.healthFill = fill;
    return bar;
  }

  createWeapon(weaponId, trimColor) {
    const material = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.35, metalness: 0.18 });
    const dark = new THREE.MeshStandardMaterial({ color: '#111820', roughness: 0.5, metalness: 0.28 });
    const group = new THREE.Group();
    group.position.set(0.78, 1.05, -1.05);

    if (weaponId === 'sniper') {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.65), material);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.65, 16), dark);
      scope.rotation.z = Math.PI / 2;
      scope.position.set(0, 0.28, -0.45);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.58), dark);
      stock.position.z = 0.68;
      group.add(barrel, scope, stock);
      return group;
    }

    if (weaponId === 'shotgun') {
      const topBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 1.95), material);
      const bottomBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 1.95), material);
      topBarrel.position.y = 0.11;
      bottomBarrel.position.y = -0.11;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.42), dark);
      grip.position.z = 0.6;
      group.add(topBarrel, bottomBarrel, grip);
      return group;
    }

    if (weaponId === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 1.18), material);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.24), dark);
      mag.position.set(0, -0.38, 0.1);
      group.add(body, mag);
      return group;
    }

    if (weaponId === 'blaster') {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), material);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 1.35, 16), material);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.78;
      group.add(core, barrel);
      return group;
    }

    if (weaponId === 'rpg') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 2.25, 18), material);
      tube.rotation.x = Math.PI / 2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.58, 18), dark);
      cone.rotation.x = -Math.PI / 2;
      cone.position.z = -1.34;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.22), dark);
      handle.position.set(0, -0.42, 0.24);
      group.add(tube, cone, handle);
      return group;
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.8), material);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.24), dark);
    magazine.position.set(0, -0.34, 0.15);
    group.add(body, magazine);
    return group;
  }
}
