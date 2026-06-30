import * as THREE from 'three';
import { ACCESSORIES, OUTFITS, PLAYER_RADIUS, WEAPON_SKINS } from '../config.js';
import { NameSpriteFactory } from './NameSpriteFactory.js';

export class PlayerMeshFactory {
  constructor(localId) {
    this.localId = localId;
  }

  create(player) {
    const group = new THREE.Group();
    const outfit = OUTFITS.find((item) => item.id === player.outfitId) || OUTFITS[0];
    const shellColor = outfit.displayColor || outfit.shell;
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.45 });
    const shellMaterial = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.38 });
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
    player.weaponModel = weapon;
    player.weaponMuzzle = weapon.userData.muzzle;
    const healthBar = this.createHealthBar(player);
    const accessories = this.createAccessories(player.accessoryIds || []);

    this.safeAdd(group, body, band, visor, weapon, healthBar, ...accessories);
    if (player.id !== this.localId) {
      player.nameSprite = NameSpriteFactory.create(player.name);
      player.nameSprite.position.set(0, 3.35, 0);
      this.safeAdd(group, player.nameSprite);
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
      new THREE.MeshBasicMaterial({
        color: player.gameMode === 'free-for-all' ? '#ffc247' : player.team === 'blue' ? '#51b7ff' : '#ff6676',
      }),
    );
    fill.position.set(-0.01, 0, 0.01);
    fill.geometry.translate(1.06, 0, 0);
    fill.position.x = -1.06;

    bar.position.set(0, 3.05, 0);
    this.safeAdd(bar, frame, fill);
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
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.95), material);
      receiver.position.z = 0.3;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.9, 14), material);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -1.45;
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 14), dark);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.z = -2.95;
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.82, 16), dark);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.32, -0.25);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.68), dark);
      stock.position.z = 0.92;
      this.safeAdd(group, receiver, barrel, muzzle, scope, stock);
      return this.attachMuzzle(group, [0, 0, -3.15]);
    }

    if (weaponId === 'shotgun') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 1.2), material);
      body.position.z = -0.15;
      const leftBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.35, 16), dark);
      leftBarrel.rotation.x = Math.PI / 2;
      leftBarrel.position.set(-0.16, 0.08, -0.85);
      const rightBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.35, 16), dark);
      rightBarrel.rotation.x = Math.PI / 2;
      rightBarrel.position.set(0.16, 0.08, -0.85);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.48), dark);
      pump.position.z = -0.4;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.24), dark);
      grip.rotation.x = -0.35;
      grip.position.set(0, -0.35, 0.32);
      this.safeAdd(group, body, leftBarrel, rightBarrel, pump, grip);
      return this.attachMuzzle(group, [0, 0.08, -1.58]);
    }

    if (weaponId === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.9), material);
      body.position.z = -0.12;
      const shortBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.58, 14), dark);
      shortBarrel.rotation.x = Math.PI / 2;
      shortBarrel.position.z = -0.78;
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.22), dark);
      mag.rotation.x = -0.25;
      mag.position.set(0, -0.5, 0.12);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.45), dark);
      stock.position.z = 0.58;
      this.safeAdd(group, body, shortBarrel, mag, stock);
      return this.attachMuzzle(group, [0, 0, -1.12]);
    }

    if (weaponId === 'blaster') {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), material);
      core.position.z = 0.05;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 1.25, 18), material);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.72;
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 10, 24), dark);
      ringA.position.z = -0.45;
      const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 10, 24), dark);
      ringB.position.z = -1.18;
      this.safeAdd(group, core, barrel, ringA, ringB);
      return this.attachMuzzle(group, [0, 0, -1.42]);
    }

    if (weaponId === 'rpg') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 2.45, 20), material);
      tube.rotation.x = Math.PI / 2;
      const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.28, 18), dark);
      rear.rotation.x = Math.PI / 2;
      rear.position.z = 1.25;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.72, 20), dark);
      cone.rotation.x = -Math.PI / 2;
      cone.position.z = -1.55;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.68, 0.24), dark);
      handle.position.set(0, -0.48, 0.2);
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.46), dark);
      sight.position.set(0, 0.42, -0.2);
      this.safeAdd(group, tube, rear, cone, handle, sight);
      return this.attachMuzzle(group, [0, 0, -1.94]);
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 1.45), material);
    body.position.z = -0.1;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.8, 14), material);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -1.18;
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.25), dark);
    magazine.rotation.x = -0.18;
    magazine.position.set(0, -0.43, 0.15);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.52), dark);
    stock.position.z = 0.78;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.36), dark);
    sight.position.set(0, 0.28, -0.36);
    this.safeAdd(group, body, barrel, magazine, stock, sight);
    return this.attachMuzzle(group, [0, 0, -1.62]);
  }

  attachMuzzle(group, [x, y, z]) {
    const muzzle = new THREE.Object3D();
    muzzle.name = 'weapon-muzzle';
    muzzle.position.set(x, y, z);
    this.safeAdd(group, muzzle);
    group.userData.muzzle = muzzle;
    return group;
  }

  safeAdd(parent, ...children) {
    parent.add(...children.filter((child) => child instanceof THREE.Object3D));
  }

  createAccessories(accessoryIds) {
    return accessoryIds
      .map((id) => ACCESSORIES.find((item) => item.id === id))
      .filter(Boolean)
      .flatMap((accessory) => {
        const material = new THREE.MeshStandardMaterial({
          color: accessory.color,
          emissive: accessory.color,
          emissiveIntensity: 0.08,
          roughness: 0.38,
        });
        if (accessory.slot === 'hat') {
          if (accessory.id === 'party-hat') {
            const party = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.86, 20), material);
            party.position.set(0, 3.05, 0);
            return [party];
          }
          const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.18, 20), material);
          brim.position.set(0, 2.77, 0);
          const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.56, 0.48, 18), material);
          top.position.set(0, 3.1, 0);
          if (accessory.id === 'propeller-hat') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8), material);
            stem.position.set(0, 3.44, 0);
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.12), material);
            blade.position.set(0, 3.6, 0);
            return [brim, top, stem, blade];
          }
          return [brim, top];
        }
        if (accessory.slot === 'glasses') {
          const glasses = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.08), material);
          glasses.position.set(0, 1.6, -1.08);
          return [glasses];
        }
        if (accessory.slot === 'tail') {
          const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.95, 14), material);
          tail.rotation.x = -Math.PI / 2;
          tail.position.set(0, 1.0, 1.2);
          return [tail];
        }
        if (accessory.slot === 'shoes') {
          if (['skateboard', 'surfboard'].includes(accessory.id)) {
            const board = new THREE.Mesh(new THREE.BoxGeometry(accessory.id === 'surfboard' ? 1.85 : 1.32, 0.14, 0.45), material);
            board.position.set(0, -0.02, -0.18);
            const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.42 });
            const wheels = [-0.45, 0.45].flatMap((x) => [-0.42, 0.08].map((z) => {
              const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10), wheelMaterial);
              wheel.rotation.z = Math.PI / 2;
              wheel.position.set(x, -0.12, z);
              return wheel;
            }));
            return accessory.id === 'skateboard' ? [board, ...wheels] : [board];
          }
          if (accessory.id === 'bimba') {
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 0.9), material);
            body.position.set(0, 0.03, -0.18);
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 8), material);
            handle.rotation.x = Math.PI / 2;
            handle.position.set(0, 0.32, -0.66);
            return [body, handle];
          }
          if (accessory.id === 'segway') {
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 0.32), material);
            base.position.set(0, -0.02, -0.18);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 10), material);
            pole.position.set(0, 0.45, -0.34);
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.08), material);
            handle.position.set(0, 0.92, -0.34);
            return [base, pole, handle];
          }
          const left = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.32, 0.78), material);
          left.position.set(-0.5, 0.14, -0.28);
          const right = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.32, 0.78), material);
          right.position.set(0.5, 0.14, -0.28);
          return [left, right];
        }
        if (accessory.slot === 'belt') {
          const belt = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 10, 32), material);
          belt.rotation.x = Math.PI / 2;
          belt.position.y = 0.78;
          const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.12), material);
          buckle.position.set(0, 0.78, -1.02);
          return [belt, buckle];
        }
        if (accessory.slot === 'backpack') {
          const pack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.96, 0.34), material);
          pack.position.set(0, 1.15, 1.06);
          const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.86, 16), material);
          roll.rotation.z = Math.PI / 2;
          roll.position.set(0, 1.68, 1.28);
          return [pack, roll];
        }
        if (accessory.slot === 'watch') {
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), material);
          band.position.set(1.1, 0.92, -0.62);
          const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), material);
          face.position.set(1.18, 0.92, -0.72);
          return [band, face];
        }
        if (accessory.slot === 'nose') {
          if (accessory.id === 'clown-nose') {
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), material);
            nose.position.set(0, 1.44, -1.16);
            return [nose];
          }
          const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 16), material);
          beak.rotation.x = -Math.PI / 2;
          beak.position.set(0, 1.42, -1.26);
          return [beak];
        }
        if (accessory.slot === 'hair') {
          return [-0.25, 0, 0.25].map((x) => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 10), material);
            spike.position.set(x, 2.5 + Math.abs(x) * 0.16, -0.05);
            spike.rotation.z = -x * 0.8;
            return spike;
          });
        }
        if (accessory.slot === 'shirt') {
          const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.74, 0.13), material);
          shirt.position.set(0, 1.16, -1.08);
          if (accessory.id !== 'shirt-stripes') return [shirt];
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.76, 0.15), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.34 }));
          stripe.position.set(0, 1.16, -1.16);
          return [shirt, stripe];
        }
        return [];
      });
  }
}
