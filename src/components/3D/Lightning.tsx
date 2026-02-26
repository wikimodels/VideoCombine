import React, { useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import * as THREE from 'three';

interface LightningProps {
    audioData: ReturnType<typeof useAudioData> | null;
}

export const Lightning: React.FC<LightningProps> = ({ audioData }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const linesRef = useRef<THREE.Group>(null);

    // Generate some random points on the top hemisphere of the earth
    const earthPoints = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 5; i++) {
            const phi = Math.random() * Math.PI * 0.25; // slight angle from top pole
            const theta = Math.random() * Math.PI * 2;
            // Earth radius now 2.5, Earth Y is -2.5. So top surface is around Y=0.
            const radius = 2.6; // Slightly larger than earth's radius (2.5) 

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const y = radius * Math.cos(phi) - 2.5; // Offset by earth's y
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }, []);

    let isStriking = false;
    let strikeIntensity = 0;

    if (audioData) {
        const viz = visualizeAudio({
            fps,
            frame,
            audioData,
            numberOfSamples: 32, // get a small amount of frequency bins
        });

        // Extract high frequencies for lightning
        const highFrequencies = viz.slice(15, 30);
        const avgHighs = highFrequencies.reduce((a, b) => a + b, 0) / highFrequencies.length;

        // Trigger threshold (adjust this value based on the audio track)
        if (avgHighs > 0.1) {
            isStriking = true;
            strikeIntensity = avgHighs;
        }
    }

    // Create jagged lines
    const lightningPaths = useMemo(() => {
        if (!isStriking) return [];

        return earthPoints.map((earthPos, index) => {
            const points = [];

            // Replicate the orbital position of the UFOs to make the lightning originate from them
            // We use the same math as UfoSwarm to find where UFO #index is
            const ufoIndex = index % 5; // ensure we use 0-4
            const angle = (Math.PI * 2 / 5) * ufoIndex;
            const orbitRadius = 3.5;
            const speedOffset = 0.8 + ((ufoIndex * 13) % 4) * 0.1; // deterministic fake random
            const t = frame * 0.01 * speedOffset;

            const startX = Math.cos(t + angle) * orbitRadius;
            const startZ = Math.sin(t + angle) * orbitRadius;
            const startY = 1.5 + ((ufoIndex * 7) % 10) * 0.1; // approximate baseY

            const startPos = new THREE.Vector3(startX, startY, startZ);

            points.push(startPos);

            const numSegments = 10;
            for (let i = 1; i < numSegments; i++) {
                const fraction = i / numSegments;
                const x = THREE.MathUtils.lerp(startPos.x, earthPos.x, fraction);
                const y = THREE.MathUtils.lerp(startPos.y, earthPos.y, fraction);
                const z = THREE.MathUtils.lerp(startPos.z, earthPos.z, fraction);

                // Add random jaggedness
                const jitter = 0.5;
                const jitterX = (Math.random() - 0.5) * jitter;
                const jitterY = (Math.random() - 0.5) * jitter;
                const jitterZ = (Math.random() - 0.5) * jitter;

                points.push(new THREE.Vector3(x + jitterX, y + jitterY, z + jitterZ));
            }
            points.push(earthPos);

            // Convert Vector3[] to Float32Array for BufferGeometry
            const positions = new Float32Array(points.length * 3);
            points.forEach((p, idx) => {
                positions[idx * 3] = p.x;
                positions[idx * 3 + 1] = p.y;
                positions[idx * 3 + 2] = p.z;
            });

            return positions;
        });
    }, [earthPoints, frame, isStriking]); // Re-compute on every frame if striking to get new jagged lines

    if (!isStriking) return null;

    return (
        <group ref={linesRef}>
            {/* Illuminate the environment when lighting strikes */}
            <pointLight
                position={[0, 1, 0]}
                color="#00ffff" /* Cyan lightning */
                intensity={5 + strikeIntensity * 50}
                distance={20}
            />

            {lightningPaths.map((positions, i) => {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const material = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8 + strikeIntensity * 0.2
                });
                return <primitive key={i} object={new THREE.Line(geometry, material)} />;
            })}
        </group>
    );
};
