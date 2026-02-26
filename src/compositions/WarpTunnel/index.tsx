import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig, interpolate } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const NUM_RINGS = 16;
const NEON_COLORS = [
    '#ff00ff', // magenta
    '#00ffff', // cyan
    '#ff6600', // orange
    '#aaff00', // lime
    '#ff0066', // hot pink
    '#0088ff', // electric blue
    '#ffffff',  // white
];

export const WarpTunnel: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const mid = (viz[5] + viz[6] + viz[7]) / 3;
    const high = (viz[16] + viz[17]) / 2;
    const volume = Math.min(bass * 2.5, 1);
    const isBeat = bass > 0.48;

    // Cycle duration (faster on bass)
    const baseCycle = fps * 1.4;
    const cycleFrames = baseCycle * (1 - bass * 0.45);

    // Max ring size (diagonal of screen)
    const maxDim = Math.sqrt(width * width + height * height) * 1.1;

    // Background rotation (overall tunnel spin)
    const tunnelRotation = frame * 0.18 + bass * 2;

    return (
        <AbsoluteFill style={{ backgroundColor: '#010008', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── BACKGROUND GLOW ── */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(ellipse at center,
            rgba(80,0,160,${0.2 + volume * 0.3}) 0%,
            rgba(0,0,30,1) 70%
          )`,
                }}
            />

            {/* ── TUNNEL RINGS ── */}
            <div
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    transform: `rotate(${tunnelRotation}deg)`,
                }}
            >
                {Array.from({ length: NUM_RINGS }).map((_, i) => {
                    const phaseOffset = (i / NUM_RINGS) * cycleFrames;
                    const cyclePos = (frame + phaseOffset) % cycleFrames;
                    const progress = cyclePos / cycleFrames; // 0 = born at center, 1 = gone

                    const size = progress * maxDim;
                    // Fade in fast, fade out near edge
                    const opacity = Math.sin(progress * Math.PI) * (0.6 + volume * 0.4);

                    const color = NEON_COLORS[i % NEON_COLORS.length];
                    const isCircle = i % 3 !== 0; // most are circles, some are squares
                    const extraRotation = isCircle ? 0 : 45 + frame * (i % 2 === 0 ? 0.3 : -0.25);
                    const thickness = 1.5 + progress * 5 + bass * 18;

                    // Slight color shift on beats
                    const hueShift = isBeat ? bass * 60 : 0;

                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: size,
                                height: size,
                                border: `${thickness}px solid ${color}`,
                                borderRadius: isCircle ? '50%' : '14px',
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${extraRotation}deg)`,
                                opacity,
                                boxShadow: `
                  0 0 ${thickness * 3}px ${color},
                  0 0 ${thickness * 7}px ${color}88,
                  inset 0 0 ${thickness * 2}px ${color}44
                `,
                                filter: isBeat && i === 0 ? `hue-rotate(${hueShift}deg)` : undefined,
                            }}
                        />
                    );
                })}
            </div>

            {/* ── INNER GLOW (center vortex) ── */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 30 + volume * 120 + mid * 60,
                    height: 30 + volume * 120 + mid * 60,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(255,255,255,${0.5 + volume * 0.5}) 0%, transparent 70%)`,
                    boxShadow: `
            0 0 ${40 + volume * 180}px rgba(180,100,255,0.9),
            0 0 ${80 + volume * 300}px rgba(100,0,255,0.5)
          `,
                    filter: 'blur(4px)',
                }}
            />

            {/* ── HIGH-FREQ SPARKLES ── */}
            {high > 0.3 && Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2 + frame * 0.08;
                const dist = 60 + high * 200;
                const x = width / 2 + Math.cos(angle) * dist;
                const y = height / 2 + Math.sin(angle) * dist;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: x - 8,
                            top: y - 8,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#ffffff',
                            opacity: high * 0.8,
                            boxShadow: `0 0 ${high * 30}px #fff, 0 0 ${high * 60}px rgba(200,150,255,0.8)`,
                        }}
                    />
                );
            })}

            {/* ── BEAT SCREEN FLASH ── */}
            {isBeat && (
                <AbsoluteFill
                    style={{
                        background: `rgba(180, 0, 255, ${bass * 0.18})`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ── SCANLINES ── */}
            <AbsoluteFill
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 4px)',
                    pointerEvents: 'none',
                    opacity: 0.6,
                }}
            />
        </AbsoluteFill>
    );
};
