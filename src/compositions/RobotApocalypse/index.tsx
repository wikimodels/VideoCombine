import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { TwinklingStarfield } from '../../components/TwinklingStarfield';

// ─── Scene constants ────────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const GROUND_Y = H * 0.87;
const FIRE_Y = H * 0.84;
const sr = (seed: number) => Math.abs(Math.sin(seed * 127.1 + 97.3));

// ─── Buildings ──────────────────────────────────────────────────────────────────
const BUILDINGS = [
    { x: -30, w: 170, h: 220 + 135, color: '#1e1e2d' },
    { x: 135, w: 130, h: 310 + 135, color: '#181824' },
    { x: 260, w: 190, h: 260 + 135, color: '#1e1e2d' },
    { x: 445, w: 150, h: 360 + 135, color: '#151520' },
    { x: 590, w: 210, h: 275 + 135, color: '#1e1e2d' },
    { x: 795, w: 140, h: 330 + 135, color: '#181824' },
    { x: 930, w: 175, h: 240 + 135, color: '#1e1e2d' },
];

const WINDOWS = BUILDINGS.map((b) => {
    const cols = Math.max(1, Math.floor((b.w - 16) / 34));
    const rows = Math.max(1, Math.floor((b.h - 24) / 40));
    return Array.from({ length: cols * rows }, (_, i) => ({
        col: i % cols, row: Math.floor(i / cols), seed: i + b.x,
    }));
});

// ─── Lightning bolt path ────────────────────────────────────────────────────────
function boltPath(x1: number, y1: number, x2: number, y2: number,
    seed: number, frame: number, baseAng?: number, steps = 10): string {
    let d = `M ${x1} ${y1}`;

    // Distance to target
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    for (let i = 1; i < steps; i++) {
        const t = i / steps;

        let tx = x1 + dx * t;
        let ty = y1 + dy * t;

        // Bend the early path to match the finger's pointing direction
        if (baseAng !== undefined) {
            const influence = Math.max(0, 1 - Math.pow(t, 0.6) * 1.5); // Fades out as it travels
            const pushDist = dist * 0.35 * influence;
            tx += Math.cos(baseAng) * pushDist;
            ty += Math.sin(baseAng) * pushDist;
        }

        const jitter = Math.sin(t * Math.PI) * 45;
        const rx = Math.sin(seed * 4.1 + i * 2.7 + frame * 1.1) * jitter;
        const ry = Math.sin(seed * 6.3 + i * 1.9 + frame * 0.9) * jitter * 0.25;
        d += ` L ${tx + rx} ${ty + ry}`;
    }
    return d + ` L ${x2} ${y2}`;
}

// ─── Runner person ──────────────────────────────────────────────────────────────
const Runner: React.FC<{
    cx: number; sc: number; skin: string; shirt: string;
    frame: number; bass: number; legPhase: number;
}> = ({ cx, sc, skin, shirt, frame, bass, legPhase }) => {
    const gY = GROUND_Y;
    const t = frame * 0.22;
    const sw = 7 * sc;
    const headR = 20 * sc;
    const torsoH = 70 * sc;
    const legLen = 55 * sc;
    const armLen = 45 * sc;

    const hipY = gY - legLen;
    const shoulderY = hipY - torsoH;
    const headCy = shoulderY - headR;

    const rLegAng = Math.sin(t + legPhase) * 0.7;
    const lLegAng = -Math.sin(t + legPhase) * 0.7;
    const rFootX = cx + 12 * sc + Math.sin(rLegAng) * legLen;
    const rFootY = gY - Math.max(0, Math.sin(t + legPhase)) * 28 * sc;
    const lFootX = cx - 12 * sc + Math.sin(lLegAng) * legLen;
    const lFootY = gY - Math.max(0, -Math.sin(t + legPhase)) * 28 * sc;

    const rArmAng = -Math.PI * 0.5 + Math.sin(t * 1.3 + legPhase) * 0.85;
    const lArmAng = -Math.PI * 0.6 + Math.sin(t * 1.1 + legPhase + 1.5) * 0.85;

    return (
        <g>
            <line x1={cx + 8 * sc} y1={hipY} x2={rFootX} y2={rFootY}
                stroke={shirt} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx - 8 * sc} y1={hipY} x2={lFootX} y2={lFootY}
                stroke={shirt} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx} y1={shoulderY} x2={cx} y2={hipY}
                stroke={shirt} strokeWidth={sw * 1.2} strokeLinecap="round" />
            <line x1={cx + 22 * sc} y1={shoulderY}
                x2={cx + 22 * sc + Math.cos(rArmAng) * armLen}
                y2={shoulderY + Math.sin(rArmAng) * armLen}
                stroke={skin} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx - 22 * sc} y1={shoulderY}
                x2={cx - 22 * sc - Math.cos(lArmAng) * armLen}
                y2={shoulderY + Math.sin(lArmAng) * armLen}
                stroke={skin} strokeWidth={sw} strokeLinecap="round" />
            <circle cx={cx} cy={headCy} r={headR} fill={skin} />
            <circle cx={cx - 6 * sc} cy={headCy - 2 * sc} r={(3 + bass * 3) * sc} fill="#111" />
            <circle cx={cx + 6 * sc} cy={headCy - 2 * sc} r={(3 + bass * 3) * sc} fill="#111" />
            <ellipse cx={cx} cy={headCy + 7 * sc}
                rx={(3 + bass * 6) * sc} ry={(2 + bass * 4) * sc} fill="#333" />
        </g>
    );
};

