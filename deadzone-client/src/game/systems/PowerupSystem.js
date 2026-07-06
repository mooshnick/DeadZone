import * as THREE from 'three';
import { POWERUPS } from '../config';
import { randomItem } from '../utils';

const POWERUP_LAND_Y = 1.3;
const POWERUP_DROP_Y = 28;
const POWERUP_DROP_SPEED = 0.0042;
const POWERUP_PICKUP_RADIUS = 2.2;
const PARACHUTE_HIDE_DELAY = 1200;
const POWERUP_MARKER_Y = 0.035;
const SURPRISE_SOUND_URL = '/sound/surprise.mp3';
const SURPRISE_DROP_WARNING_MS = 1800;
const SURPRISE_DROP_SPEED = 0.003;
const SURPRISE_DROP_MIN_DELAY = 120000;
const SURPRISE_DROP_MAX_DELAY = 240000;
const POWERUP_MARKER_ICONS = {
  health: '+',
  damage: '\u{1F4AA}',
  shield: '\u{1F6E1}\uFE0F',
  speed: '\u{1F3C3}',
  rapid: '\u26A1',
  surprise: '\u{1F921}',
};
const POWERUP_MARKER_COLORS = {
  health: '#40ff7a',
  damage: '#ffce57',
  shield: '#74d7ff',
  speed: '#c993ff',
  rapid: '#ff8c5f',
  surprise: '#ff55d9',
};
const SURPRISE_POWERUP = {
  name: 'Surprise Bonus',
  color: '#ff55d9',
  duration: 11500,
};

export class PowerupSystem {
  constructor({ scene, players, onEvent }) {
    this.scene = scene;
    this.players = players;
    this.onEvent = onEvent;
    this.powerups = [];
    this.lastPowerupAt = 0;
    this.markerTextures = new Map();
    this.iconTextures = new Map();
    this.colorScratch = new THREE.Color();
    this.nextSurpriseAt = this.randomSurpriseDelay(0);
    this.surpriseSound = this.createSound(SURPRISE_SOUND_URL, 0.78);
  }

  spawn(time) {
    if (this.powerups.length >= 5 || time - this.lastPowerupAt < 3800) {
      return;
    }
    this.lastPowerupAt = time;
    const type = randomItem(Object.keys(POWERUPS));
    const data = POWERUPS[type];
    const drop = this.createPowerupDrop(data, 1, type);
    const landingX = (Math.random() - 0.5) * 70;
    const landingZ = (Math.random() - 0.5) * 70;
    const marker = this.createLandingMarker(type);
    drop.position.set(landingX, POWERUP_DROP_Y, landingZ);
    marker.position.set(landingX, POWERUP_MARKER_Y, landingZ);
    this.scene.add(drop);
    this.scene.add(marker);
    this.powerups.push({ type, mesh: drop, marker, bornAt: time, landedAt: 0 });
  }

  spawnSurprise(time) {
    if (time < this.nextSurpriseAt || this.powerups.some((powerup) => powerup.type === 'surprise')) {
      return;
    }
    this.nextSurpriseAt = time + this.randomSurpriseDelay();
    const drop = this.createPowerupDrop(SURPRISE_POWERUP, 1.18, 'surprise');
    const landingX = (Math.random() - 0.5) * 70;
    const landingZ = (Math.random() - 0.5) * 70;
    const marker = this.createLandingMarker('surprise', 4.1);
    drop.position.set(landingX, POWERUP_DROP_Y + 7, landingZ);
    marker.position.set(landingX, POWERUP_MARKER_Y, landingZ);
    this.scene.add(drop);
    this.scene.add(marker);
    this.playSurpriseSound();
    this.powerups.push({
      type: 'surprise',
      mesh: drop,
      marker,
      bornAt: time,
      dropStartsAt: time + SURPRISE_DROP_WARNING_MS,
      landedAt: 0,
    });
  }

  randomSurpriseDelay(baseTime = 0) {
    return baseTime + SURPRISE_DROP_MIN_DELAY + Math.random() * (SURPRISE_DROP_MAX_DELAY - SURPRISE_DROP_MIN_DELAY);
  }

  createSound(url, volume) {
    if (typeof Audio === 'undefined') {
      return null;
    }
    const sound = new Audio(url);
    sound.preload = 'auto';
    sound.volume = volume;
    sound.load();
    return sound;
  }

  playSurpriseSound() {
    if (!this.surpriseSound) {
      return;
    }
    this.surpriseSound.pause();
    this.surpriseSound.currentTime = 0;
    this.surpriseSound.play().catch(() => {});
  }

