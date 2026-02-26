import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const NUM_BARS = 48;
// Boost raw audio signal — higher = more dramatic reaction
const SENSITIVITY = 3.15;

// Compute SVG polygon points
const polyPoints = (
    cx: number,
    cy: number,
    r: number,
    sides: number,
    rotationRad: number,
): string => {
    return Array.from({ length: sides }, (_, i) => {
        const angle = (i / sides) * Math.PI * 2 + rotationRad;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
};

// Layer config: [sides, baseRadius fraction, rotSpeed, color, strokeWidth]
const LAYERS: [number, number, number, string, number][] = [
    [3, 0.62, 0.9, '#ff0088', 3],
    [4, 0.50, -0.7, '#ffaa00', 2.5],
    [6, 0.38, 0.5, '#00ffcc', 2],
    [5, 0.26, -1.1, '#aa00ff', 2],
    [8, 0.14, 1.8, '#00aaff', 1.5],
];

export const NeonGeometric: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });

    // Frequency bands mapped to each layer (boosted by SENSITIVITY)
    const bands = [
        Math.min((viz[0] + viz[1]) / 2 * SENSITIVITY, 1),       // bass → triangle
        Math.min((viz[3] + viz[4]) / 2 * SENSITIVITY, 1),       // low-mid → square
        Math.min((viz[8] + viz[9]) / 2 * SENSITIVITY, 1),       // mid → hexagon
        Math.min((viz[14] + viz[15]) / 2 * SENSITIVITY, 1),     // high-mid → pentagon
        Math.min((viz[22] + viz[23]) / 2 * SENSITIVITY, 1),     // high → octagon
    ];

    const bass = bands[0];
    const volume = Math.min(bass * 1.2, 1); // bands already boosted
    const isBeat = bass > 0.28; // lower threshold = reacts to more beats

    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.5;

    const bars = Array.from({ length: NUM_BARS }, (_, i) => viz[i] ?? 0);
    const maxBarH = Math.round(height * 0.12);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── RADIAL BG GLOW ── */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(ellipse at center,
            rgba(${isBeat ? '120,0,80' : '40,0,80'},${0.35 + volume * 0.4}) 0%,
            rgba(0,0,0,1) 65%
          )`,
                }}
            />

            {/* ── PARTICLE RING (background dots) ── */}
            <svg
                style={{ position: 'absolute', top: 0, left: 0 }}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                {Array.from({ length: 60 }).map((_, i) => {
                    const angle = (i / 60) * Math.PI * 2 + frame * 0.004;
                    const dist = maxR * 0.78 + Math.sin(frame * 0.05 + i * 0.4) * 50 + bass * 180;
                    const px = cx + Math.cos(angle) * dist;
                    const py = cy + Math.sin(angle) * dist;
                    const pSize = 2 + bands[i % 5] * 14;
                    const hue = (i * 6 + frame * 0.5) % 360;
                    return (
                        <circle
                            key={i}
                            cx={px}
                            cy={py}
                            r={pSize}
                            fill={`hsl(${hue}, 100%, 65%)`}
                            opacity={0.5 + bands[i % 5] * 0.5}
                            filter={`url(#glow${i % 3})`}
                        />
                    );
                })}

                {/* Glow filter defs */}
                <defs>
                    <filter id="glow0"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="glow1"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
            </svg>

            {/* ── POLYGON LAYERS ── */}
            <svg
                style={{ position: 'absolute', top: 0, left: 0 }}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                <defs>
                    {LAYERS.map(([, , , color], li) => (
                        <filter key={li} id={`polyGlow${li}`}>
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    ))}
                </defs>

                {LAYERS.map(([sides, radiusFrac, rotSpeed, color, sw], li) => {
                    const amp = bands[li];
                    const radius = maxR * radiusFrac * (1 + amp * 1.8 + (isBeat ? 0.28 : 0));
                    const rotation = (frame * rotSpeed * (Math.PI / 180));
                    const points = polyPoints(cx, cy, radius, sides, rotation);
                    const glowIntensity = 0.5 + amp * 0.5;

                    return (
                        <g key={li}>
                            {/* Glow duplicate (blurred) */}
                            <polygon
                                points={points}
                                fill="none"
                                stroke={color}
                                strokeWidth={sw * 6}
                                opacity={amp * 0.4}
                                filter={`url(#polyGlow${li})`}
                            />
                            {/* Main sharp line */}
                            <polygon
                                points={points}
                                fill="none"
                                stroke={color}
                                strokeWidth={sw}
                                opacity={0.7 + glowIntensity * 0.3}
                                strokeLinejoin="round"
                            />
                            {/* Corner dots */}
                            {Array.from({ length: sides }).map((_, vi) => {
                                const angle = (vi / sides) * Math.PI * 2 + rotation;
                                const vx = cx + radius * Math.cos(angle);
                                const vy = cy + radius * Math.sin(angle);
                                return (
                                    <circle
                                        key={vi}
                                        cx={vx} cy={vy}
                                        r={2 + amp * 22}
                                        fill={color}
                                        opacity={0.8 + amp * 0.2}
                                    />
                                );
                            })}
                        </g>
                    );
                })}

                {/* ── CENTER CROSS ── */}
                <line
                    x1={cx - 20 - volume * 40} y1={cy}
                    x2={cx + 20 + volume * 40} y2={cy}
                    stroke="white" strokeWidth={1 + volume * 3} opacity={0.6 + volume * 0.4}
                />
                <line
                    x1={cx} y1={cy - 20 - volume * 40}
                    x2={cx} y2={cy + 20 + volume * 40}
                    stroke="white" strokeWidth={1 + volume * 3} opacity={0.6 + volume * 0.4}
                />
                <circle cx={cx} cy={cy} r={4 + volume * 20} fill="white" opacity={0.5 + volume * 0.5} />
            </svg>

            {/* ── SYMMETRIC WAVEFORM BARS ── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 40,
                    left: 30, right: 30,
                    height: maxBarH,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: 3,
                }}
            >
                {bars.map((amp, i) => {
                    const hue = (i / NUM_BARS) * 300 + volume * 60;
                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: Math.max(3, amp * maxBarH * 1.8),
                                borderRadius: '3px 3px 0 0',
                                background: `hsl(${hue}deg, 100%, 60%)`,
                                boxShadow: `0 0 ${amp * 22}px hsl(${hue}deg, 100%, 55%)`,
                            }}
                        />
                    );
                })}
            </div>

            {/* ── BEAT VIGNETTE FLASH ── */}
            {isBeat && (
                <AbsoluteFill
                    style={{
                        boxShadow: `inset 0 0 ${120 + bass * 200}px rgba(255,0,150,${bass * 0.5})`,
                        pointerEvents: 'none',
                    }}
                />
            )}
        </AbsoluteFill>
    );
};
