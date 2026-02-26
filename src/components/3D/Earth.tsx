import React, { useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { staticFile } from 'remotion';

export const Earth: React.FC = () => {
    const frame = useCurrentFrame();
    const earthRef = useRef<THREE.Mesh>(null);

    // Load the Earth texture from the public folder
    const colorMap = useTexture(staticFile('earth.jpg'));

    // Slowly rotate the Earth over time
    if (earthRef.current) {
        earthRef.current.rotation.y = frame * 0.005;
    }

    return (
        <mesh ref={earthRef} position={[0, -2.5, 0]}>
            {/* 
        A sphere with radius 2.5 (was 4), and high segment count for smoothness.
        The scale and position can be adjusted in the scene composer.
      */}
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshBasicMaterial
                map={colorMap}
            />
        </mesh>
    );
};