// ─── Runners data — dense clusters ─────────────────────────────────────────────
const RUNNERS = [
    // Cluster A — tight group left side
    { startX: -60, speed: 5.2, sc: 0.55 * 1.15, skin: '#ffe0b2', shirt: '#ff1744', phase: 0.0 },
    { startX: -130, speed: 4.8, sc: 0.52 * 1.15, skin: '#fff9c4', shirt: '#ff9100', phase: 0.4 },
    { startX: -195, speed: 5.5, sc: 0.58 * 1.15, skin: '#ffccbc', shirt: '#e040fb', phase: 0.8 },

    // Cluster B — middle
    { startX: -450, speed: 4.4, sc: 0.53 * 1.15, skin: '#ffe0b2', shirt: '#00e5ff', phase: 1.1 },
    { startX: -520, speed: 4.9, sc: 0.56 * 1.15, skin: '#fff9c4', shirt: '#76ff03', phase: 1.5 },
    { startX: -590, speed: 4.2, sc: 0.50 * 1.15, skin: '#ffccbc', shirt: '#ff1744', phase: 1.9 },

    // Cluster C — right side, faster
    { startX: -820, speed: 5.8, sc: 0.54 * 1.15, skin: '#ffe0b2', shirt: '#ff9100', phase: 2.3 },
    { startX: -890, speed: 6.1, sc: 0.57 * 1.15, skin: '#fff9c4', shirt: '#e040fb', phase: 2.7 },
    { startX: -960, speed: 5.4, sc: 0.51 * 1.15, skin: '#ffccbc', shirt: '#00e5ff', phase: 3.1 },

    // Stragglers
    { startX: -1250, speed: 4.0, sc: 0.60 * 1.15, skin: '#ffe0b2', shirt: '#76ff03', phase: 0.6 },
    { startX: -1400, speed: 4.7, sc: 0.53 * 1.15, skin: '#fff9c4', shirt: '#ff1744', phase: 1.3 },
    { startX: -1600, speed: 5.0, sc: 0.55 * 1.15, skin: '#ffccbc', shirt: '#ff9100', phase: 2.0 },
];

