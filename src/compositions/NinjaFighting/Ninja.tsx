import React from 'react';
import { interpolate, spring } from 'remotion';

export type FighterState = 'idle' | 'dash' | 'punch' | 'hurt' | 'knockback';

interface FighterProps {
    x: number;
    y: number;
    scale: number;
    facingLeft: boolean;
    colorMain: string;
    colorGlow: string;
    state: FighterState;
    stateProgress: number; // 0 to 1 for animations like punch/hurt
    frame: number;
    fps: number;
}

// Helper to draw thick, angled robotic limbs
const Limb: React.FC<{
    x1: number; y1: number;
    x2: number; y2: number;
    thickness: number;
    color: string;
    isArm?: boolean;
}> = ({ x1, y1, x2, y2, thickness, color, isArm }) => {
    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={thickness} strokeLinecap="square" />
            {/* Robot Joint accent */}
            <circle cx={x1} cy={y1} r={thickness * 0.4} fill="#0a0a0a" />
            <circle cx={x1} cy={y1} r={thickness * 0.15} fill={color} />
            {isArm && (
                <>
                    <circle cx={x2} cy={y2} r={thickness * 0.4} fill="#0a0a0a" />
                    <circle cx={x2} cy={y2} r={thickness * 0.15} fill={color} />
                </>
            )}
        </g>
    );
};

