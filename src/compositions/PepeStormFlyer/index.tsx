import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

export const PepeStormFlyer: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#010005' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1]) / 2 * 4, 1);
    const midL = Math.min((viz[2] + viz[3]) / 2 * 4, 1);
    const high = Math.min((viz[8] + viz[10] + viz[12]) / 3 * 6, 1);

    const t = frame;
    const cx = width / 2;
    const cy = height / 2;
    const FLOOR = Math.round(height * 0.85);

    // ── COLORS ──
    const BG_DEEP_BLUE = '#02000a';
    const OCEAN_LOW = '#00f7ff'; // Cyan
    const OCEAN_MID = '#0033ff'; // Deep blue
    const RAIN_COLOR = '#b300ff'; // Neon purple rain
    const LIGHTNING_COLOR = '#ffffff';
    const PLANE_COLOR = '#ffcc00'; // Yellow biplane

    // ── PLANE KINEMATICS ──
    const planeY = cy - height * 0.05 + Math.sin(t * 0.05) * 50 + bass * 30;
    const planeX = cx;
    const planeRot = Math.sin(t * 0.08) * 5 - (bass - midL) * 10;

    // Propeller spinning super fast
    const propRot = (t * 50) % 360;

    // ── OCEAN EQ GENERATOR ──
    const generateOceanWave = (offset: number, scale: number, layerBass: number) => {
        let d = `M 0,${height} `;
        for (let i = 0; i <= 64; i++) {
            const x = (width / 64) * i;

            // 3 peaks logic
            const blockWidth = 64 / 3;
            const blockIdx = Math.min(2, Math.floor(i / blockWidth));
            const center = (blockIdx + 0.5) * blockWidth;
            // dist: 0 at the peak (center of block), 1 at the edges (valleys)
            const dist = Math.min(1, Math.abs(i - center) / (blockWidth / 2));

            // Map the most active bass bins (0) to the peak, and the quieter bins (15) to valleys
            const vIdx = Math.floor(dist * 15);

            // Randomize height multiplier per peak (unique per wave offset and block)
            const blockMod = 0.5 + Math.abs(Math.sin((blockIdx + 1) * 31.4 + offset * 7)) * 0.8;

            // Fall off near the absolute screen edges smoothly
            const edgeFade = Math.sin((i / 64) * Math.PI);

            const amp = Math.min((viz[vIdx] ?? 0) * 4 * blockMod * edgeFade, 1.2);

            // Rolling wave noise
            const noise = Math.sin(t * 0.1 + i * offset) * 40 * scale;
            const waveH = (50 + amp * 400 * layerBass) * scale;
            const y = FLOOR - waveH + noise;

            d += `L ${x},${y} `;
        }
        d += `L ${width},${height} Z`;
        return d;
    };

    // ── LIGHTNING STRIKES (Drum hits) ──
    // We want sharp, jagged lightning to flash down from the sky when there's a heavy bass hit.
    // Use bass square for a sharp, intense trigger.
    const lightningTrigger = Math.pow(bass, 3);
    const showLightning = lightningTrigger > 0.4;

    // Randomize lightning path based on frame so it flickers cleanly
    const lx = cx + Math.sin(t * 100) * 300;
    let lightningPath = `M ${lx} 0 `;
    let currentLx = lx;
    for (let y = 0; y < height; y += 100) {
        currentLx += (Math.random() - 0.5) * 150;
        lightningPath += `L ${currentLx} ${y} `;
    }

    return (
        <AbsoluteFill style={{ backgroundColor: BG_DEEP_BLUE, overflow: 'hidden' }}>
            <Audio src={audioUrl} />
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                <defs>
                    {/* Sky Gradient */}
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#110022" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </linearGradient>

                    {/* Lightning glow */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Sky */}
                <rect x="0" y="0" width={width} height={FLOOR} fill="url(#skyGrad)" />

                {/* Background CLOUDS (Parallax) - Subtler, moving with time */}
                <g opacity="0.3">
                    {[0, 1, 2].map(i => {
                        const cx = ((i * 400 - t * 2) % (width + 400)) - 200;
                        return (
                            <ellipse key={i} cx={cx} cy={100 + i * 50} rx={250} ry={80} fill="#221144" style={{ filter: 'blur(30px)' }} />
                        );
                    })}
                </g>

                {/* STORM LIGHTNING (Behind Plane) */}
                {showLightning && (
                    <g opacity={lightningTrigger}>
                        <rect x="0" y="0" width={width} height={height} fill="#ffffff" opacity="0.1" />
                        <path d={lightningPath} fill="none" stroke={LIGHTNING_COLOR} strokeWidth="8" style={{ filter: 'url(#glow)' }} />
                        <path d={lightningPath} fill="none" stroke="#00ffff" strokeWidth="20" opacity="0.4" style={{ filter: 'blur(10px)' }} />
                    </g>
                )}

                {/* NEON RAIN (Thick Digital Data Columns from CyberDrummer) */}
                {Array.from({ length: 64 }).map((_, i) => {
                    // Mirror mapping: 0-31 left, 32-63 right
                    const vizIndex = i < 32 ? i : 63 - i;
                    // Map inner visualizer values to have higher impact
                    const eqAmp = Math.min((viz[vizIndex] ?? 0) * 4, 1);
                    const dh = 30 + eqAmp * 600; // taller base drops like CyberDrummer
                    const dx = (width / 64) * i;
                    // Make them look like thick raining data
                    const dy = ((t * 80 + i * 143) % height) - dh;
                    return (
                        <rect key={`rain-${i}`} x={dx} y={dy} width="6" height={dh} fill={RAIN_COLOR} opacity={0.3 + eqAmp * 0.7} style={{ filter: 'blur(1px)' }} />
                    );
                })}

                {/* PEPPA PIG PILOT & DETAILED MONOPLANE */}
                {/* Scaled up by another 10% (now 2.18) */}
                <g transform={`translate(${planeX}, ${planeY}) rotate(${planeRot}) scale(2.18)`}>

                    {/* Landing Gear */}
                    <line x1="-30" y1="40" x2="-40" y2="70" stroke="#333" strokeWidth="4" />
                    <line x1="30" y1="40" x2="40" y2="70" stroke="#333" strokeWidth="4" />
                    <circle cx="-40" cy="70" r="12" fill="#222" />
                    <circle cx="40" cy="70" r="12" fill="#222" />
                    {/* Wheel Hubs */}
                    <circle cx="-40" cy="70" r="5" fill="#999" />
                    <circle cx="40" cy="70" r="5" fill="#999" />

                    {/* Shadow cast on the lower hull */}
                    <path d="M -80 0 L 80 0 L 60 40 L -60 40 Z" fill="#b38f00" />

                    {/* Main Plane Hull Base */}
                    <path d="M -120 0 L 100 0 L 100 30 C 100 50, 60 50, 0 50 L -100 40 Z" fill={PLANE_COLOR} />

                    {/* Tail */}
                    <path d="M -120 0 L -140 -40 L -100 -40 L -80 0 Z" fill={PLANE_COLOR} />
                    <path d="M -110 -20 L -60 -20" stroke="#b38f00" strokeWidth="8" />

                    {/* Plane Decal (Star) */}
                    <g transform="translate(-60, 20) scale(0.6)">
                        <polygon points="0,-15 4,-4 15,-4 6,3 9,14 0,7 -9,14 -6,3 -15,-4 -4,-4" fill="#ff0000" />
                    </g>

                    {/* Exhaust Pipe */}
                    <rect x="-10" y="20" width="15" height="6" fill="#444" />
                    <rect x="0" y="26" width="15" height="6" fill="#444" />

                    {/* Cockpit Hole */}
                    <ellipse cx="-20" cy="0" rx="30" ry="15" fill="#333" />

                    {/* --- PEPPA PIG PILOT --- */}
                    <g transform={`translate(-20, 5)`}>
                        {/* Red Dress / Coat */}
                        <path d="M -25 0 Q 0 -40 25 0 Z" fill="#ff0000" />

                        {/* Peppa Head Base (Pink) */}
                        <g transform="translate(0, -25)">
                            {/* Back Ear */}
                            <ellipse cx="-15" cy="-28" rx="3.5" ry="10" fill="#ffb3c6" stroke="#ff8da1" strokeWidth="2" transform="rotate(-15 -15 -28)" />

                            {/* Main Head + Snout (Unified Silhouette) */}
                            <path d="M -15 10 C -30 10, -35 -15, -20 -25 C -5 -35, 10 -25, 20 -15 C 30 -5, 40 -10, 48 -5 C 53 -2, 53 5, 48 8 C 40 12, 30 15, 10 15 C 0 15, -10 10, -15 10 Z" fill="#ffb3c6" stroke="#ff8da1" strokeWidth="2.5" />

                            {/* Front Ear */}
                            <ellipse cx="-5" cy="-30" rx="3.5" ry="10" fill="#ffb3c6" stroke="#ff8da1" strokeWidth="2" transform="rotate(15 -5 -30)" />

                            {/* Snout tip / nose ring */}
                            <ellipse cx="48" cy="2" rx="4" ry="7" fill="#ffb3c6" stroke="#ff8da1" strokeWidth="2.5" />
                            {/* Nostrils */}
                            <circle cx="47" cy="-1.5" r="1.5" fill="#d95a70" />
                            <circle cx="49" cy="4.5" r="1.5" fill="#d95a70" />

                            {/* Cheek */}
                            <circle cx="-5" cy="5" r="7" fill="#ff8da1" />

                            {/* Eyes (Left and Right) */}
                            <circle cx="5" cy="-12" r="4.5" fill="#fff" stroke="#ff8da1" strokeWidth="2" />
                            <circle cx="6" cy="-12" r={2 + high * 2} fill="#000" />

                            <circle cx="18" cy="-8" r="4.5" fill="#fff" stroke="#ff8da1" strokeWidth="2" />
                            <circle cx="19" cy="-8" r={2 + high * 2} fill="#000" />

                            {/* Smile */}
                            <path d="M 5 8 Q 15 15 25 8" fill="none" stroke="#d95a70" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Pilot Hat / Goggles Base (Shifted to fit new head) */}
                            <path d="M -25 -20 Q 0 -35 15 -20 L 25 -10 L 15 -5 L -5 -10 Z" fill="#553311" opacity="0.9" />
                        </g>
                    </g>

                    {/* Bottom Wing */}
                    <path d="M -50 20 L 70 20 L 60 30 L -40 30 Z" fill="#ffb300" />

                    {/* Front Propeller Engine (Reduced by 30% from previous) */}
                    <ellipse cx="106" cy="15" rx="8" ry="15" fill="#666" />
                    {/* Spinning Propeller Blades (Constant size, not reactive to bass) */}
                    <g transform={`translate(118, 15) rotate(${propRot}) scale(0.92, 0.92)`}>
                        <ellipse cx="0" cy="30" rx="4" ry="30" fill="#999" opacity="0.8" />
                        <ellipse cx="0" cy="-30" rx="4" ry="30" fill="#999" opacity="0.8" />
                        <circle cx="0" cy="0" r="6" fill="#333" />
                    </g>
                </g>

                {/* FRONT STORM LIGHTNING (In front of plane) */}
                {showLightning && Math.random() > 0.5 && (
                    <g opacity={lightningTrigger * 0.8}>
                        <path d={lightningPath.replace(/M \d+/, `M ${cx - 200 + Math.random() * 400}`)} fill="none" stroke={LIGHTNING_COLOR} strokeWidth="12" style={{ filter: 'url(#glow)' }} />
                    </g>
                )}

                {/* ── OCEAN EQ WAVES (Foreground) ── */}
                {/* Back Wave */}
                <path d={generateOceanWave(1, 1.0, bass * 0.8 + 0.2)} fill={OCEAN_MID} opacity="0.7" style={{ filter: 'blur(5px)' }} />
                {/* Front Wave */}
                <path d={generateOceanWave(3, 0.7, bass + 0.2)} fill={OCEAN_LOW} opacity="0.9" />

            </svg>
        </AbsoluteFill>
    );
};
