import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { staticFile } from 'remotion';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── 2D Twinkling Starfield ────────────────────────────────────────────────────
const STAR_COUNT = 320;
// Deterministic star data (no Math.random – seeded by index with sin)
const STAR_DATA = Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: Math.abs(Math.sin(i * 127.1)),
    y: Math.abs(Math.sin(i * 311.7)),
    radius: 0.4 + Math.abs(Math.sin(i * 74.7)) * 1.9, // 0.4–2.3 px
    phase: Math.abs(Math.sin(i * 529.3)) * Math.PI * 2,
    speed: 0.5 + (i % 7) * 0.22,
    // Slight warm/cool tint
    r: 200 + Math.round(Math.abs(Math.sin(i * 17.3)) * 55),
    g: 210 + Math.round(Math.abs(Math.sin(i * 23.7)) * 45),
    b: 230 + Math.round(Math.abs(Math.sin(i * 9.1)) * 25),
}));

const TwinklingStarfield: React.FC = () => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const t = frame / 30;

        // Deep space gradient background
        const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        grad.addColorStop(0, '#090920');
        grad.addColorStop(1, '#020210');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        for (const s of STAR_DATA) {
            // Pulsing opacity — squared sine for snappier twinkle
            const raw = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
            const opacity = 0.25 + 0.75 * (raw * raw);
            ctx.beginPath();
            ctx.arc(s.x * width, s.y * height, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${opacity.toFixed(3)})`;
            ctx.fill();
        }
    }, [frame, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0 }}
        />
    );
};

// ─── Shared UFO orbit math ────────────────────────────────────────────────────
const UFO_DATA = [0, 1, 2, 3, 4].map((i) => ({
    angleOffset: (Math.PI * 2 / 5) * i,
    speed: 0.008 + i * 0.001,
    bobPhase: i * 1.2,
    radius: 3.2 + (i % 2) * 0.5,
    baseY: 1.2 + (i % 3) * 0.4,
}));

function ufoPos(u: typeof UFO_DATA[0], frame: number): [number, number, number] {
    const t = u.angleOffset + frame * u.speed;
    return [
        Math.cos(t) * u.radius,
        u.baseY + Math.sin(frame * 0.05 + u.bobPhase) * 0.25,
        Math.sin(t) * u.radius,
    ];
}

const IMPACT_POINTS: Array<[number, number, number]> = [
    [1.2, -1.5, 0.8],
    [-1.0, -1.8, 0.5],
    [0.4, -1.2, -1.4],
    [-0.6, -2.0, -0.3],
    [0.9, -1.3, -1.0],
];

// ─── Build a jagged lightning path (deterministic, frame-animated) ────────────
function buildBoltPts(
    from: [number, number, number],
    to: [number, number, number],
    bass: number,
    seed: number,   // per-UFO seed
    frame: number,
    steps = 14,
): number[] {
    const pts: number[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Envelope: max jitter in the middle, zero at endpoints
        const envelope = Math.sin(t * Math.PI);
        const jitter = envelope * 0.55 * bass;
        // Sin-based pseudo-random that changes each frame → bolt flickers
        const phase = seed * 3.7 + i * 2.3 + frame * 0.8;
        const rx = Math.sin(phase * 1.1) * jitter;
        const ry = Math.sin(phase * 1.7) * jitter;
        const rz = Math.sin(phase * 2.3) * jitter;
        pts.push(
            from[0] + (to[0] - from[0]) * t + rx,
            from[1] + (to[1] - from[1]) * t + ry,
            from[2] + (to[2] - from[2]) * t + rz,
        );
    }
    return pts;
}

// ─── Single lightning bolt ─────────────────────────────────────────────────────
const LightningBolt: React.FC<{
    from: [number, number, number];
    to: [number, number, number];
    bass: number;
    seed: number;
    frame: number;
}> = ({ from, to, bass, seed, frame }) => {

    const mainLine = useMemo(() => {
        const pts = buildBoltPts(from, to, bass, seed, frame);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1.0) });
        return new THREE.Line(geo, mat);
    }, [from[0], from[1], from[2], to[0], to[1], to[2], bass, seed, frame]);

    // A secondary branch forks off at 40% of the way down
    const branchLine = useMemo(() => {
        const branchT = 0.4;
        const branchStart: [number, number, number] = [
            from[0] + (to[0] - from[0]) * branchT,
            from[1] + (to[1] - from[1]) * branchT,
            from[2] + (to[2] - from[2]) * branchT,
        ];
        // Branch end offset sideways
        const branchEnd: [number, number, number] = [
            branchStart[0] + Math.sin(seed * 7.3) * 0.8,
            branchStart[1] - 0.7,
            branchStart[2] + Math.cos(seed * 5.1) * 0.8,
        ];
        const pts = buildBoltPts(branchStart, branchEnd, bass * 0.7, seed + 100, frame, 7);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.7, 0.85, 1.0) });
        return new THREE.Line(geo, mat);
    }, [from[0], from[1], from[2], to[0], to[1], to[2], bass, seed, frame]);

    return (
        <group>
            <primitive object={mainLine} />
            <primitive object={branchLine} />
        </group>
    );
};

// ─── Earth ───────────────────────────────────────────────────────────────────
const EarthMesh: React.FC<{ bassIntensity: number }> = ({ bassIntensity }) => {
    const frame = useCurrentFrame();
    const colorMap = useTexture(staticFile('earth.jpg'));
    const glow = Math.min(bassIntensity * 2.5, 1.4);
    return (
        <mesh position={[0, -2.5, 0]} rotation={[0, frame * 0.005, 0]}>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshStandardMaterial
                map={colorMap}
                emissive={new THREE.Color(1, 0.25, 0)}
                emissiveIntensity={glow}
            />
        </mesh>
    );
};

// ─── Vibrating shockwave wave (multiple ripple rings) ─────────────────────────
const WAVE_RINGS = [
    { phase: 1.0, opacityBase: 1.0, colorHex: '#ff7700' },  // leading edge
    { phase: 0.62, opacityBase: 0.65, colorHex: '#ff4400' },
    { phase: 0.32, opacityBase: 0.38, colorHex: '#ff2200' },
    { phase: 0.12, opacityBase: 0.18, colorHex: '#cc1100' },  // inner glow
];

const ShockwaveRing: React.FC<{ bass: number; frame: number }> = ({ bass, frame }) => {
    if (bass < 0.12) return null;
    return (
        <group position={[0, -2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            {WAVE_RINGS.map((ring, i) => {
                const scale = 1 + bass * ring.phase * 2.2;
                const opacity = Math.max(0, ring.opacityBase * (1 - bass * ring.phase * 0.9));
                // Tube oscillates in thickness — this is the "vibration"
                const tube = 0.045 + Math.abs(Math.sin(frame * 0.6 + i * 1.4)) * 0.055 * bass;
                return (
                    <mesh key={i} scale={[scale, scale, scale]}>
                        <torusGeometry args={[2.5, tube, 16, 80]} />
                        <meshStandardMaterial
                            color={ring.colorHex}
                            emissive={ring.colorHex}
                            emissiveIntensity={bass * (7 - i * 1.4)}
                            transparent
                            opacity={opacity}
                            depthWrite={false}
                        />
                    </mesh>
                );
            })}
        </group>
    );
};


// ─── Full attack effect ────────────────────────────────────────────────────────
const AttackEffect: React.FC<{ bass: number; frame: number }> = ({ bass, frame }) => {
    if (bass < 0.12) return null;
    return (
        <group>
            {/* Global red impact light flooding Earth */}
            <pointLight position={[0, -2.5, 0]} color="#ff4400" intensity={bass * 140} distance={14} />
            {/* Flash light at each impact point */}
            {IMPACT_POINTS.map((pt, i) => (
                <pointLight key={i} position={pt} color="#ffffff" intensity={bass * 40} distance={3} />
            ))}
            {/* Lightning bolts from each UFO */}
            {UFO_DATA.map((u, i) => (
                <LightningBolt
                    key={i}
                    from={ufoPos(u, frame)}
                    to={IMPACT_POINTS[i]}
                    bass={bass}
                    seed={i * 17}
                    frame={frame}
                />
            ))}
        </group>
    );
};

// ─── UFO disc ─────────────────────────────────────────────────────────────────
const RIM_LIGHTS = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI * 2 / 6) * i;
    return [Math.cos(a) * 0.31, -0.06, Math.sin(a) * 0.31] as [number, number, number];
});

const UfoDisc: React.FC<{ position: [number, number, number]; bass: number }> = ({ position, bass }) => (
    <group position={position}>
        <mesh scale={[1, 0.3, 1]}>
            <sphereGeometry args={[0.34, 32, 32]} />
            <meshStandardMaterial color="#8899aa" metalness={0.95} roughness={0.1}
                emissive="#88ffff" emissiveIntensity={bass * 4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.34, 0.045, 24, 64]} />
            <meshStandardMaterial color="#aabbcc" metalness={1} roughness={0.05} emissive="#003344" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#00ddff" transparent opacity={0.55} emissive="#00aaff" emissiveIntensity={1.2 + bass * 3} />
        </mesh>
        {RIM_LIGHTS.map((p, i) => (
            <pointLight key={i} position={p} color={i % 2 === 0 ? '#00ffcc' : '#ff3388'} intensity={0.6 + bass * 2} distance={1.5} />
        ))}
        <pointLight position={[0, -0.2, 0]} color="#00ffaa" intensity={2.5} distance={5} />
    </group>
);

const UfoSwarm: React.FC<{ bass: number }> = ({ bass }) => {
    const frame = useCurrentFrame();
    return (
        <>
            {UFO_DATA.map((u, i) => (
                <UfoDisc key={i} position={ufoPos(u, frame)} bass={bass} />
            ))}
        </>
    );
};

// ─── Main scene ───────────────────────────────────────────────────────────────
export const UfoAttacksScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const audioFile = staticFile('track.mp3');
    const audioData = useAudioData(audioFile);

    let bass = 0;
    let shakeX = 0;
    let shakeY = 0;

    if (audioData) {
        const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 32 });
        bass = (viz[0] + viz[1] + viz[2]) / 3;
        if (bass > 0.3) {
            shakeX = Math.sin(frame * 1.7) * bass * 0.25;
            shakeY = Math.sin(frame * 2.3) * bass * 0.15;
        }
    }

    const camZ = 12 + Math.sin(frame * 0.01) * 1.5;

    return (
        <AbsoluteFill>
            {/* 2D twinkling star background */}
            <TwinklingStarfield />

            <Audio src={audioFile} />
            <ThreeCanvas
                width={width}
                height={height}
                camera={{ position: [shakeX, 2 + shakeY, camZ], fov: 50, near: 0.1, far: 1000 }}
                gl={{ alpha: true }}
            >
                <ambientLight intensity={0.4} />
                <directionalLight position={[8, 8, 8]} intensity={2} />
                <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#4466ff" />

                <Suspense fallback={
                    <mesh position={[0, -2.5, 0]}>
                        <sphereGeometry args={[2.5, 64, 64]} />
                        <meshStandardMaterial color="#1a66cc" />
                    </mesh>
                }>
                    <EarthMesh bassIntensity={bass} />
                </Suspense>

                <ShockwaveRing bass={bass} frame={frame} />
                <UfoSwarm bass={bass} />
                <AttackEffect bass={bass} frame={frame} />
            </ThreeCanvas>
        </AbsoluteFill>
    );
};
