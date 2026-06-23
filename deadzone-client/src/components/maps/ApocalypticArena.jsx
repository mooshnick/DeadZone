import { useEffect, useRef } from 'react';
import { Center } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Model as ApocalypticCityModel } from './ApocalypticCityModel';

export default function ApocalypticArena({
                                             position = [0, 0.85, 0],
                                             rotation = [0, 0, 0],
                                             scale = 0.055,
                                             onArenaReady,
                                         }) {
    const arenaRef = useRef(null);

    useEffect(() => {
        if (!arenaRef.current) return;

        arenaRef.current.traverse((object) => {
            if (!object.isMesh) return;

            object.castShadow = true;
            object.receiveShadow = true;

            // המערכת שלכם עדיין תזהה את המודל כחוסם כדורים (Raycast)
            object.userData.blocksBullets = true;
            object.userData.isArenaCollider = true;

            if (object.material) {
                object.material.needsUpdate = true;
            }
        });

        onArenaReady?.(arenaRef.current);
    }, [onArenaReady]);

    return (
        <group>
            {/* 1. המודל הויזואלי בלבד (בלי קוליידר אוטומטי משוגע) */}
            <group
                ref={arenaRef}
                position={position}
                rotation={rotation}
                scale={scale}
            >
                <Center disableY>
                    <ApocalypticCityModel />
                </Center>
            </group>

            {/* 2. מערכת קוליידרים ידנית ויציבה בתוך RigidBody קבוע אחד */}
            <RigidBody type="fixed" friction={1} restitution={0}>

                {/* רצפת הזירה - מונעת מהשחקן ליפול לעבר שום מקום */}
                {/* args: [halfWidth, halfHeight, halfDepth] */}
                <CuboidCollider args={[50, 0.1, 50]} position={[0, 0, 0]} />

                {/* קירות חוסמים ומחסות מוגדרים ידנית */}
                {/* תצטרכו להתאים את המיקומים (position) והגודל (args) לפי המבנים המרכזיים שלכם */}
                {/* דוגמה לקיר/בניין מרכזי: */}
                <CuboidCollider args={[5, 10, 5]} position={[10, 5, -10]} />

                {/* דוגמה למחסה קטן ברחוב: */}
                <CuboidCollider args={[2, 1, 0.5]} position={[-3, 1, 5]} />

            </RigidBody>
        </group>
    );
}