export const RobotFighter: React.FC<FighterProps> = ({
    x, y, scale, facingLeft, colorMain, colorGlow, state, stateProgress, frame, fps
}) => {
    // ─── Procedural Animation Base ───
    const dir = facingLeft ? -1 : 1;
    const t = frame * 0.1;

    // Core geometry sizes
    const torsoLen = 45;
    const upperLeg = 35;
    const lowerLeg = 35;
    const upperArm = 30;
    const lowerArm = 28;
    const thk = 14; // limb thickness

    // ─── Poses via Inverse/Forward Math ───
    // Default Idle math - Classic Boxing Guard
    let bodyLean = Math.sin(t) * 0.05 + 0.1; // leans slightly forward
    let headLook = -0.1; // chin slightly down
    let rHipA = 0.3; let rKneeA = 0.2;
    let lHipA = -0.4; let lKneeA = 0.1;

    // Boxing Guard (hands up protecting face/chin)
    // Left (lead arm): tucked but slightly forward
    let lShldA = 0.4 + Math.sin(t * 1.5) * 0.05;
    let lElbowA = 1.6;

    // Right (rear arm): tucked tight to chin
    let rShldA = 0.2 + Math.sin(t * 1.5 + Math.PI) * 0.05;
    let rElbowA = 2.4;

    // Breathing bob
    let bobY = Math.sin(t * 2) * 2;

    // Apply state overrides
    if (state === 'punch') {
        const p = spring({ frame: stateProgress, fps, config: { damping: 14, mass: 0.4 } }); // extremely snappy jab

        // Throw left arm STRAIGHT forward (the JAB to the head)
        // Keep shoulder high, quickly extend elbow straight out
        bodyLean = interpolate(p, [0, 0.4, 1], [0.1, 0.25, 0.1]); // slight lean forward

        // Start from guard, raise shoulder to aim at head, and straighten elbow
        lShldA = interpolate(p, [0, 0.4, 1], [0.4, 1.5, 0.4]);
        lElbowA = interpolate(p, [0, 0.4, 1], [1.6, 0.05, 1.6]);

        // Keep right hand tightly guarding chin
        rShldA = 0.2;
        rElbowA = 2.4;

        // Step DEEPLY into jab and bounce to reach opponent
        lHipA = interpolate(p, [0, 0.4, 1], [-0.4, -0.9, -0.4]);
        lKneeA = interpolate(p, [0, 0.4, 1], [0.1, 0.6, 0.1]);
        rHipA = interpolate(p, [0, 0.4, 1], [0.3, 0.6, 0.3]);
        bobY = interpolate(p, [0, 0.4, 1], [bobY, 8, bobY]);
    }
    else if (state === 'hurt' || state === 'knockback') {
        const p = Math.min(1, stateProgress / 10); // rapid flinch
        bodyLean = interpolate(p, [0, 1], [0.1, -0.3]); // bend backwards violently
        headLook = -0.5; // look up in pain

        // Guard blows open
        rShldA = 0.0; rElbowA = 1.8;
        lShldA = 0.2; lElbowA = 1.0;

        if (state === 'knockback') {
            bobY = -20; // flying up
            lHipA = 0; lKneeA = 0;
            rHipA = 0.5; rKneeA = -0.5;
        }
    }
    else if (state === 'dash') {
        bodyLean = 0.8; // lean completely horizontal
        headLook = -0.5; // look forward while leaning
        bobY = 10; // lower center of gravity

        // Arms drag behind
        lShldA = 1.8; lElbowA = 0.2;
        rShldA = 2.0; rElbowA = 0.1;

        // Legs spread for speed
        lHipA = -0.8; lKneeA = -0.2;
        rHipA = 0.6; rKneeA = 0.6;
    }

    // ─── Calculate absolute joint coordinates ───
    const hipX = 0;
    const hipY = -70 + bobY;

    // Torso goes UP from hip
    const neckX = hipX + Math.sin(bodyLean * dir) * torsoLen;
    const neckY = hipY - Math.cos(bodyLean * dir) * torsoLen;

    const headX = neckX + Math.sin((bodyLean + headLook) * dir) * 15;
    const headY = neckY - Math.cos((bodyLean + headLook) * dir) * 15;

    // Right Leg (Back leg)
    const rKneeX = hipX + Math.sin((bodyLean + rHipA) * dir) * upperLeg;
    const rKneeY = hipY + Math.cos((bodyLean + rHipA) * dir) * upperLeg;
    const rFootX = rKneeX + Math.sin((bodyLean + rHipA + rKneeA) * dir) * lowerLeg;
    const rFootY = rKneeY + Math.cos((bodyLean + rHipA + rKneeA) * dir) * lowerLeg;

    // Left Leg (Front leg)
    const lKneeX = hipX + Math.sin((bodyLean + lHipA) * dir) * upperLeg;
    const lKneeY = hipY + Math.cos((bodyLean + lHipA) * dir) * upperLeg;
    const lFootX = lKneeX + Math.sin((bodyLean + lHipA + lKneeA) * dir) * lowerLeg;
    const lFootY = lKneeY + Math.cos((bodyLean + lHipA + lKneeA) * dir) * lowerLeg;

    // Right Arm (Back arm)
    const rElbowX = neckX + Math.sin((bodyLean + rShldA) * dir) * upperArm;
    const rElbowY = neckY + Math.cos((bodyLean + rShldA) * dir) * upperArm;
    const rHandX = rElbowX + Math.sin((bodyLean + rShldA + rElbowA) * dir) * lowerArm;
    const rHandY = rElbowY + Math.cos((bodyLean + rShldA + rElbowA) * dir) * lowerArm;

    // Left Arm (Front arm)
    const lElbowX = neckX + Math.sin((bodyLean + lShldA) * dir) * upperArm;
    const lElbowY = neckY + Math.cos((bodyLean + lShldA) * dir) * upperArm;
    const lHandX = lElbowX + Math.sin((bodyLean + lShldA + lElbowA) * dir) * lowerArm;
    const lHandY = lElbowY + Math.cos((bodyLean + lShldA + lElbowA) * dir) * lowerArm;

    const fistScale = state === 'punch' && stateProgress > 0.2 && stateProgress < 0.6 ? 1.6 : 1.0;

    const headW = 32;
    const headH = 28;

    return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
            {/* Draw order: Back Arm -> Back Leg -> Torso -> Head -> Front Leg -> Front Arm */}

            {/* RIGHT (BACK) ARM */}
            <Limb x1={neckX} y1={neckY} x2={rElbowX} y2={rElbowY} thickness={thk * 0.8} color="#151515" isArm />
            <Limb x1={rElbowX} y1={rElbowY} x2={rHandX} y2={rHandY} thickness={thk * 0.7} color="#111" isArm />
            {/* Back Fist */}
            <circle cx={rHandX} cy={rHandY} r={10} fill={colorGlow} style={{ filter: `drop-shadow(0 0 10px ${colorGlow})` }} />

            {/* RIGHT (BACK) LEG */}
            <Limb x1={hipX} y1={hipY} x2={rKneeX} y2={rKneeY} thickness={thk} color="#151515" />
            <Limb x1={rKneeX} y1={rKneeY} x2={rFootX} y2={rFootY} thickness={thk * 0.8} color="#1a1a1a" />
            <polygon points={`${rFootX - 12},${rFootY} ${rFootX + 18},${rFootY} ${rFootX + 10},${rFootY - 12} ${rFootX - 6},${rFootY - 12}`} fill={colorMain} />

            {/* ROBOT TORSO */}
            {/* Draw a blocky rigid torso based on the line from hip to neck */}
            <g transform={`translate(${hipX}, ${hipY}) rotate(${-(bodyLean * dir) * (180 / Math.PI)})`}>
                <rect x={-thk * 1.5} y={-torsoLen} width={thk * 3} height={torsoLen} rx={4} fill="#1a1a1a" />
                <rect x={-thk * 1.2} y={-torsoLen + 4} width={thk * 2.4} height={torsoLen - 8} rx={2} fill="#222" />
                {/* Glowing power core */}
                <circle cx={0} cy={-torsoLen / 2} r={8} fill={colorGlow} style={{ filter: `drop-shadow(0 0 8px ${colorGlow})` }} />
            </g>

            {/* ROBOT HEAD */}
            <g transform={`translate(${headX}, ${headY}) rotate(${-(bodyLean + headLook) * dir * (180 / Math.PI)})`}>
                <rect x={-headW / 2} y={-headH / 2} width={headW} height={headH} rx={3} fill="#111" />
                {/* Antenna */}
                <line x1={0} y1={-headH / 2} x2={0} y2={-headH / 2 - 12} stroke="#333" strokeWidth={3} />
                <circle cx={0} cy={-headH / 2 - 14} r={4} fill={colorGlow} />
                {/* Visor / Eyes */}
                <rect x={-headW / 2 + 4} y={-4} width={headW - 8} height={8} rx={1} fill={colorGlow} style={{ filter: `drop-shadow(0 0 6px ${colorGlow})` }} />
                <rect x={dir === -1 ? headW / 2 - 12 : -headW / 2 + 4} y={-4} width={8} height={8} fill="#fff" />
            </g>

            {/* LEFT (FRONT) LEG */}
            <Limb x1={hipX} y1={hipY} x2={lKneeX} y2={lKneeY} thickness={thk * 1.1} color="#222" />
            <Limb x1={lKneeX} y1={lKneeY} x2={lFootX} y2={lFootY} thickness={thk * 0.9} color="#2a2a2a" />
            <polygon points={`${lFootX - 12},${lFootY} ${lFootX + 18},${lFootY} ${lFootX + 10},${lFootY - 12} ${lFootX - 6},${lFootY - 12}`} fill={colorMain} />

            {/* LEFT (FRONT) ARM */}
            <Limb x1={neckX} y1={neckY} x2={lElbowX} y2={lElbowY} thickness={thk} color="#2a2a2a" isArm />
            <Limb x1={lElbowX} y1={lElbowY} x2={lHandX} y2={lHandY} thickness={thk * 0.8} color="#222" isArm />

            {/* Front Fist (Punching - Jab Sphere) */}
            <g transform={`translate(${lHandX}, ${lHandY}) scale(${fistScale})`}>
                {/* Outer Glow Sphere */}
                <circle cx={0} cy={0} r={18} fill={colorGlow}
                    style={{ filter: `drop-shadow(0 0 20px ${colorGlow}) blur(2px)` }} opacity={0.8} />
                {/* Inner Core Sphere */}
                <circle cx={0} cy={0} r={12} fill="#fff" />
            </g>
        </g>
    );
};