// ─── Giant robot (background, evil) ───────────────────────────────────────────
const GiantRobot: React.FC<{ bass: number; frame: number }> = ({ bass, frame }) => {
    const cx = W * 0.5;
    const sc = 1.47; // 1.5× smaller than original 2.2

    // Geometry
    const headW = 130 * sc; const headH = 100 * sc;
    const jawH = 38 * sc; // separate jaw piece
    const torsoW = 200 * sc; const torsoH = 260 * sc;
    const legW = 55 * sc;

    // --- Body movement (slow walk) ---
    const walkPhase = frame * 0.045;
    const bodyBob = Math.abs(Math.sin(walkPhase)) * 30 * sc; // dips on each step (Exaggerated!)

    const torsoY = H * 0.405 + bodyBob;
    const headY = torsoY - headH - jawH - 10;
    const skullH = headH - jawH;
    const skullY = headY;
    const jawBaseY = skullY + skullH;
    const jawDrop = bass * 38 * sc;
    const hipY = torsoY + torsoH;

    // --- Arm movement (asymmetric) ---
    const lShoulderX = cx - torsoW / 2 - 8;
    const rShoulderX = cx + torsoW / 2 + 8;
    const shoulderY = torsoY + 42;

    // Left arm sway (moves independently of right)
    const lSwayX = Math.sin(frame * 0.02) * 35;
    const lSwayY = Math.sin(frame * 0.035) * 45;
    // Right arm sway (out of phase)
    const rSwayX = Math.sin(frame * 0.018 + 2.1) * 40;
    const rSwayY = Math.sin(frame * 0.041 + 1.5) * 50;

    const lHandX = cx - torsoW / 2 - 80 + lSwayX; const lHandY = torsoY + torsoH * 0.52 + lSwayY;
    const rHandX = cx + torsoW / 2 + 80 + rSwayX; const rHandY = torsoY + torsoH * 0.52 + rSwayY;

    // Eye positions (sharp rect)
    const eyeW = 38 * sc; const eyeH = 18 * sc;
    const eyeY = skullY + skullH * 0.42;
    const lEyeX = cx - 32 * sc - eyeW;
    const rEyeX = cx + 32 * sc;
    const eyeHue = 0 + bass * 30; // red→orange
    const eyeCol = `hsl(${eyeHue},100%,${55 + bass * 35}%)`;

    // Eyebrow geometry: thick lines angled V-inward (angry Λ shape)
    const ebLen = 52 * sc;
    const lEbX1 = lEyeX - 6 * sc; const lEbY1 = eyeY - 18 * sc; // outer
    const lEbX2 = lEyeX + ebLen; const lEbY2 = eyeY - 6 * sc;  // inner (lower)
    const rEbX1 = rEyeX + eyeW + 6 * sc; const rEbY1 = eyeY - 18 * sc;
    const rEbX2 = rEyeX - 6 * sc; const rEbY2 = eyeY - 6 * sc;

    const body = '#18182a';
    const accent = '#00ffcc';
    const reactorCol = `hsl(${170 + bass * 55},100%,${50 + bass * 45}%)`;



    return (
        <g>
            {/* ─ Arms ─ */}
            <line x1={lShoulderX} y1={shoulderY} x2={lHandX} y2={lHandY}
                stroke={body} strokeWidth={legW * 0.88} strokeLinecap="round" />
            <circle cx={(lShoulderX + lHandX) / 2} cy={(shoulderY + lHandY) / 2}
                r={legW * 0.50} fill="#22223a" stroke={accent} strokeWidth={1.5} />
            <line x1={rShoulderX} y1={shoulderY} x2={rHandX} y2={rHandY}
                stroke={body} strokeWidth={legW * 0.88} strokeLinecap="round" />
            <circle cx={(rShoulderX + rHandX) / 2} cy={(shoulderY + rHandY) / 2}
                r={legW * 0.50} fill="#22223a" stroke={accent} strokeWidth={1.5} />

            {/* ─ Spread fingers LEFT — from lHandX/lHandY downward-spread ─ */}
            {/* Palm */}
            <rect x={lHandX - 28} y={lHandY - 18}
                width={56} height={36}
                fill="#cc0000" rx={8}
                style={{ filter: `drop-shadow(0 0 ${6 + bass * 12}px #ff3300)` }} />
            {/* 5 fingers fanning DOWN-LEFT */}
            {[-0.65, -0.30, 0.02, 0.34, 0.65].map((ang, fi) => {
                const baseAng = Math.PI * 0.5 + ang; // pointing mostly downward
                const fLen = 95 + fi * 6; // Longer!
                const fx2 = lHandX + Math.cos(baseAng) * fLen;
                const fy2 = lHandY + Math.sin(baseAng) * fLen;
                return (
                    <g key={`lf${fi}`}>
                        <line x1={lHandX} y1={lHandY} x2={fx2} y2={fy2}
                            stroke="#cc0000" strokeWidth={16 + bass * 6} strokeLinecap="round" />
                        {/* Knuckle highlight */}
                        <line x1={lHandX + Math.cos(baseAng) * fLen * 0.4}
                            y1={lHandY + Math.sin(baseAng) * fLen * 0.4}
                            x2={fx2} y2={fy2}
                            stroke="#ff5533" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
                        {/* Fingertip glow */}
                        <circle cx={fx2} cy={fy2} r={8 + bass * 10}
                            fill={`hsl(${20 + bass * 20},100%,70%)`}
                            opacity={0.85 + bass * 0.15}
                            style={{ filter: 'blur(5px)' }} />
                    </g>
                );
            })}

            {/* ─ Spread fingers RIGHT ─ */}
            {/* Palm */}
            <rect x={rHandX - 28} y={rHandY - 18}
                width={56} height={36}
                fill="#cc0000" rx={8}
                style={{ filter: `drop-shadow(0 0 ${6 + bass * 12}px #ff3300)` }} />
            {/* 5 fingers fanning DOWN-RIGHT */}
            {[0.65, 0.30, -0.02, -0.34, -0.65].map((ang, fi) => {
                const baseAng = Math.PI * 0.5 + ang;
                const fLen = 95 + fi * 6; // Longer!
                const fx2 = rHandX + Math.cos(baseAng) * fLen;
                const fy2 = rHandY + Math.sin(baseAng) * fLen;
                return (
                    <g key={`rf${fi}`}>
                        <line x1={rHandX} y1={rHandY} x2={fx2} y2={fy2}
                            stroke="#cc0000" strokeWidth={16 + bass * 6} strokeLinecap="round" />
                        <line x1={rHandX + Math.cos(baseAng) * fLen * 0.4}
                            y1={rHandY + Math.sin(baseAng) * fLen * 0.4}
                            x2={fx2} y2={fy2}
                            stroke="#ff5533" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
                        <circle cx={fx2} cy={fy2} r={8 + bass * 10}
                            fill={`hsl(${20 + bass * 20},100%,70%)`}
                            opacity={0.85 + bass * 0.15}
                            style={{ filter: 'blur(5px)' }} />
                    </g>
                );
            })}

            {/* Hand energy glow */}
            <circle cx={lHandX} cy={lHandY} r={25 + bass * 20}
                fill={reactorCol} opacity={0.55 + bass * 0.4}
                style={{ filter: 'blur(12px)' }} />
            <circle cx={rHandX} cy={rHandY} r={25 + bass * 20}
                fill={reactorCol} opacity={0.55 + bass * 0.4}
                style={{ filter: 'blur(12px)' }} />

            {/* ─ Torso ─ */}
            <rect x={cx - torsoW / 2} y={torsoY} width={torsoW} height={torsoH}
                fill={body} rx={12} />
            <rect x={cx - torsoW * 0.37} y={torsoY + 30}
                width={torsoW * 0.74} height={torsoH * 0.50}
                fill={`rgba(0,255,200,${0.04 + bass * 0.1})`} rx={5}
                stroke={accent} strokeWidth={1.5} />
            <circle cx={cx} cy={torsoY + torsoH * 0.42}
                r={28 + bass * 16} fill={reactorCol}
                opacity={0.7 + bass * 0.3}
                style={{ filter: `blur(${6 + bass * 11}px)` }} />
            <circle cx={cx} cy={torsoY + torsoH * 0.42} r={13} fill={reactorCol} />

            {/* ─ Neck ─ */}
            <rect x={cx - 24} y={skullY + headH - jawH} width={48} height={16} fill={body} />

            {/* ─ Skull (upper half of head) ─ */}
            <rect x={cx - headW / 2} y={skullY} width={headW} height={skullH}
                fill={body} rx={10} />

            {/* Angry eyebrows (thick V-shape) */}
            <line x1={lEbX1} y1={lEbY1} x2={lEbX2} y2={lEbY2}
                stroke="#cc0000" strokeWidth={9 * sc} strokeLinecap="round" />
            <line x1={rEbX1} y1={rEbY1} x2={rEbX2} y2={rEbY2}
                stroke="#cc0000" strokeWidth={9 * sc} strokeLinecap="round" />

            {/* Sharp rectangular eyes */}
            <rect x={lEyeX} y={eyeY} width={eyeW} height={eyeH}
                fill={eyeCol} rx={3}
                style={{ filter: `drop-shadow(0 0 ${8 + bass * 18}px ${eyeCol})` }} />
            <rect x={rEyeX} y={eyeY} width={eyeW} height={eyeH}
                fill={eyeCol} rx={3}
                style={{ filter: `drop-shadow(0 0 ${8 + bass * 18}px ${eyeCol})` }} />
            {/* Pupil slit */}
            <rect x={lEyeX + eyeW * 0.35} y={eyeY - 2} width={eyeW * 0.18} height={eyeH + 4}
                fill="#000" opacity={0.6} />
            <rect x={rEyeX + eyeW * 0.35} y={eyeY - 2} width={eyeW * 0.18} height={eyeH + 4}
                fill="#000" opacity={0.6} />

            {/* ─ Jaw (drops open on bass attack) ─ */}
            {/* Glowing inner mouth (visible when jaw drops) */}
            <rect x={cx - headW * 0.4} y={jawBaseY}
                width={headW * 0.8} height={jawDrop + 4}
                fill={reactorCol} opacity={0.85}
                style={{ filter: 'blur(6px)' }} />

            {/* Teeth (bright white, inside mouth gap) */}
            {jawDrop > 4 && Array.from({ length: 6 }, (_, ti) => (
                <rect key={ti}
                    x={cx - headW * 0.42 + ti * (headW * 0.84 / 6) + 4}
                    y={jawBaseY + 2}
                    width={(headW * 0.84 / 6) - 8}
                    height={Math.min(jawDrop * 0.65, 26)}
                    fill="#ffffff" rx={2}
                    style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
            ))}

            {/* Jaw plate (overlaps mouth hole) */}
            <rect x={cx - headW / 2 + 6} y={jawBaseY + jawDrop}
                width={headW - 12} height={jawH}
                fill={body} rx={6} />

            {/* Jaw edge highlight so it doesn't merge with neck */}
            <line x1={cx - headW / 2 + 8} y1={jawBaseY + jawDrop + jawH - 2}
                x2={cx + headW / 2 - 8} y2={jawBaseY + jawDrop + jawH - 2}
                stroke="#2a2a44" strokeWidth={3} strokeLinecap="round" />

            {/* Antenna */}
            <line x1={cx} y1={skullY} x2={cx} y2={skullY - 40}
                stroke={accent} strokeWidth={5} />
            <circle cx={cx} cy={skullY - 43} r={10}
                fill={bass > 0.45 ? '#ff2200' : accent}
                style={{ filter: `drop-shadow(0 0 ${9 + bass * 20}px ${bass > 0.45 ? '#ff2200' : accent})` }} />

            {/* Legs (mostly hidden by buildings) */}
            <line x1={cx - 50} y1={hipY} x2={cx - 60} y2={hipY + 180}
                stroke={body} strokeWidth={legW} strokeLinecap="square" />
            <line x1={cx + 50} y1={hipY} x2={cx + 60} y2={hipY + 180}
                stroke={body} strokeWidth={legW} strokeLinecap="square" />
        </g>
    );
};

