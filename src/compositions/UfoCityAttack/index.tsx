import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { TwinklingStarfield } from '../../components/TwinklingStarfield';

// ─── Scene constants ───────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const GROUND_Y = H * 0.80;   // where feet touch
const FIRE_Y = H * 0.84;   // top of fire EQ zone
const SKY_Y = H * 0.16;   // UFO hover zone

const sr = (seed: number) => Math.abs(Math.sin(seed * 127.1 + 97.3));

// ─── Buildings ────────────────────────────────────────────────────────────────
const BUILDINGS = [
    { x: -20, w: 180, h: 260, color: '#1a1a2e' },
    { x: 155, w: 140, h: 360, color: '#16213e' },
    { x: 290, w: 200, h: 300, color: '#0f3460' },
    { x: 480, w: 160, h: 410, color: '#1a1a2e' },
    { x: 635, w: 220, h: 320, color: '#16213e' },
    { x: 848, w: 150, h: 375, color: '#0f3460' },
    { x: 990, w: 180, h: 280, color: '#1a1a2e' },
];

const WINDOWS = BUILDINGS.map((b) => {
    const cols = Math.max(1, Math.floor((b.w - 20) / 38));
    const rows = Math.max(1, Math.floor((b.h - 30) / 45));
    return Array.from({ length: cols * rows }, (_, i) => ({
        col: i % cols, row: Math.floor(i / cols), seed: i + b.x,
    }));
});

const UFO_X = [W * 0.15, W * 0.50, W * 0.85];

function boltPath(x1: number, y1: number, x2: number, y2: number, seed: number, frame: number, steps = 12): string {
    let d = `M ${x1} ${y1}`;
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const jitter = Math.sin(t * Math.PI) * 55;
        const rx = Math.sin(seed * 3.7 + i * 2.9 + frame * 0.9) * jitter;
        const ry = Math.sin(seed * 5.1 + i * 1.7 + frame * 1.1) * jitter * 0.3;
        d += ` L ${x1 + (x2 - x1) * t + rx} ${y1 + (y2 - y1) * t + ry}`;
    }
    return d + ` L ${x2} ${y2}`;
}

// ─── Human stick figure in panic ──────────────────────────────────────────────
// Each figure has its own random phases for arms and legs
const PEOPLE = [
    { cx: W * 0.09, sc: 0.85, skinColor: '#ffe0b2', shirtColor: '#ff1744', armPhase: 0.0, legPhase: 0.3 },
    { cx: W * 0.26, sc: 1.00, skinColor: '#fff9c4', shirtColor: '#00e5ff', armPhase: 1.7, legPhase: 1.1 },
    { cx: W * 0.44, sc: 1.10, skinColor: '#ffccbc', shirtColor: '#76ff03', armPhase: 0.9, legPhase: 2.0 },
    { cx: W * 0.63, sc: 0.92, skinColor: '#ffe0b2', shirtColor: '#ff9100', armPhase: 2.3, legPhase: 0.7 },
    { cx: W * 0.86, sc: 0.88, skinColor: '#fff9c4', shirtColor: '#e040fb', armPhase: 1.2, legPhase: 1.6 },
];

