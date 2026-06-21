import { useEffect, useRef } from 'react';
import { CanvasEngine } from '../game/CanvasEngine';
import { GAME_WORLD } from '../game/gameConstants';
import { InputManager } from '../game/InputManager';

export function GameCanvas({ localPlayerId, localCharacterClass, players, projectiles, onMove, onShoot }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const inputManager = new InputManager(canvasRef.current);
    const engine = new CanvasEngine(canvasRef.current, {
      inputManager,
      localPlayerId,
      localCharacterClass,
      onLocalPlayerMove: onMove,
      onLocalPlayerShoot: onShoot
    });

    engineRef.current = engine;
    inputManager.start();
    engine.start();

    return () => {
      engine.stop();
      inputManager.stop();
      engineRef.current = null;
    };
  }, [localCharacterClass, localPlayerId, onMove, onShoot]);

  useEffect(() => {
    engineRef.current?.setPlayers(players);
  }, [players]);

  useEffect(() => {
    engineRef.current?.setProjectiles(projectiles);
  }, [projectiles]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={GAME_WORLD.width}
      height={GAME_WORLD.height}
      tabIndex={0}
      aria-label="DeadZone game canvas"
    />
  );
}
