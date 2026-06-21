import * as THREE from 'three';
import { randomItem } from '../utils';

export class GrenadeSystem {
  constructor({ scene, players, combatSystem, collisionSystem, onEvent }) {
    this.scene = scene;
    this.players = players;
    this.combatSystem = combatSystem;
    this.collisionSystem = collisionSystem;
    this.onEvent = onEvent;
    this.pickups = [];
    this.thrown = [];
    this.lastSpawnAt = 0;
  }

  update(time, dt) {
    this.spawn(time);
    this.updatePickups(time);
    this.updateThrown(dt);
  }

  throw(player, direction) {
    if (player.isDead || player.grenades <= 0) {
      return;
    }
    player.grenades -= 1;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#243042', emissive: '#53ff9a', emissiveIntensity: 0.28 }),
    );
    mesh.position.copy(player.position.clone().add(new THREE.Vector3(0, 1.65, 0)).add(direction.clone().multiplyScalar(1.3)));
    this.scene.add(mesh);
    this.thrown.push({
      ownerId: player.id,
      team: player.team,
      mesh,
      velocity: direction.clone().multiplyScalar(0.68).add(new THREE.Vector3(0, 0.45, 0)),
      fuse: 110,
    });
    this.onEvent(`${player.name} threw a grenade`);
  }

  spawn(time) {
    if (this.pickups.length >= 6 || time - this.lastSpawnAt < 5200) {
      return;
    }
    this.lastSpawnAt = time;
    const spots = [-32, -20, -8, 8, 20, 32];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({ color: '#4cff91', emissive: '#4cff91', emissiveIntensity: 0.38, roughness: 0.35 }),
    );
    mesh.position.set(randomItem(spots) + (Math.random() - 0.5) * 4, 1.15, randomItem(spots) + (Math.random() - 0.5) * 4);
    this.scene.add(mesh);
    this.pickups.push({ mesh, bornAt: time });
  }

  updatePickups(time) {
    const players = [...this.players.values()];
    this.pickups = this.pickups.filter((pickup) => {
      pickup.mesh.rotation.y += 0.04;
      pickup.mesh.position.y = 1.15 + Math.sin(time / 300 + pickup.bornAt) * 0.18;
      const taker = players.find((player) => (
        !player.isDead
        && player.grenades < 3
        && player.position.distanceTo(pickup.mesh.position) < 2.2
      ));
      if (!taker) return true;
      taker.grenades = Math.min(3, taker.grenades + 1);
      if (!taker.isBot) {
        this.onEvent('Picked grenade');
      }
      this.scene.remove(pickup.mesh);
      return false;
    });
  }

  updateThrown(dt) {
    this.thrown = this.thrown.filter((grenade) => {
      const frameScale = Math.min(2, Math.max(0.5, dt * 60));
      grenade.velocity.y -= 0.018 * frameScale;
      grenade.mesh.position.add(grenade.velocity.clone().multiplyScalar(frameScale));
      grenade.mesh.rotation.x += 0.08 * frameScale;
      grenade.mesh.rotation.z += 0.05 * frameScale;
      grenade.fuse -= frameScale;
      const hitSolid = this.collisionSystem.hitsSolid(grenade.mesh.position) || grenade.mesh.position.y <= 0.45;
      if (hitSolid) {
        grenade.velocity.multiplyScalar(0.55);
        grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.45;
      }
      if (grenade.fuse <= 0) {
        this.combatSystem.makeExplosion(grenade.mesh.position, 6.4, 58, grenade.ownerId, grenade.team);
        this.scene.remove(grenade.mesh);
        return false;
      }



      return true;
    });
  }
}