const StickPerson: React.FC<{
    cx: number; sc: number;
    skinColor: string; shirtColor: string;
    armPhase: number; legPhase: number;
    bass: number; frame: number;
}> = ({ cx, sc, skinColor, shirtColor, armPhase, legPhase, bass, frame }) => {
    const gY = GROUND_Y;
    const t = frame * 0.1;

    const sw = 9 * sc;          // stroke width
    const headR = 28 * sc;
    const torsoH = 100 * sc;
    const legLen = 80 * sc;
    const armLen = 65 * sc;
    const shoulderW = 38 * sc;

    const hipY = gY - legLen;
    const shoulderY = hipY - torsoH;
    const headCy = shoulderY - headR;

    // Arms: each arm waves independently (panic!)
    const armRAng = -Math.PI * 0.15 - Math.PI * 0.75 * Math.max(0, Math.min(1,
        0.3 + Math.sin(t * 1.1 + armPhase) * 0.7 + bass * 0.5));
    const armLAng = -Math.PI * 0.85 + Math.PI * 0.75 * Math.max(0, Math.min(1,
        0.3 + Math.sin(t * 1.3 + armPhase + 1.5) * 0.7 + bass * 0.5));

    const rHandX = cx + shoulderW + Math.cos(armRAng) * armLen;
    const rHandY = shoulderY + Math.sin(armRAng) * armLen;
    const lHandX = cx - shoulderW + Math.cos(armLAng) * armLen;
    const lHandY = shoulderY + Math.sin(armLAng) * armLen;

    // Legs: alternate stomp
    const legStampAmp = 22 * sc * (1 + bass * 1.5);
    const rFootY = gY - Math.max(0, Math.sin(t * 1.4 + legPhase)) * legStampAmp;
    const rFootX = cx + 18 * sc + Math.cos(t * 1.4 + legPhase) * 12 * sc;
    const lFootY = gY - Math.max(0, Math.sin(t * 1.4 + legPhase + Math.PI)) * legStampAmp;
    const lFootX = cx - 18 * sc + Math.cos(t * 1.4 + legPhase + Math.PI) * 12 * sc;

    return (
        <g>
            {/* Shadow */}
            <ellipse cx={cx} cy={gY + 10} rx={30 * sc} ry={8 * sc} fill="rgba(0,0,0,0.3)" />

            {/* Legs */}
            <line x1={cx + 10 * sc} y1={hipY} x2={rFootX} y2={rFootY}
                stroke={shirtColor} strokeWidth={sw * 0.9} strokeLinecap="round" />
            <line x1={cx - 10 * sc} y1={hipY} x2={lFootX} y2={lFootY}
                stroke={shirtColor} strokeWidth={sw * 0.9} strokeLinecap="round" />
            {/* Feet */}
            <ellipse cx={rFootX} cy={rFootY} rx={12 * sc} ry={6 * sc} fill={skinColor} />
            <ellipse cx={lFootX} cy={lFootY} rx={12 * sc} ry={6 * sc} fill={skinColor} />

            {/* Torso */}
            <line x1={cx} y1={shoulderY} x2={cx} y2={hipY}
                stroke={shirtColor} strokeWidth={sw * 1.3} strokeLinecap="round" />

            {/* Shoulders → hands */}
            <line x1={cx + shoulderW} y1={shoulderY} x2={rHandX} y2={rHandY}
                stroke={skinColor} strokeWidth={sw} strokeLinecap="round" />
            <line x1={cx - shoulderW} y1={shoulderY} x2={lHandX} y2={lHandY}
                stroke={skinColor} strokeWidth={sw} strokeLinecap="round" />
            {/* Hands */}
            <circle cx={rHandX} cy={rHandY} r={6 * sc} fill={skinColor} />
            <circle cx={lHandX} cy={lHandY} r={6 * sc} fill={skinColor} />

            {/* Head */}
            <circle cx={cx} cy={headCy} r={headR} fill={skinColor} />
            {/* Eyes — wide with fear */}
            <circle cx={cx - 9 * sc} cy={headCy - 4 * sc} r={(3 + bass * 4) * sc} fill="#111" />
            <circle cx={cx + 9 * sc} cy={headCy - 4 * sc} r={(3 + bass * 4) * sc} fill="#111" />
            {/* Pupils */}
            <circle cx={cx - 8 * sc} cy={headCy - 4 * sc} r={1.5 * sc} fill="white" />
            <circle cx={cx + 8 * sc} cy={headCy - 4 * sc} r={1.5 * sc} fill="white" />
            {/* Open mouth */}
            <ellipse cx={cx} cy={headCy + 10 * sc}
                rx={(5 + bass * 12) * sc} ry={(4 + bass * 10) * sc}
                fill="#222" />
            <ellipse cx={cx} cy={headCy + 8 * sc}
                rx={(3 + bass * 8) * sc} ry={(2 + bass * 6) * sc}
                fill="#c0392b" />
        </g>
    );
};

