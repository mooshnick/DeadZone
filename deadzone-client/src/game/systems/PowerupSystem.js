import * as THREE from 'three';
import { POWERUPS } from '../config';
import { randomItem } from '../utils';

const POWERUP_LAND_Y = 1.3;
const POWERUP_DROP_Y = 28;
const POWERUP_DROP_SPEED = 0.0042;
const POWERUP_PICKUP_RADIUS = 2.2;
const PARACHUTE_HIDE_DELAY = 1200;

export class PowerupSystem {
  constructor({ scene, players, onEvent }) {
    this.scene = scene;
    this.players = players;
    this.onEvent = onEvent;
    this.powerups = [];
    this.lastPowerupAt = 0;
  }

  spawn(time) {
    if (this.powerups.length >= 5 || time - this.lastPowerupAt < 3800) {
      return;
    }
    this.lastPowerupAt = time;
    const type = randomItem(Object.keys(POWERUPS));
    const data = POWERUPS[type];
    const drop = this.createPowerupDrop(data);
    drop.position.set((Math.random() - 0.5) * 70, POWERUP_DROP_Y, (Math.random() - 0.5) * 70);
    this.scene.add(drop);
    this.powerups.push({ type, mesh: drop, bornAt: time, landedAt: 0 });
  }

  createPowerupDrop(data) {
    const group = new THREE.Group();
    const crateMaterial = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.28,
      roughness: 0.38,
      metalness: 0.08,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: '#1d2632',
      roughness: 0.45,
      metalness: 0.12,
    });
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: '#f3f7ff',
      emissive: data.color,
      emissiveIntensity: 0.12,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const ropeMaterial = new THREE.MeshBasicMaterial({ color: '#d8e6f5' });

    const crate = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 1.35), crateMaterial);
    const topBand = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 1.48), darkMaterial);
    topBand.position.y = 0.55;
    const bottomBand = topBand.clone();
    bottomBand.position.y = -0.55;
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 1.5), crateMaterial);
    glow.position.y = 0.03;
    crate.add(body, topBand, bottomBand, glow);
    group.add(crate);

    const parachute = new THREE.Group();
    parachute.position.y = 2.35;
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      canopyMaterial,
    );
    canopy.scale.y = 0.46;
    parachute.add(canopy);

    [
      [-0.6, 0.55, -0.6],
      [0.6, 0.55, -0.6],
      [-0.6, 0.55, 0.6],
      [0.6, 0.55, 0.6],
    ].forEach(([x, y, z]) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.35, 6), ropeMaterial);
      rope.position.set(x * 0.55, y + 0.82, z * 0.55);
      rope.rotation.x = z * 0.18;
      rope.rotation.z = -x * 0.18;
      parachute.add(rope);
    });
    group.add(parachute);

    const landingShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 24),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.26, depthWrite: false }),
    );
    landingShadow.rotation.x = -Math.PI / 2;
    landingShadow.position.y = -0.64;
    group.add(landingShadow);

    group.userData = { crate, parachute, landingShadow };
    return group;
  }

  update(time) {
    this.spawn(time);
    const players = [...this.players.values()];
    this.powerups = this.powerups.filter((powerup) => {
      const elapsed = time - powerup.bornAt;
      const nextY = Math.max(POWERUP_LAND_Y, POWERUP_DROP_Y - elapsed * POWERUP_DROP_SPEED);
      const isLanded = nextY <= POWERUP_LAND_Y + 0.001;
      powerup.mesh.position.y = isLanded
        ? POWERUP_LAND_Y + Math.sin(time / 420 + powerup.bornAt) * 0.12
        : nextY + Math.sin(time / 260) * 0.12;
      powerup.mesh.rotation.y += isLanded ? 0.025 : 0.008;
      powerup.mesh.userData.crate.rotation.y += isLanded ? 0.035 : 0.012;
      powerup.mesh.userData.landingShadow.scale.setScalar(isLanded ? 0.72 : 1 + (POWERUP_DROP_Y - nextY) / POWERUP_DROP_Y * 0.32);

      if (isLanded && !powerup.landedAt) {
        powerup.landedAt = time;
      }
      powerup.mesh.userData.parachute.visible = !powerup.landedAt || time - powerup.landedAt < PARACHUTE_HIDE_DELAY;

      const taker = isLanded
        ? players.find((player) => !player.isDead && player.position.distanceTo(powerup.mesh.position) < POWERUP_PICKUP_RADIUS)
        : null;
      if (!taker) return true;

      const data = POWERUPS[powerup.type];
      if (powerup.type === 'health') {
        taker.health = Math.min(100, taker.health + 35);
      } else {
        taker.buffs[powerup.type] = time + data.duration;
      }
      if (!taker.isBot) {
        this.onEvent(`Picked ${data.name}`);
      }
      this.scene.remove(powerup.mesh);
      powerup.mesh.traverse((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose?.());
        } else {
          child.material?.dispose?.();
        }
      });
      return false;
    });
  }
}