// ─── Main composition ───────────────────────────────────────────────────────────
export const RobotApocalypse: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioFile = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioFile);

    if (!audioData) return <AbsoluteFill style={{ background: '#06040e' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1] + viz[2]) / 3 * 2.8, 1);
    const mid = Math.min((viz[5] + viz[6] + viz[7]) / 3 * 3.2, 1);
    const firing = bass > 0.22;

    // Camera shake on bass
    const shakeX = firing ? Math.sin(frame * 3.7) * bass * 10 : 0;
    const shakeY = firing ? Math.sin(frame * 4.9) * bass * 6 : 0;

    // Hand positions (must match GiantRobot sway/coords)
    const torsoW = 200 * 1.47;
    const torsoH = 260 * 1.47;

    // --- Body movement (slow walk) ---
    const walkPhase = frame * 0.045;
    const bodyBob = Math.abs(Math.sin(walkPhase)) * 30 * 1.47; // sc=1.47 dips on each step

    const torsoY = H * 0.405 + bodyBob;
    const cx = W * 0.5;

    // Left arm sway
    const lSwayX = Math.sin(frame * 0.02) * 35;
    const lSwayY = Math.sin(frame * 0.035) * 45;
    // Right arm sway (out of phase)
    const rSwayX = Math.sin(frame * 0.018 + 2.1) * 40;
    const rSwayY = Math.sin(frame * 0.041 + 1.5) * 50;

    const lHandX = cx - torsoW / 2 - 80 + lSwayX; const lHandY = torsoY + torsoH * 0.52 + lSwayY;
    const rHandX = cx + torsoW / 2 + 80 + rSwayX; const rHandY = torsoY + torsoH * 0.52 + rSwayY;

    // Explode buildings on bass
    const explosions = firing
        ? BUILDINGS.map((b, bi) => {
            if (sr(bi * 17.3 + Math.floor(frame / 4) * 5.7) < 0.45) return null;
            return { x: b.x + b.w * 0.5, y: GROUND_Y - b.h };
        }).filter(Boolean)
        : [];

    return (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
            {/* ── Starry sky ── */}
            <TwinklingStarfield />
            <Audio src={audioFile} />

            {/* ── Ember/smoke overlay ── */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(to top,
                    rgba(255,20,0,${0.07 + bass * 0.11}) 0%,
                    transparent 50%)`,
                pointerEvents: 'none',
            }} />

            <svg
                width={width} height={height}
                viewBox={`0 0 ${W} ${H}`}
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                <defs>
                    <filter id="glow-bolt-r">
                        <feGaussianBlur stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Horizon glow */}
                <ellipse cx={W / 2} cy={GROUND_Y} rx={W * 0.72} ry={H * 0.17}
                    fill={`rgba(255,40,0,${0.10 + bass * 0.16})`}
                    style={{ filter: 'blur(55px)' }} />

                {/* ── Moon ── */}
                <g transform={`translate(${W - 180}, 280)`}>
                    <circle cx={0} cy={0} r={75} fill="#bac4d8"
                        style={{ filter: 'drop-shadow(0 0 30px rgba(150, 180, 255, 0.15)) blur(3px)' }} />
                    <circle cx={-20} cy={-15} r={16} fill="rgba(0,0,0,0.12)" />
                    <circle cx={25} cy={20} r={22} fill="rgba(0,0,0,0.15)" />
                    <circle cx={5} cy={35} r={12} fill="rgba(0,0,0,0.10)" />
                    <circle cx={-25} cy={25} r={10} fill="rgba(0,0,0,0.08)" />
                </g>

                {/* ── Giant Robot BEHIND buildings ── */}
                <GiantRobot bass={bass} frame={frame} />

                {/* ── Buildings ── */}
                <g transform={`translate(${shakeX},${shakeY})`}>
                    {BUILDINGS.map((b, bi) => {
                        const bx = b.x;
                        const by = GROUND_Y - b.h;
                        return (
                            <g key={bi}>
                                <rect x={bx + 8} y={by + 8} width={b.w} height={b.h}
                                    fill="rgba(0,0,0,0.4)" rx={3} />
                                <rect x={bx} y={by} width={b.w} height={b.h}
                                    fill={b.color} rx={3} />
                                {/* Jagged damaged top */}
                                {[...Array(5)].map((_, ji) => {
                                    const jx = bx + (ji / 4) * b.w;
                                    const jh = sr(bi * 7 + ji) * 16;
                                    return (
                                        <rect key={ji} x={jx} y={by - jh}
                                            width={b.w / 4.5} height={jh + 3}
                                            fill={b.color} />
                                    );
                                })}
                                {/* Windows */}
                                {WINDOWS[bi].map((w, wi) => {
                                    const wx = bx + 10 + w.col * 34;
                                    const wy = by + 18 + w.row * 40;
                                    if (wx + 18 > bx + b.w || wy + 22 > GROUND_Y) return null;
                                    if (sr(w.seed * 7) < 0.38) return null;
                                    const flicker = Math.sin(frame * 0.17 + w.seed * 3.1);
                                    // Base lit increased by ~30% max brightness via multiplier 104 instead of 80
                                    const lit = Math.round((0.2 + mid * 0.5 + flicker * 0.15) * 104);
                                    return (
                                        <rect key={wi} x={wx} y={wy} width={18} height={22}
                                            fill={`hsl(${20 + (w.seed % 2) * 20},90%,${lit}%)`}
                                            opacity={0.65 + mid * 0.3} rx={2} />
                                    );
                                })}
                                {/* Roof alarm */}
                                <circle cx={bx + b.w / 2} cy={by - 5} r={5 + bass * 7}
                                    fill="#ff2200"
                                    opacity={Math.sin(frame * 0.15 + bi * 0.9) > 0 ? 0.9 : 0.18}
                                    style={{ filter: 'blur(3px)' }} />
                            </g>
                        );
                    })}
                </g>

                {/* ── Fingertip lightning — left hand to buildings ── */}
                {firing && [-0.65, -0.30, 0.02, 0.34, 0.65].map((ang, i) => {
                    // Spread 5 fingers over buildings [3, 2, 2, 1, 0] (reversed to avoid crossover)
                    const bIdx = [3, 2, 2, 1, 0][i];
                    const b = BUILDINGS[bIdx];
                    const tx = b.x + b.w * (0.3 + i * 0.1);
                    const ty = GROUND_Y - b.h;

                    // Calculate left fingertip coordinates dynamically (matching GiantRobot geometry)
                    const baseAng = Math.PI * 0.5 + ang;
                    const fLen = 95 + i * 6;
                    const tipX = lHandX + Math.cos(baseAng) * fLen;
                    const tipY = lHandY + Math.sin(baseAng) * fLen;

                    const main = boltPath(tipX, tipY, tx, ty, i * 13, frame, baseAng);
                    return (
                        <g key={`ll-${i}`}>
                            <path d={main} stroke="white" strokeWidth={8} fill="none"
                                opacity={bass * 0.4} style={{ filter: 'url(#glow-bolt-r)' }} />
                            <path d={main}
                                stroke={`hsl(${160 + bass * 40},100%,80%)`}
                                strokeWidth={2} fill="none" opacity={0.95} />
                            {/* Impact */}
                            <circle cx={tx} cy={ty} r={8 + bass * 18}
                                fill="white" opacity={bass * 0.85}
                                style={{ filter: 'blur(8px)' }} />
                        </g>
                    );
                })}
                {/* ── Fingertip lightning — right hand to buildings ── */}
                {firing && [0.65, 0.30, -0.02, -0.34, -0.65].map((ang, i) => {
                    // Spread 5 fingers over buildings [3, 4, 5, 5, 6]
                    const bIdx = [3, 4, 5, 5, 6][i];
                    const b = BUILDINGS[bIdx];
                    const tx = b.x + b.w * (0.3 + i * 0.1);
                    const ty = GROUND_Y - b.h;

                    // Calculate right fingertip coordinates dynamically
                    const baseAng = Math.PI * 0.5 + ang;
                    const fLen = 95 + i * 6;
                    const tipX = rHandX + Math.cos(baseAng) * fLen;
                    const tipY = rHandY + Math.sin(baseAng) * fLen;

                    const main = boltPath(tipX, tipY, tx, ty, (i + 7) * 11, frame, baseAng);
                    return (
                        <g key={`rl-${i}`}>
                            <path d={main} stroke="white" strokeWidth={8} fill="none"
                                opacity={bass * 0.4} style={{ filter: 'url(#glow-bolt-r)' }} />
                            <path d={main}
                                stroke={`hsl(${160 + bass * 40},100%,80%)`}
                                strokeWidth={2} fill="none" opacity={0.95} />
                            <circle cx={tx} cy={ty} r={8 + bass * 18}
                                fill="white" opacity={bass * 0.85}
                                style={{ filter: 'blur(8px)' }} />
                        </g>
                    );
                })}

                {/* ── Explosions ── */}
                {explosions.map((ex, ei) => ex && (
                    <g key={ei}>
                        <circle cx={ex.x} cy={ex.y} r={30 + bass * 55}
                            fill={`rgba(255,100,0,${bass * 0.35})`}
                            style={{ filter: 'blur(16px)' }} />
                        <circle cx={ex.x} cy={ex.y} r={14 + bass * 28}
                            fill={`rgba(255,220,0,${bass * 0.8})`} />
                        {[...Array(6)].map((_, si) => {
                            const ang = (si / 6) * Math.PI * 2 + ei * 0.9;
                            return (
                                <line key={si}
                                    x1={ex.x} y1={ex.y}
                                    x2={ex.x + Math.cos(ang) * (18 + bass * 38)}
                                    y2={ex.y + Math.sin(ang) * (18 + bass * 38)}
                                    stroke="#ffaa00" strokeWidth={2} opacity={0.85} />
                            );
                        })}
                    </g>
                ))}

                {/* ── Ground ── */}
                <rect x={0} y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#070308" />
                <line x1={0} y1={GROUND_Y} x2={W} y2={GROUND_Y}
                    stroke={`hsl(${20 + bass * 30},100%,${35 + bass * 45}%)`}
                    strokeWidth={3} style={{ filter: 'blur(4px)' }} />
                <line x1={0} y1={GROUND_Y} x2={W} y2={GROUND_Y}
                    stroke={`hsl(${15 + bass * 25},100%,65%)`} strokeWidth={1.5} />

                {/* ── Running people — dense clusters ── */}
                {RUNNERS.map((r, i) => {
                    const cx = ((r.startX + frame * r.speed) % (W + 240)) - 120;
                    return (
                        <Runner key={i}
                            cx={cx} sc={r.sc * 1.15}
                            skin={r.skin} shirt={r.shirt}
                            frame={frame} bass={bass}
                            legPhase={r.phase} />
                    );
                })}

                {/* ── Fire EQ — 24 blocks × 20 bars ── */}
                {(() => {
                    const NBLOCKS = 24;
                    const BARS = 20;
                    const MAX_BIN = 22;
                    const maxH = H - FIRE_Y;
                    const blockW = W / NBLOCKS;
                    const barW = blockW / BARS;

                    const blockScale = Array.from({ length: NBLOCKS }, (_, bi) => {
                        const s1 = Math.sin(frame * (0.021 + bi * 0.003) + bi * 1.7);
                        const s2 = Math.sin(frame * (0.037 + bi * 0.005) + bi * 3.1);
                        const s3 = Math.sin(frame * (0.013 + bi * 0.007) + bi * 5.3);
                        return Math.max(0.25, 0.65 + s1 * 0.20 + s2 * 0.10 + s3 * 0.07);
                    });

                    return Array.from({ length: NBLOCKS }, (_, bi) =>
                        Array.from({ length: BARS }, (_, i) => {
                            const binF = (i / (BARS - 1)) * MAX_BIN;
                            const b0 = Math.floor(binF);
                            const b1 = Math.min(b0 + 1, MAX_BIN);
                            const frac = binF - b0;
                            const raw = (1 - frac) * (viz[b0] ?? 0) + frac * (viz[b1] ?? 0);
                            const amp = Math.min(raw * 4.5 * blockScale[bi], 1);
                            // Reduced height by another 10% (0.78 -> 0.70)
                            const barH = Math.max(4, amp * maxH * 0.70);
                            const hue = 6 + amp * 26;
                            const lit = 22 + amp * 46;
                            const x = bi * blockW + i * barW;
                            return (
                                <rect key={`${bi}-${i}`}
                                    x={x} y={H - barH}
                                    width={barW} height={barH}
                                    fill={`hsl(${hue},100%,${lit}%)`}
                                    opacity={0.7 + amp * 0.3} />
                            );
                        })
                    );
                })()}

                {/* Full-screen red pulse */}
                {firing && (
                    <rect x={0} y={0} width={W} height={H}
                        fill={`rgba(255,20,0,${bass * 0.06})`} />
                )}
            </svg>
        </AbsoluteFill>
    );
};