// ─── UFO ──────────────────────────────────────────────────────────────────────
const UfoSvg: React.FC<{ cx: number; cy: number; bass: number; firing: boolean }> = ({ cx, cy, bass, firing }) => (
    <g>
        <ellipse cx={cx} cy={cy + 7} rx={98} ry={9} fill="rgba(0,0,0,0.28)" />
        <ellipse cx={cx} cy={cy} rx={98} ry={23} fill="#778899" />
        <ellipse cx={cx} cy={cy - 2} rx={94} ry={19} fill="#aabbcc" />
        <ellipse cx={cx} cy={cy - 14} rx={55} ry={22} fill="#667788" />
        <ellipse cx={cx} cy={cy} rx={99} ry={10} fill="none" stroke="#ccdde0" strokeWidth={4} />
        <ellipse cx={cx} cy={cy - 24} rx={32} ry={21}
            fill={firing ? `rgba(0,255,255,${0.5 + bass * 0.4})` : 'rgba(0,180,255,0.3)'}
            stroke="#00ddff" strokeWidth={2} />
        <line x1={cx} y1={cy - 40} x2={cx} y2={cy - 62} stroke="#aabbcc" strokeWidth={5} strokeLinecap="round" />
        <circle cx={cx} cy={cy - 64}
            r={firing ? 13 + bass * 18 : 7}
            fill={firing ? `hsl(${bass > 0.6 ? 0 : 160},0%,${80 + bass * 20}%)` : '#0099cc'}
            opacity={firing ? 0.95 : 0.85}
            style={{
                filter: firing
                    ? `drop-shadow(0 0 ${20 + bass * 50}px white) drop-shadow(0 0 ${8 + bass * 20}px cyan)`
                    : 'none'
            }} />
        {[-72, -38, 0, 38, 72].map((dx, i) => (
            <circle key={i} cx={cx + dx} cy={cy + 2} r={5}
                fill={i % 2 === 0 ? '#00ffcc' : '#ff3388'} opacity={0.9} />
        ))}
    </g>
);

