import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const BURST_INTERVAL_SEC = 0.22;
const BULLET_SPEED = 5.5;
const MAX_BULLET_AGE_SEC = 3.5;

export const BeatBulletHell: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const mid = (viz[6] + viz[7] + viz[8]) / 3;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const cx = width / 2;
    const cy = height / 2;

    // Ship auto-dodges at the bottom
    const shipX = cx + Math.sin(frame * 0.04 + mid * 2) * width * 0.32;
    const shipY = height * 0.87;

    // Generate deterministic bullet bursts
    const BURST_INTERVAL = Math.round(fps * BURST_INTERVAL_SEC);
    const MAX_AGE = Math.round(fps * MAX_BULLET_AGE_SEC);

    const bullets: { x: number; y: number; color: string; size: number; opacity: number }[] = [];

    for (let burstStart = 0; burstStart < frame; burstStart += BURST_INTERVAL) {
        const age = frame - burstStart;
        if (age > MAX_AGE) continue;

        const burstIdx = Math.floor(burstStart / BURST_INTERVAL);
        const dist = age * BULLET_SPEED * (1 + (burstIdx % 3) * 0.12);
        const opacity = Math.max(0, 1 - age / MAX_AGE);
        const numBullets = [8, 12, 16, 10, 14, 6][burstIdx % 6];
        const baseAngle = (burstIdx * 137.5) % 360; // golden angle = no overlap
        const size = 5 + (burstIdx % 3) * 3;

        for (let b = 0; b < numBullets; b++) {
            const angle = (baseAngle + (b / numBullets) * 360) * Math.PI / 180;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
            const hue = (burstIdx * 37 + b * 12) % 360;
            bullets.push({ x, y, color: `hsl(${hue},100%,65%)`, size, opacity });
        }
    }

    // Ring visualizer around center
    const ringBars = Array.from({ length: 48 }, (_, i) => viz[i % 32] ?? 0);

    return (
        <AbsoluteFill style={{ backgroundColor: '#020010', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* BG RADIAL GLOW */}
            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at ${cx}px ${cy}px,
          rgba(100,0,200,${volume * 0.4}) 0%, transparent 60%)`,
            }} />

            {/* RING VISUALIZER */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {ringBars.map((amp, i) => {
                    const angle = (i / ringBars.length) * Math.PI * 2;
                    const innerR = 90;
                    const outerR = 90 + amp * 170;
                    const hue = (i / ringBars.length) * 360 + frame * 0.5;
                    return (
                        <line key={i}
                            x1={cx + Math.cos(angle) * innerR} y1={cy + Math.sin(angle) * innerR}
                            x2={cx + Math.cos(angle) * outerR} y2={cy + Math.sin(angle) * outerR}
                            stroke={`hsl(${hue},100%,60%)`}
                            strokeWidth={3 + amp * 4}
                            opacity={0.7 + amp * 0.3}
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>

            {/* BULLETS */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {bullets.map((b, i) => (
                    <circle key={i}
                        cx={b.x} cy={b.y} r={b.size}
                        fill={b.color} opacity={b.opacity}
                        style={{ filter: `drop-shadow(0 0 ${b.size}px ${b.color})` }}
                    />
                ))}
            </svg>

            {/* LASER BEAM from ship on beat */}
            {isBeat && (
                <div style={{
                    position: 'absolute',
                    left: shipX - 3, top: 0,
                    width: 6, height: shipY,
                    background: `linear-gradient(to bottom, transparent 0%, rgba(0,255,200,${bass}) 60%)`,
                    boxShadow: '0 0 20px rgba(0,255,200,0.8)',
                    borderRadius: 3,
                }} />
            )}

            {/* SHIP */}
            <div style={{ position: 'absolute', left: shipX - 25, top: shipY - 40 }}>
                <svg width={50} height={70} viewBox="0 0 50 70">
                    <polygon
                        points="25,0 48,65 36,52 25,58 14,52 2,65"
                        fill={`rgba(0,200,255,${0.8 + volume * 0.2})`}
                        style={{ filter: `drop-shadow(0 0 ${5 + volume * 15}px cyan)` }}
                    />
                    <ellipse cx={25} cy={60} rx={8 + volume * 6} ry={4 + volume * 3}
                        fill={`rgba(255,150,0,${0.7 + volume * 0.3})`}
                        style={{ filter: 'blur(3px)' }}
                    />
                </svg>
            </div>

            {/* BEAT SCREEN FLASH */}
            {isBeat && (
                <AbsoluteFill style={{
                    background: `rgba(0,255,200,${bass * 0.08})`,
                    pointerEvents: 'none',
                }} />
            )}

            {/* SCANLINES */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 4px)',
                pointerEvents: 'none', opacity: 0.5,
            }} />
        </AbsoluteFill>
    );
};
