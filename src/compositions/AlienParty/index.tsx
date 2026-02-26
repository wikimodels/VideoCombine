import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

// ─── Character dimensions (unscaled) ───────────────────────────────────────
const HEAD_R = 42;
const BODY_W = 60;
const BODY_H = 80;
const ARM_U = 54;  // upper arm
const ARM_F = 48;  // forearm
const LEG_U = 60;  // thigh
const LEG_L = 52;  // calf

// Feet are LEG_U + LEG_L + 14 below body-center ≈ 126px
const FOOT_OFFSET = LEG_U + LEG_L + 14;

// ─── One alien ─────────────────────────────────────────────────────────────
interface AlienProps {
    frame: number;
    phase: number;
    bass: number;
    mid: number;
    high: number;
    isBeat: boolean;
    baseHue: number; // base body hue in degrees
    eye: string;
    glow: string;
    speedK: number;
}

const Alien: React.FC<AlienProps> = ({
    frame, phase, bass, mid, high, isBeat, baseHue, eye, glow, speedK,
}) => {
    const t = frame * speedK;

    // ── Dynamic body color — shifts hue with frequency zones ─────────────────
    const dynHue = ((baseHue + bass * 60 + mid * 25 - high * 35) % 360 + 360) % 360;
    const color = `hsl(${dynHue.toFixed(0)}, 100%, 52%)`; // shadows the old prop

    // ── Body: jumps slightly up on beat ──────────────────────────────────────
    const bodyDy = -Math.abs(Math.sin(t * 0.18 + phase)) * (6 + bass * 36);

    // ── Head: side-to-side bob ────────────────────────────────────────────────
    const headRot = Math.sin(t * 0.14 + phase + 1) * (7 + high * 38);

    // ── Arms: alternating swing + beat kick ──────────────────────────────────
    const swing = Math.sin(t * 0.17 + phase) * (28 + mid * 65);
    const beatStr = Math.min(bass * 3, 1);

    // Pseudo-random side: slow sine unique per alien (phase shifts it differently)
    const raiseLeft = Math.sin(frame * 0.007 + phase * 3.1) > 0;
    const raiseL = raiseLeft ? beatStr * 132 : -(beatStr * 16);
    const raiseR = !raiseLeft ? beatStr * 132 : -(beatStr * 16);

    const uArmL = -50 + swing - raiseL;
    const fArmL = 30 + Math.sin(t * 0.21 + phase + 0.4) * (18 + mid * 40) * (1 - beatStr * 0.65);
    const uArmR = 50 - swing + raiseR;
    const fArmR = -30 + Math.sin(t * 0.21 + phase + Math.PI + 0.4) * (18 + mid * 40) * (1 - beatStr * 0.65);

    // ── Legs: walk/step motion driven by bass ────────────────────────────────
    const step = Math.sin(t * 0.19 + phase) * (18 + bass * 42);
    const knee = Math.abs(Math.cos(t * 0.19 + phase)) * (10 + bass * 28);
    const thighL = step;
    const calfL = -knee;
    const thighR = -step;
    const calfR = knee;



    return (
        <g transform={`translate(0, ${bodyDy})`}>

            {/* ── LEGS ── */}
            {/* Left */}
            <g transform={`translate(${-BODY_W * 0.35}, ${BODY_H * 0.5})`}>
                <g transform={`rotate(${thighL})`}>
                    <line x1="0" y1="0" x2="0" y2={LEG_U}
                        stroke={color} strokeWidth={14} strokeLinecap="round" />
                    <g transform={`translate(0, ${LEG_U})`}>
                        <g transform={`rotate(${calfL})`}>
                            <line x1="0" y1="0" x2="0" y2={LEG_L}
                                stroke={color} strokeWidth={11} strokeLinecap="round" />
                            <ellipse cx="10" cy={LEG_L + 10} rx="20" ry="11" fill={eye} opacity={0.9} />
                        </g>
                    </g>
                </g>
            </g>

            {/* Right */}
            <g transform={`translate(${BODY_W * 0.35}, ${BODY_H * 0.5})`}>
                <g transform={`rotate(${thighR})`}>
                    <line x1="0" y1="0" x2="0" y2={LEG_U}
                        stroke={color} strokeWidth={14} strokeLinecap="round" />
                    <g transform={`translate(0, ${LEG_U})`}>
                        <g transform={`rotate(${calfR})`}>
                            <line x1="0" y1="0" x2="0" y2={LEG_L}
                                stroke={color} strokeWidth={11} strokeLinecap="round" />
                            <ellipse cx="-10" cy={LEG_L + 10} rx="20" ry="11" fill={eye} opacity={0.9} />
                        </g>
                    </g>
                </g>
            </g>

            {/* ── LEFT ARM (drawn before body so body overlaps) ── */}
            <g transform={`translate(${-BODY_W * 0.5 - 6}, ${-BODY_H * 0.3})`}>
                <g transform={`rotate(${uArmL})`}>
                    <line x1="0" y1="0" x2="0" y2={ARM_U}
                        stroke={color} strokeWidth={12} strokeLinecap="round" />
                    <g transform={`translate(0, ${ARM_U})`}>
                        <g transform={`rotate(${fArmL})`}>
                            <line x1="0" y1="0" x2="0" y2={ARM_F}
                                stroke={color} strokeWidth={9} strokeLinecap="round" />
                            <circle cx="0" cy={ARM_F} r="10" fill={eye}
                                style={{ filter: `drop-shadow(0 0 6px ${eye})` }} />
                        </g>
                    </g>
                </g>
            </g>

            {/* ── BODY ── */}
            {/* Glow behind body */}
            <ellipse cx="0" cy="0" rx={BODY_W * 0.7} ry={BODY_H * 0.6}
                fill={glow} opacity={0.25 + bass * 0.35}
                style={{ filter: 'blur(12px)' }} />
            {/* Body shape */}
            <rect x={-BODY_W / 2} y={-BODY_H / 2} width={BODY_W} height={BODY_H}
                rx="28" fill={color} opacity={0.95} />
            {/* Belly spot */}
            <ellipse cx="0" cy="10" rx="20" ry="24" fill={eye} opacity={0.3} />
            {/* Belly glow on beat */}
            {isBeat && (
                <ellipse cx="0" cy="10" rx="24" ry="28" fill={eye} opacity={bass * 0.5}
                    style={{ filter: 'blur(6px)' }} />
            )}

            {/* ── RIGHT ARM ── */}
            <g transform={`translate(${BODY_W * 0.5 + 6}, ${-BODY_H * 0.3})`}>
                <g transform={`rotate(${uArmR})`}>
                    <line x1="0" y1="0" x2="0" y2={ARM_U}
                        stroke={color} strokeWidth={12} strokeLinecap="round" />
                    <g transform={`translate(0, ${ARM_U})`}>
                        <g transform={`rotate(${fArmR})`}>
                            <line x1="0" y1="0" x2="0" y2={ARM_F}
                                stroke={color} strokeWidth={9} strokeLinecap="round" />
                            <circle cx="0" cy={ARM_F} r="10" fill={eye}
                                style={{ filter: `drop-shadow(0 0 6px ${eye})` }} />
                        </g>
                    </g>
                </g>
            </g>

            {/* ── NECK ── */}
            <rect x="-11" y={-BODY_H / 2 - 20} width="22" height="24" rx="9" fill={color} />

            {/* ── HEAD ── */}
            <g transform={`translate(0, ${-BODY_H / 2 - HEAD_R - 14}) rotate(${headRot})`}>
                {/* Head glow */}
                <circle cx="0" cy="0" r={HEAD_R + 10} fill={glow} opacity={0.2 + bass * 0.3}
                    style={{ filter: 'blur(10px)' }} />
                {/* Head */}
                <circle cx="0" cy="0" r={HEAD_R} fill={color} />

                {/* Antenna */}
                <line x1="0" y1={-HEAD_R} x2="-8" y2={-HEAD_R - 34}
                    stroke={color} strokeWidth={6} strokeLinecap="round" />
                {(() => {
                    const pulse = Math.min(bass * 3, 1); // bass guaranteed to fire in phonk
                    return (
                        <>
                            {/* Big outer halo */}
                            <circle cx="-8" cy={-HEAD_R - 44}
                                r={12 + pulse * 55}
                                fill={eye} opacity={0.20 + pulse * 0.50}
                                style={{ filter: `blur(${8 + pulse * 14}px)` }} />
                            {/* Mid ring */}
                            <circle cx="-8" cy={-HEAD_R - 44}
                                r={9 + pulse * 28}
                                fill={eye} opacity={0.68 + pulse * 0.32}
                                style={{ filter: `drop-shadow(0 0 ${14 + pulse * 56}px ${eye})` }} />
                            {/* Hot white core — flashes on beat */}
                            <circle cx="-8" cy={-HEAD_R - 44}
                                r={5 + pulse * 10}
                                fill="white" opacity={0.34 + pulse * 0.78} />
                        </>
                    );
                })()}

                {/* Eyes — bottom half of head */}
                <ellipse cx="-16" cy="4" rx="13" ry="17" fill="white" />
                <ellipse cx=" 16" cy="4" rx="13" ry="17" fill="white" />
                <circle cx="-15" cy="5" r="8" fill={eye} />
                <circle cx=" 17" cy="5" r="8" fill={eye} />
                <circle cx="-13" cy="3" r="3.5" fill="#111" />
                <circle cx=" 19" cy="3" r="3.5" fill="#111" />
                {/* Shine */}
                <circle cx="-10" cy="-1" r="2" fill="white" opacity={0.85} />
                <circle cx=" 22" cy="-1" r="2" fill="white" opacity={0.85} />

                {/* Mouth — smile or open on beat */}
                {isBeat && bass > 0.4
                    ? <ellipse cx="0" cy="22" rx="12" ry="8" fill="#111" />
                    : <path d="M-14,20 Q0,32 14,20" stroke="#111" strokeWidth="3"
                        fill="none" strokeLinecap="round" />
                }
            </g>

        </g>
    );
};

