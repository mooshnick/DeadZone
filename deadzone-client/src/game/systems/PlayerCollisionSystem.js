import * as THREE from 'three';
import { ARENA_LIMIT, PLAYER_HEIGHT, PLAYER_RADIUS } from '../config';
import { clamp } from '../utils';

const MIN_PLAYER_DISTANCE = PLAYER_RADIUS * 1.9;
const VERTICAL_OVERLAP = PLAYER_HEIGHT * 0.9;

export class PlayerCollisionSystem {
    constructor(players, collisionSystem) {
        this.players = players;
        this.collisionSystem = collisionSystem;
        this.fallbackDirection = new THREE.Vector2();
    }

    resolve() {
        const activePlayers = [...this.players.values()].filter((player) => !player.isDead && player.health > 0);
        for (let pass = 0; pass < 2; pass += 1) {
            for (let firstIndex = 0; firstIndex < activePlayers.length; firstIndex += 1) {
                for (let secondIndex = firstIndex + 1; secondIndex < activePlayers.length; secondIndex += 1) {
                    this.resolvePair(activePlayers[firstIndex], activePlayers[secondIndex]);
                }
            }
        }
    }

    resolvePair(first, second) {
        if (Math.abs(first.position.y - second.position.y) >= VERTICAL_OVERLAP) return;

        let dx = second.position.x - first.position.x;
        let dz = second.position.z - first.position.z;
        let distance = Math.hypot(dx, dz);
        if (distance >= MIN_PLAYER_DISTANCE) return;

        if (distance < 0.001) {
            const angle = this.stableAngle(first.id, second.id);
            this.fallbackDirection.set(Math.cos(angle), Math.sin(angle));
            dx = this.fallbackDirection.x;
            dz = this.fallbackDirection.y;
            distance = 1;
        }

        const correction = (MIN_PLAYER_DISTANCE - distance) / 2;
        const normalX = dx / distance;
        const normalZ = dz / distance;
        first.position.x -= normalX * correction;
        first.position.z -= normalZ * correction;
        second.position.x += normalX * correction;
        second.position.z += normalZ * correction;

        for (const player of [first, second]) {
            player.position.x = clamp(player.position.x, -ARENA_LIMIT, ARENA_LIMIT);
            player.position.z = clamp(player.position.z, -ARENA_LIMIT, ARENA_LIMIT);
            this.collisionSystem.resolve(player.position);
        }
    }

    stableAngle(firstId, secondId) {
        const key = `${firstId}:${secondId}`;
        let hash = 0;
        for (let index = 0; index < key.length; index += 1) {
            hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
        }
        return (Math.abs(hash) % 360) * (Math.PI / 180);
    }
}