import * as THREE from 'three';
import { POWERUPS } from '../config';
import { randomItem } from '../utils';

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
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 1),
      new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 0.34, roughness: 0.24 }),
    );
    mesh.position.set((Math.random() - 0.5) * 70, 1.3, (Math.random() - 0.5) * 70);
    this.scene.add(mesh);
    this.powerups.push({ type, mesh, bornAt: time });
  }

  update(time) {
    this.spawn(time);
    const players = [...this.players.values()];
    this.powerups = this.powerups.filter((powerup) => {
      powerup.mesh.rotation.y += 0.025;
      powerup.mesh.position.y = 1.25 + Math.sin(time / 420 + powerup.bornAt) * 0.22;
      const taker = players.find((player) => !player.isDead && player.position.distanceTo(powerup.mesh.position) < 2.2);
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
      return false;
    });
  }
}
