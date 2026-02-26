import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

// GlowDot component for antennas and lights
const GlowDot: React.FC<{
    cx: number; cy: number; pulse: number; color: string; baseR?: number;
}> = ({ cx, cy, pulse, color, baseR = 10 }) => (
    <>
        <circle cx={cx} cy={cy} r={baseR + pulse * 48} fill={color}
            opacity={0.18 + pulse * 0.45} style={{ filter: 'blur(8px)' }} />
        <circle cx={cx} cy={cy} r={baseR + pulse * 22} fill={color}
            opacity={0.7 + pulse * 0.3}
            style={{ filter: `drop-shadow(0 0 ${10 + pulse * 38}px ${color})` }} />
        <circle cx={cx} cy={cy} r={baseR * 0.6 + pulse * 8} fill="white"
            opacity={0.3 + pulse * 0.75} />
    </>
);

export const AlienDJ: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#050a1f' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1] + viz[2]) / 3 * 3, 1);
    const mid = Math.min((viz[5] + viz[6] + viz[7]) / 3 * 3, 1);
    const high = Math.min((viz[16] + viz[17] + viz[18]) / 3 * 4, 1);
    const volume = Math.min(bass * 0.6 + mid * 0.3 + high * 0.1, 1);

    const t = frame;
    const cx = width / 2;
    const FLOOR = Math.round(height * 0.75);
    const bodyCx = cx;
    const bodyCy = FLOOR - 200;

    // ── COLORS ──
    const ALIEN_GREEN = '#33ff00';
    const ALIEN_DARK = '#118800';
    const DESK_COLOR = '#111122';
    const VINYL_COLOR = '#0a0a0a';
    const ANTENNA_COLOR = '#00ffff';

    // ── ANIMATIONS ──
    // Head bop
    const headRot = Math.sin(t * 0.1) * (4 + mid * 15);
    const bodyDy = Math.abs(Math.sin(t * 0.2)) * (10 + bass * 30);

    // Scratch logic (platters spin normally, but jolt on bass)
    const baseSpinL = t * 2;
    const baseSpinR = t * 2.5;
    // When bass hits, the scratch offsets aggressively
    const scratchOffsetL = Math.sin(t * 0.5) * (bass * 80);
    const scratchOffsetR = Math.cos(t * 0.5) * (bass * 80);

    const platterRotL = baseSpinL + scratchOffsetL;
    const platterRotR = baseSpinR + scratchOffsetR;

    // DJ Desk dimensions
    const deskW = 700;
    const deskH = 260;
    const platterR = 120;

    const deskY = FLOOR - 50;
    const pLx = cx - 220;
    const pRx = cx + 220;
    const pY = deskY + 110; // Platter center Y

    // Alien structural parameters
    const HEAD_R = 90;
    const BTORSO_RX = 110;
    const BTORSO_RY = 140;

    // Arm calculations to reach the platters
    // We'll visually draw hands attached to the vinyl scratch position
    const handLx = pLx + Math.sin(platterRotL * Math.PI / 180) * (platterR * 0.6);
    const handLy = pY - Math.cos(platterRotL * Math.PI / 180) * (platterR * 0.6);

    const handRx = pRx + Math.cos(platterRotR * Math.PI / 180) * (platterR * 0.6);
    const handRy = pY - Math.sin(platterRotR * Math.PI / 180) * (platterR * 0.6);

    const shoulderLx = bodyCx - BTORSO_RX + 10;
    const shoulderLy = bodyCy + bodyDy - BTORSO_RY * 0.6;

    const shoulderRx = bodyCx + BTORSO_RX - 10;
    const shoulderRy = bodyCy + bodyDy - BTORSO_RY * 0.6;

    // Seven antennas logic
    const antennas = [];
    const totalAntennas = 7;
    for (let i = 0; i < totalAntennas; i++) {
        // Spread angles from -60 to 60 degrees
        const angle = -60 + (120 / (totalAntennas - 1)) * i;
        // High frequency glow that rolls across the antennas
        const roll = Math.abs(Math.sin(t * 0.2 + i * 0.5));
        const pulse = Math.min(high * 1.5 + roll * 0.5, 1);
        antennas.push({ angle, pulse });
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#040011', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── BACKGROUND LASERS / EQ ── */}
            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at 50% 60%, rgba(0, 150, 255, ${0.1 + volume * 0.3}) 0%, rgba(0,0,0,1) 70%)`
            }} />

            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                <defs>
                    <radialGradient id="discoGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                        <stop offset="40%" stopColor="#aaa" stopOpacity="0.6" />
                        <stop offset="70%" stopColor="#555" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#111" stopOpacity="0.2" />
                    </radialGradient>
                    <linearGradient id="rayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="cyan" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* ── DISCO BALL (Moved Down, +20%, Bright Sparkles) ── */}
                <g transform={`translate(${cx}, 240)`}>
                    {/* Hanger wire */}
                    <line x1="0" y1="-240" x2="0" y2="0" stroke="#333" strokeWidth="6" />

                    {/* The Ball Base */}
                    <circle cx="0" cy="0" r="96" fill="#222" />

                    {/* Grid wrapper for tiles */}
                    <g transform={`rotate(${t * 0.5})`}>
                        <circle cx="0" cy="0" r="96" fill="url(#discoGradient)" />
                        {/* Fake tiles effect using intersecting lines (scaled to 96r) */}
                        <path d={`
                            M -72 -62     L 72 -62 
                            M -90 -36     L 90 -36 
                            M -96 0       L 96 0 
                            M -90 36      L 90 36 
                            M -72 62      L 72 62 
                            M -62 -72     L -62 72 
                            M -36 -90     L -36 90 
                            M 0 -96       L 0 96 
                            M 36 -90      L 36 90 
                            M 62 -72      L 62 72 
                        `} stroke="#111" strokeWidth="2" fill="none" opacity="0.6" />

                        {/* HIGHLY VISIBLE RANDOM SPARKLES */}
                        {Array.from({ length: 30 }).map((_, i) => {
                            // Even distribution on sphere
                            const rPos = 85 * Math.sqrt((i + 0.5) / 30);
                            const theta = i * 2.4 * Math.PI;
                            const px = rPos * Math.cos(theta);
                            const py = rPos * Math.sin(theta);

                            // Twinkle math (constantly flashing on and off at different speeds)
                            const twinkle = Math.abs(Math.sin(t * (0.1 + (i % 5) * 0.05) + i));

                            return (
                                <g key={i} transform={`translate(${px}, ${py})`} opacity={twinkle}>
                                    {/* Bright white core */}
                                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                                    {/* Cross flare */}
                                    <path d="M 0 -8 L 0 8 M -8 0 L 8 0" stroke="#ffffff" strokeWidth="2" />
                                    {/* Cyan glow */}
                                    <circle cx="0" cy="0" r="10" fill="cyan" opacity={0.8} style={{ filter: 'blur(3px)' }} />
                                </g>
                            );
                        })}
                    </g>

                    {/* Flashing rays synced to the beat */}
                    {high > 0.4 && (
                        <g opacity={high * 0.8}>
                            <polygon points="-10,-10 -400,600 400,600 10,-10" fill="url(#rayGradient)" style={{ mixBlendMode: 'screen' }} />
                            <circle cx="0" cy="0" r={96 + high * 80} fill="cyan" opacity={0.3} style={{ filter: 'blur(20px)' }} />
                            <circle cx="0" cy="0" r="140" fill="white" opacity={0.4} style={{ filter: 'blur(50px)' }} />
                        </g>
                    )}
                </g>

                {/* ── BACKGROUND TSUNAMI EQ ── */}
                {Array.from({ length: 64 }, (_, i) => {
                    // Create perfect symmetry: 0-31 (left side) maps to visualizer indices 0-31
                    // 32-63 (right side) maps back downwards 31-0 so the heavy bass is in the middle
                    // but we actually want the heavy bass on the left AND right edges for the tsunami effect:
                    // We'll read index 0 (bass) at the edges, and index 31 (highs) at the center.
                    const isLeftHalf = i < 32;
                    // Left edge (i=0) -> visData[0]
                    // Center (i=31,32) -> visData[31]
                    // Right edge (i=63) -> visData[0]
                    const visIdx = isLeftHalf ? i : (63 - i);

                    const eqAmp = Math.min((viz[visIdx] ?? 0) * 3.5, 1);
                    const bw = width / 64;
                    // Tsunami height: reaches almost to top of the screen on strong beats
                    const bh = 50 + eqAmp * (height * 0.7);

                    // Color gradient based on frequency/position and amplitude
                    const hue = 180 + (i / 64) * 120 + eqAmp * 60; // Cyan -> Blue -> Purple/Pink

                    return (
                        <g key={i}>
                            {/* Main vibrant bar */}
                            <rect x={i * bw} y={deskY - bh + 50} width={bw + 1} height={bh}
                                fill={`hsl(${hue}, 100%, 60%)`}
                                opacity={0.3 + eqAmp * 0.5} />
                            {/* Intense glow layer */}
                            <rect x={i * bw} y={deskY - bh + 50} width={bw + 1} height={bh}
                                fill={`hsl(${hue}, 100%, 70%)`}
                                opacity={eqAmp * 0.8}
                                style={{ filter: 'blur(12px)' }} />
                        </g>
                    );
                })}

                {/* ── ALIEN BODY (rendered behind desk) ── */}
                <g transform={`translate(0, ${bodyDy})`}>
                    {/* Torso */}
                    <ellipse cx={bodyCx} cy={bodyCy} rx={BTORSO_RX} ry={BTORSO_RY} fill={ALIEN_DARK} />
                    <ellipse cx={bodyCx} cy={bodyCy} rx={BTORSO_RX * 0.8} ry={BTORSO_RY * 0.8} fill={ALIEN_GREEN} />

                    {/* Head */}
                    <g transform={`translate(${bodyCx}, ${bodyCy - BTORSO_RY - HEAD_R * 0.5}) rotate(${headRot})`}>
                        {/* 7 Antennas */}
                        {antennas.map((ant, i) => (
                            <g key={i} transform={`rotate(${ant.angle})`}>
                                <rect x="-4" y={-HEAD_R - 60} width="8" height="60" fill={ALIEN_DARK} />
                                <polygon points="-6,-HEAD_R - 60 6,-HEAD_R - 60 0,-HEAD_R - 100" fill={ALIEN_GREEN} />
                                <GlowDot cx={0} cy={-HEAD_R - 110} pulse={ant.pulse} color={ANTENNA_COLOR} baseR={6} />
                            </g>
                        ))}

                        {/* Cranium */}
                        <ellipse cx="0" cy="0" rx={HEAD_R} ry={HEAD_R * 1.1} fill={ALIEN_GREEN} />

                        {/* Eyes — pulsating to mid */}
                        <g transform="translate(-35, -10)">
                            <ellipse cx="0" cy="0" rx={24 + mid * 8} ry={36 + mid * 12} fill="black" transform="rotate(-15)" />
                            <circle cx="5" cy="-5" r="8" fill="white" opacity="0.8" />
                        </g>
                        <g transform="translate(35, -10)">
                            <ellipse cx="0" cy="0" rx={24 + mid * 8} ry={36 + mid * 12} fill="black" transform="rotate(15)" />
                            <circle cx="-5" cy="-5" r="8" fill="white" opacity="0.8" />
                        </g>

                        {/* Mouth — opens on bass */}
                        <ellipse cx="0" cy="50" rx={15 + bass * 25} ry={4 + bass * 18} fill="black" />
                    </g>
                </g>

                {/* ── ARMS (IK-style simple straight bezier to hands) ── */}
                {/* Left Arm */}
                <path d={`M ${shoulderLx} ${shoulderLy} Q ${shoulderLx - 100} ${handLy - 100} ${handLx} ${handLy}`}
                    stroke={ALIEN_GREEN} strokeWidth={24} fill="none" strokeLinecap="round" />
                {/* Right Arm */}
                <path d={`M ${shoulderRx} ${shoulderRy} Q ${shoulderRx + 100} ${handRy - 100} ${handRx} ${handRy}`}
                    stroke={ALIEN_GREEN} strokeWidth={24} fill="none" strokeLinecap="round" />


                {/* ── DJ DESK ── */}
                <g transform={`translate(${cx - deskW / 2}, ${deskY})`}>
                    {/* Console Base */}
                    <rect x="0" y="0" width={deskW} height={deskH} rx="20" fill={DESK_COLOR}
                        stroke="#00ffff" strokeWidth="4" />
                    <rect x="10" y="10" width={deskW - 20} height={deskH - 20} rx="15" fill="#1a1a3a" />

                    {/* Front LED strip (strobe on bass) */}
                    <rect x="20" y={deskH - 40} width={deskW - 40} height="15" rx="7"
                        fill="cyan" opacity={0.3 + bass * 0.7} style={{ filter: 'blur(5px)' }} />
                    <rect x="20" y={deskH - 40} width={deskW - 40} height="15" rx="7" fill="white" opacity={bass} />

                    {/* Mixer Section (Middle) */}
                    <rect x={deskW / 2 - 80} y="30" width="160" height="180" rx="10" fill="#0c0c1c" stroke="#333" strokeWidth="3" />

                    {/* Volume Sliders inside Mixer */}
                    {Array.from({ length: 4 }).map((_, i) => {
                        const sx = deskW / 2 - 50 + i * 33;
                        const sy = 60 + Math.sin(t * 0.3 + i) * 20; // Auto-moving faders
                        return (
                            <g key={`fader-${i}`}>
                                <rect x={sx - 2} y="50" width="4" height="140" fill="#000" />
                                <rect x={sx - 10} y={sy} width="20" height="40" rx="4" fill="#666" />
                                <rect x={sx - 6} y={sy + 20} width="12" height="4" fill="cyan" />
                            </g>
                        );
                    })}

                    {/* Turntables */}
                    {/* Left Vinyl */}
                    <g transform={`translate(130, 110)`}>
                        <circle cx="0" cy="0" r={platterR + 10} fill="#333" />
                        <g transform={`rotate(${platterRotL})`}>
                            <circle cx="0" cy="0" r={platterR} fill={VINYL_COLOR} />
                            {/* Grooves */}
                            <circle cx="0" cy="0" r={platterR * 0.8} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            <circle cx="0" cy="0" r={platterR * 0.6} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            <circle cx="0" cy="0" r={platterR * 0.4} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            {/* Inner Label */}
                            <circle cx="0" cy="0" r={platterR * 0.3} fill="#ff00ff" />
                            <circle cx="50" cy="0" r="10" fill="white" opacity="0.6" /> {/* Scratch marker */}
                        </g>
                        {/* Tonearm */}
                        <path d={`M 100 -100 L 40 -10`} stroke="silver" strokeWidth="8" fill="none" strokeLinecap="round" />
                    </g>

                    {/* Right Vinyl */}
                    <g transform={`translate(${deskW - 130}, 110)`}>
                        <circle cx="0" cy="0" r={platterR + 10} fill="#333" />
                        <g transform={`rotate(${platterRotR})`}>
                            <circle cx="0" cy="0" r={platterR} fill={VINYL_COLOR} />
                            <circle cx="0" cy="0" r={platterR * 0.8} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            <circle cx="0" cy="0" r={platterR * 0.6} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            <circle cx="0" cy="0" r={platterR * 0.4} stroke="#1a1a1a" strokeWidth="4" fill="none" />
                            {/* Inner Label */}
                            <circle cx="0" cy="0" r={platterR * 0.3} fill="cyan" />
                            <circle cx="50" cy="0" r="10" fill="white" opacity="0.6" /> {/* Scratch marker */}
                        </g>
                        {/* Tonearm */}
                        <path d={`M 100 -100 L 40 -10`} stroke="silver" strokeWidth="8" fill="none" strokeLinecap="round" />
                    </g>
                </g>

                {/* ── HANDS OVER THE VINYLS ── */}
                <circle cx={handLx} cy={handLy} r="25" fill={ALIEN_DARK} />
                <circle cx={handRx} cy={handRy} r="25" fill={ALIEN_DARK} />

            </svg>
        </AbsoluteFill>
    );
};