// ─── Main composition ──────────────────────────────────────────────────────────
export const UfoCityAttack: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioFile = staticFile('track.mp3');
    const audioData = useAudioData(audioFile);

    if (!audioData) return <AbsoluteFill style={{ background: '#06061a' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1] + viz[2]) / 3 * 2.8, 1);
    const mid = Math.min((viz[5] + viz[6] + viz[7]) / 3 * 3.2, 1);
    const firing = bass > 0.22;

    const shakeX = firing ? Math.sin(frame * 3.1) * bass * 9 : 0;
    const shakeY = firing ? Math.sin(frame * 4.7) * bass * 5 : 0;
    const ufoY = (i: number) => H * 0.16 + Math.sin(frame * 0.045 + i * 1.4) * 50 - (firing ? bass * 25 : 0);

    return (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
            <TwinklingStarfield />
            <Audio src={audioFile} />

            <svg
                width={width} height={height}
                viewBox={`0 0 ${W} ${H}`}
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                <defs>
                    <filter id="glow-bolt">
                        <feGaussianBlur stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="fire-glow">
                        <feGaussianBlur stdDeviation="10" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ── Buildings (shake on strike) ── */}
                <g transform={`translate(${shakeX}, ${shakeY})`}>
                    {BUILDINGS.map((b, bi) => {
                        const bx = b.x;
                        const by = GROUND_Y - b.h;
                        const roofHue = (bi * 55 + 185) % 360;
                        return (
                            <g key={bi}>
                                <rect x={bx + 8} y={by + 8} width={b.w} height={b.h} fill="rgba(0,0,0,0.3)" rx={4} />
                                <rect x={bx} y={by} width={b.w} height={b.h} fill={b.color} rx={4} />
                                <rect x={bx} y={by} width={b.w} height={6}
                                    fill={`hsl(${roofHue},100%,60%)`} style={{ filter: 'blur(4px)' }} opacity={0.8} />
                                <rect x={bx} y={by} width={b.w} height={3}
                                    fill={`hsl(${roofHue},100%,80%)`} />
                                {WINDOWS[bi].map((w, wi) => {
                                    const wx = bx + 12 + w.col * 38;
                                    const wy = by + 22 + w.row * 45;
                                    if (wx + 22 > bx + b.w || wy + 26 > GROUND_Y) return null;
                                    if (sr(w.seed * 7) < 0.38) return null;
                                    const flicker = Math.sin(frame * 0.14 + w.seed * 2.6);
                                    const lum = Math.round((0.35 + mid * 0.45 + flicker * 0.12) * 80);
                                    return (
                                        <rect key={wi} x={wx} y={wy} width={20} height={26}
                                            fill={`hsl(${40 + (w.seed % 3) * 30},80%,${lum}%)`}
                                            opacity={0.75 + mid * 0.25} rx={2} />
                                    );
                                })}
                            </g>
                        );
                    })}
                </g>

                {/* ── Ground ── */}
                <rect x={0} y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#050510" />
                <line x1={0} y1={GROUND_Y} x2={W} y2={GROUND_Y}
                    stroke={`hsl(${270 + bass * 60},100%,${40 + bass * 40}%)`}
                    strokeWidth={4} style={{ filter: 'blur(5px)' }} />
                <line x1={0} y1={GROUND_Y} x2={W} y2={GROUND_Y}
                    stroke={`hsl(${270 + bass * 60},100%,75%)`} strokeWidth={2} />

                {/* ── Human panic figures ── */}
                {PEOPLE.map((p, i) => (
                    <StickPerson
                        key={i}
                        cx={p.cx} sc={p.sc}
                        skinColor={p.skinColor} shirtColor={p.shirtColor}
                        armPhase={p.armPhase} legPhase={p.legPhase}
                        bass={bass} frame={frame}
                    />
                ))}

                {/* ── UFOs ── */}
                {UFO_X.map((ux, i) => (
                    <UfoSvg key={i} cx={ux} cy={ufoY(i)} bass={bass} firing={firing} />
                ))}

                {/* ── Lightning from UFOs ── */}
                {firing && UFO_X.map((ux, i) => {
                    const uy = ufoY(i);
                    const bi = Math.min(Math.round((ux / W) * (BUILDINGS.length - 1)), BUILDINGS.length - 1);
                    const bld = BUILDINGS[bi];
                    const tx = bld.x + bld.w * 0.5;
                    const ty = GROUND_Y - bld.h;
                    const main = boltPath(ux, uy + 65, tx, ty, i * 17, frame);
                    const fT = 0.45;
                    const fx = ux + (tx - ux) * fT + Math.sin(i * 9.1) * 50;
                    const fy = uy + 65 + (ty - uy - 65) * fT;
                    const fork = boltPath(fx, fy, fx + Math.sin(i * 5.3) * 90, fy + 180, i * 31, frame, 7);
                    return (
                        <g key={i}>
                            <path d={main} stroke="white" strokeWidth={9} fill="none"
                                opacity={bass * 0.45} style={{ filter: 'url(#glow-bolt)' }} />
                            <path d={main} stroke={`hsl(${180 + bass * 40},100%,82%)`}
                                strokeWidth={2.5} fill="none" opacity={0.95} />
                            <path d={fork} stroke="white" strokeWidth={1.5} fill="none" opacity={0.55} />
                            <circle cx={tx} cy={ty} r={10 + bass * 22}
                                fill="white" opacity={bass * 0.9} style={{ filter: 'blur(10px)' }} />
                        </g>
                    );
                })}

                {/* ── FIRE EQ — 24 blocks × 20 bars, gap-free ── */}
                {(() => {
                    const NBLOCKS = 24;
                    const BARS = 20;         // bars per block
                    const MAX_BIN = 22;         // bass range to sample
                    const maxH = H - FIRE_Y;
                    const blockW = W / NBLOCKS; // = 45px
                    const barW = blockW / BARS; // = 2.25px — fully dense

                    // Each block has its own slowly-drifting amplitude multiplier
                    const blockScale = Array.from({ length: NBLOCKS }, (_, bi) => {
                        // Triple-layered sin with prime seeds → each block looks truly independent
                        const s1 = Math.sin(frame * (0.021 + bi * 0.003) + bi * 1.7);
                        const s2 = Math.sin(frame * (0.037 + bi * 0.005) + bi * 3.1);
                        const s3 = Math.sin(frame * (0.013 + bi * 0.007) + bi * 5.3);
                        return Math.max(0.25, 0.65 + s1 * 0.20 + s2 * 0.10 + s3 * 0.07);
                    });

                    return Array.from({ length: NBLOCKS }, (_, bi) =>
                        Array.from({ length: BARS }, (_, i) => {
                            // Interpolate across bass bins
                            const binF = (i / (BARS - 1)) * MAX_BIN;
                            const b0 = Math.floor(binF);
                            const b1 = Math.min(b0 + 1, MAX_BIN);
                            const frac = binF - b0;
                            const raw = (1 - frac) * (viz[b0] ?? 0) + frac * (viz[b1] ?? 0);
                            const amp = Math.min(raw * 4.5 * blockScale[bi], 1);
                            const barH = Math.max(4, amp * maxH * 0.92);
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

                {/* Screen vignette on bass */}
                {firing && (
                    <rect x={0} y={0} width={W} height={H}
                        fill={`rgba(255,30,0,${bass * 0.07})`} />
                )}
            </svg>
        </AbsoluteFill>
    );
};
