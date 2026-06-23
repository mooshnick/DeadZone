import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { ApocalypticArena } from './maps/ApocalypticArena';

export function GameCanvas() {
  return (
      <Canvas
          className="game-canvas"
          camera={{ position: [0, 8, 18], fov: 60, near: 0.1, far: 900 }}
          shadows
      >
        <color attach="background" args={['#0b1118']} />
        <fog attach="fog" args={['#0b1118', 70, 260]} />

        <ambientLight intensity={1.45} />
        <hemisphereLight args={['#dcecff', '#1f2937', 1.15]} />
        <directionalLight
            castShadow
            intensity={2.3}
            position={[34, 48, 24]}
            shadow-camera-bottom={-90}
            shadow-camera-far={180}
            shadow-camera-left={-90}
            shadow-camera-near={1}
            shadow-camera-right={90}
            shadow-camera-top={90}
            shadow-mapSize-height={2048}
            shadow-mapSize-width={2048}
        />

        <Sky sunPosition={[80, 28, 60]} turbidity={7} rayleigh={0.45} mieCoefficient={0.02} mieDirectionalG={0.82} />

        <Physics gravity={[0, -30, 0]}>
          <ApocalypticArena />
        </Physics>
      </Canvas>
  );
}