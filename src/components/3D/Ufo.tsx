import React, { useMemo, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { staticFile } from 'remotion';

export const UfoSwarm: React.FC = () => {
    const frame = useCurrentFrame();
    const ufoRef = useRef<THREE.Group>(null);

    // Load the downloaded UFO model
    const { scene } = useGLTF(staticFile('ufo.glb'));

    // Calculate motion parameters, but do NOT clone the 3D scene manually in useMemo
    const ufos = useMemo(() => {
        return new Array(5).fill(0).map((_, i) => {
            // Distribute them in a circle around Y axis, hovering above Earth
            const angle = (Math.PI * 2 / 5) * i;
            // Radius of orbit from center Y axis
            const orbitRadius = 3.5;

            return {
                id: i,
                angleOffset: angle,
                orbitRadius,
                speedOffset: 0.8 + Math.random() * 0.4, // Slight variation in orbit speed
                bobOffsetPhase: Math.random() * Math.PI * 2,
                baseY: 1.5 + Math.random(), // varying heights
            };
        });
    }, []);

    if (ufoRef.current) {
        // Slow rotation of the entire group wrapper
        ufoRef.current.rotation.y = frame * 0.002;
    }

    return (
        <group ref={ufoRef}>
            {ufos.map((ufo) => {
                // Orbital animation math
                const t = frame * 0.01 * ufo.speedOffset;
                const bob = Math.sin(frame * 0.05 + ufo.bobOffsetPhase) * 0.3;

                const x = Math.cos(t + ufo.angleOffset) * ufo.orbitRadius;
                const z = Math.sin(t + ufo.angleOffset) * ufo.orbitRadius;
                const y = ufo.baseY + bob;

                // Tilted pointing inwards towards Earth (0, -2.5, 0)
                const lookAtTarget = new THREE.Vector3(0, -2.5, 0);
                const currentPos = new THREE.Vector3(x, y, z);

                // We use a dummy object to calculate rotation easily
                const dummy = new THREE.Object3D();
                dummy.position.copy(currentPos);
                dummy.lookAt(lookAtTarget);

                return (
                    <group key={ufo.id} position={[x, y, z]} rotation={[dummy.rotation.x, dummy.rotation.y, dummy.rotation.z]}>
                        <pointLight position={[0, -0.5, 0]} color="#ff0055" intensity={1} distance={5} />
                        {/* Use <Clone> from drei to safely render multiple instances of the same model */}
                        <Clone object={scene} scale={[0.15, 0.15, 0.15]} />
                    </group>
                );
            })}
        </group>
    );
};

// Pre-load the GLTF file so it's ready when the component mounts
useGLTF.preload(staticFile('ufo.glb'));