  createLandingMarker(type, size = 3.2) {
    const material = new THREE.MeshBasicMaterial({
      map: this.markerTextureFor(type),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    marker.rotation.x = -Math.PI / 2;
    return marker;
  }

  markerTextureFor(type) {
    if (this.markerTextures.has(type)) {
      return this.markerTextures.get(type);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const color = POWERUP_MARKER_COLORS[type] || '#ffffff';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 22;
    context.strokeStyle = color;
    context.lineWidth = 12;
    context.globalAlpha = 0.9;
    context.beginPath();
    context.arc(128, 128, 104, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 0.22;
    context.fillStyle = color;
    context.beginPath();
    context.arc(128, 128, 94, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = type === 'health' ? '#40ff7a' : '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = type === 'health' ? 'bold 148px Arial' : '128px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    context.fillText(POWERUP_MARKER_ICONS[type] || '?', 128, type === 'health' ? 124 : 132);
    context.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.markerTextures.set(type, texture);
    return texture;
  }

  iconTextureFor(type) {
    if (this.iconTextures.has(type)) {
      return this.iconTextures.get(type);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const color = POWERUP_MARKER_COLORS[type] || '#ffffff';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 28;
    context.fillStyle = 'rgba(6, 10, 18, 0.78)';
    context.strokeStyle = color;
    context.lineWidth = 10;
    context.beginPath();
    context.roundRect(28, 28, 200, 200, 42);
    context.fill();
    context.stroke();
    context.fillStyle = type === 'health' ? '#40ff7a' : '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = type === 'health' ? 'bold 150px Arial' : '132px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    context.fillText(POWERUP_MARKER_ICONS[type] || '?', 128, type === 'health' ? 121 : 132);
    context.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.iconTextures.set(type, texture);
    return texture;
  }

  createPowerupDrop(data, scale = 1, type = 'health') {
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
    [
      { position: [0, 0.08, 0.705], rotation: [0, 0, 0] },
      { position: [0, 0.08, -0.705], rotation: [0, Math.PI, 0] },
      { position: [0.705, 0.08, 0], rotation: [0, Math.PI / 2, 0] },
      { position: [-0.705, 0.08, 0], rotation: [0, -Math.PI / 2, 0] },
    ].forEach(({ position, rotation }) => {
      const icon = new THREE.Mesh(
        new THREE.PlaneGeometry(0.98, 0.98),
        new THREE.MeshBasicMaterial({
          map: this.iconTextureFor(type),
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      icon.position.set(...position);
      icon.rotation.set(...rotation);
      crate.add(icon);
    });
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

    group.userData = { crate, crateMaterial, canopyMaterial, parachute, landingShadow };
    group.scale.setScalar(scale);
    return group;
  }

  update(time) {
    this.spawn(time);
    this.spawnSurprise(time);
    const players = [...this.players.values()];
    this.powerups = this.powerups.filter((powerup) => {
      const dropStartsAt = powerup.dropStartsAt || powerup.bornAt;
      const elapsed = Math.max(0, time - dropStartsAt);
      const dropStartY = powerup.type === 'surprise' ? POWERUP_DROP_Y + 7 : POWERUP_DROP_Y;
      const dropSpeed = powerup.type === 'surprise' ? SURPRISE_DROP_SPEED : POWERUP_DROP_SPEED;
      const nextY = Math.max(POWERUP_LAND_Y, dropStartY - elapsed * dropSpeed);
      const isLanded = nextY <= POWERUP_LAND_Y + 0.001;
      powerup.mesh.position.y = isLanded
        ? POWERUP_LAND_Y + Math.sin(time / 420 + powerup.bornAt) * 0.12
        : nextY + Math.sin(time / 260) * 0.12;
      powerup.mesh.rotation.y += isLanded ? 0.012 : 0.004;
      powerup.mesh.userData.crate.rotation.y += isLanded ? 0.016 : 0.006;
      const dropProgress = (dropStartY - nextY) / Math.max(1, dropStartY - POWERUP_LAND_Y);
      powerup.mesh.userData.landingShadow.scale.setScalar(isLanded ? 0.72 : 1 + dropProgress * 0.32);
      powerup.marker.rotation.z += 0.004;
      powerup.marker.material.opacity = isLanded ? 0.5 : 0.78 + Math.sin(time / 240) * 0.12;

      if (powerup.type === 'surprise') {
        const hue = (time / 1700) % 1;
        this.colorScratch.setHSL(hue, 0.92, 0.58);
        powerup.mesh.userData.crateMaterial.color.copy(this.colorScratch);
        powerup.mesh.userData.crateMaterial.emissive.copy(this.colorScratch);
        powerup.mesh.userData.canopyMaterial.emissive.copy(this.colorScratch);
      }

      if (isLanded && !powerup.landedAt) {
        powerup.landedAt = time;
      }
      powerup.mesh.userData.parachute.visible = !powerup.landedAt || time - powerup.landedAt < PARACHUTE_HIDE_DELAY;

      const taker = isLanded
        ? players.find((player) => !player.isDead && player.position.distanceTo(powerup.mesh.position) < POWERUP_PICKUP_RADIUS)
        : null;
      if (!taker) return true;

      const data = powerup.type === 'surprise' ? SURPRISE_POWERUP : POWERUPS[powerup.type];
      if (powerup.type === 'surprise') {
        taker.health = 100;
        ['speed', 'shield', 'damage'].forEach((buffType) => {
          taker.buffs[buffType] = time + SURPRISE_POWERUP.duration;
          taker.buffDurations[buffType] = SURPRISE_POWERUP.duration;
        });
      } else if (powerup.type === 'health') {
        taker.health = Math.min(100, taker.health + 35);
      } else {
        taker.buffs[powerup.type] = time + data.duration;
        taker.buffDurations[powerup.type] = data.duration;
      }
      if (!taker.isBot) {
        this.onEvent(`Picked ${data.name}`);
      }
      this.scene.remove(powerup.mesh);
      this.scene.remove(powerup.marker);
      powerup.marker.geometry?.dispose?.();
      powerup.marker.material?.dispose?.();
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