// ─── Main scene ────────────────────────────────────────────────────────────
const ALIENS = [
    { x: 200, scale: 0.92, phase: 0, speedK: 1.05, baseHue: 135, eye: '#00cc44', glow: '#00ff44' },
    { x: 540, scale: 1.12, phase: Math.PI / 2.5, speedK: 1.0, baseHue: 280, eye: '#9900ff', glow: '#cc44ff' },
    { x: 880, scale: 0.92, phase: Math.PI * 0.78, speedK: 0.95, baseHue: 190, eye: '#0099cc', glow: '#00ccff' },
];

export const AlienParty: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#050015' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const mid = (viz[5] + viz[6] + viz[7]) / 3;
    const high = (viz[16] + viz[17]) / 2;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const FLOOR_Y = Math.round(height * 0.78);

    // Disco floor tiles
    const TILE_COLS = 8;
    const TILE_ROWS = 4;
    const tileW = width / TILE_COLS;
    const tileH = (height - FLOOR_Y) / TILE_ROWS;

    // Waveform bars for background
    const bars = Array.from({ length: 48 }, (_, i) => viz[i] ?? 0);

    return (
        <AbsoluteFill style={{ backgroundColor: '#050015', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── STAGE BACKGROUND ── */}
            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at 50% 60%,
          rgba(60,0,120,${0.5 + volume * 0.3}) 0%,
          rgba(5,0,30,1) 70%)`,
            }} />

            {/* ── BACKGROUND WAVEFORM COLUMNS ── */}
            <div style={{
                position: 'absolute', bottom: height - FLOOR_Y,
                left: 0, right: 0, height: FLOOR_Y,
                display: 'flex', alignItems: 'flex-end', gap: 0,
            }}>
                {bars.map((amp, i) => {
                    const hue = (i / bars.length) * 260 + 200;
                    return (
                        <div key={i} style={{
                            flex: 1,
                            height: `${amp * 3 * 50}%`,
                            background: `hsl(${hue},100%,55%)`,
                            opacity: 0.18 + amp * 0.15,
                        }} />
                    );
                })}
            </div>

            {/* ── SPOTLIGHTS on each alien ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {ALIENS.map((a, i) => (
                    <polygon key={i}
                        points={`${a.x},0 ${a.x - 120},${FLOOR_Y} ${a.x + 120},${FLOOR_Y}`}
                        fill={a.glow}
                        opacity={0.06 + volume * 0.07}
                    />
                ))}
            </svg>

            {/* ── DISCO FLOOR TILES ── */}
            <svg style={{ position: 'absolute', top: FLOOR_Y, left: 0 }} width={width} height={height - FLOOR_Y}>
                {Array.from({ length: TILE_COLS * TILE_ROWS }, (_, idx) => {
                    const col = idx % TILE_COLS;
                    const row = Math.floor(idx / TILE_COLS);
                    const tileAmp = (viz[(idx * 3) % 32] ?? 0) * 3;
                    const hue = (idx * 47 + frame * 0.8) % 360;
                    return (
                        <rect key={idx}
                            x={col * tileW + 2} y={row * tileH + 2}
                            width={tileW - 4} height={tileH - 4}
                            rx={6}
                            fill={`hsl(${hue},100%,50%)`}
                            opacity={0.08 + tileAmp * 0.55}
                            style={{ filter: tileAmp > 0.4 ? `drop-shadow(0 0 10px hsl(${hue},100%,60%))` : undefined }}
                        />
                    );
                })}
                {/* Floor line */}
                <line x1="0" y1="1" x2={width} y2="1"
                    stroke={`rgba(200,100,255,${0.3 + volume * 0.5})`} strokeWidth={3}
                    style={{ filter: `drop-shadow(0 0 ${6 + volume * 12}px rgba(200,100,255,0.9))` }} />
            </svg>

            {/* ── ALIEN CHARACTERS ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {ALIENS.map((a, i) => {
                    const bodyY = FLOOR_Y - a.scale * FOOT_OFFSET;
                    // Shadow on floor
                    const shadowW = (50 + bass * 30) * a.scale;
                    return (
                        <g key={i}>
                            {/* Floor shadow */}
                            <ellipse
                                cx={a.x} cy={FLOOR_Y + 8}
                                rx={shadowW} ry={10 * a.scale}
                                fill="rgba(0,0,0,0.5)"
                                style={{ filter: 'blur(4px)' }}
                            />
                            {/* Character */}
                            <g transform={`translate(${a.x}, ${bodyY}) scale(${a.scale})`}>
                                <Alien
                                    frame={frame}
                                    phase={a.phase}
                                    bass={bass}
                                    mid={mid}
                                    high={high}
                                    isBeat={isBeat}
                                    baseHue={a.baseHue}
                                    eye={a.eye}
                                    glow={a.glow}
                                    speedK={a.speedK}
                                />
                            </g>
                        </g>
                    );
                })}
            </svg>

            {/* ── BEAT CONFETTI PARTICLES ── */}
            {isBeat && (
                <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                    {Array.from({ length: 18 }, (_, i) => {
                        const angle = (i / 18) * Math.PI * 2;
                        const dist = 80 + bass * 200;
                        const px = width / 2 + Math.cos(angle) * dist * 2;
                        const py = FLOOR_Y * 0.4 + Math.sin(angle) * dist;
                        const hue = (i * 20 + frame * 3) % 360;
                        return (
                            <circle key={i}
                                cx={px} cy={py}
                                r={4 + bass * 8}
                                fill={`hsl(${hue},100%,65%)`}
                                opacity={bass * 0.9}
                                style={{ filter: `drop-shadow(0 0 6px hsl(${hue},100%,65%))` }}
                            />
                        );
                    })}
                </svg>
            )}

            {/* ── BEAT FLASH ── */}
            {isBeat && (
                <AbsoluteFill style={{
                    background: `rgba(180,0,255,${bass * 0.1})`,
                    pointerEvents: 'none',
                }} />
            )}

            {/* ── SCANLINES ── */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 4px)',
                pointerEvents: 'none',
            }} />
        </AbsoluteFill>
    );
};
