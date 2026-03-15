import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const WINDOW_SAMPLES = 3072;
const STEP = 4;
const NUM_TRAILS = 5;
const TRAIL_OFFSET = 600;

export const LissajousScope: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000a05' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const { channelWaveforms, sampleRate, numberOfChannels } = audioData;
    const samplesPerFrame = Math.floor(sampleRate / fps);
    const startSample = Math.floor(frame * samplesPerFrame);
    const LEFT = channelWaveforms[0];
    const RIGHT = numberOfChannels > 1 ? channelWaveforms[1] : channelWaveforms[0];

    // For mono: use time-delay to create Lissajous-like patterns
    const MONO_DELAY = Math.floor(sampleRate / 250);

    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(cx, cy) * 0.82;

    const buildPath = (sampleOffset: number): string => {
        const parts: string[] = [];
        for (let i = 0; i < WINDOW_SAMPLES; i += STEP) {
            const si = startSample - sampleOffset + i;
            if (si < 0 || si >= LEFT.length) continue;
            const xS = numberOfChannels > 1 ? LEFT[si] : LEFT[si];
            const yS = numberOfChannels > 1 ? RIGHT[si] : LEFT[Math.max(0, si - MONO_DELAY)];
            const x = (cx + xS * scale).toFixed(1);
            const y = (cy + yS * scale).toFixed(1);
            parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`);
        }
        return parts.join(' ');
    };

    const trails = Array.from({ length: NUM_TRAILS }, (_, t) => ({
        path: buildPath(t * TRAIL_OFFSET),
        opacity: (1 - t / NUM_TRAILS) * 0.85,
        hue: (frame * 0.6 + t * 40) % 360,
        sw: Math.max(0.5, 2.5 - t * 0.4),
    }));

    return (
        <AbsoluteFill style={{ backgroundColor: '#000a05', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* CRT MONITOR BEZEL */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: width * 0.94, height: width * 0.94,
                borderRadius: 50,
                background: '#001208',
                boxShadow: `
          0 0 0 5px #1a4a2a,
          0 0 0 15px #0d2618,
          0 0 60px rgba(0,255,100,0.15),
          inset 0 0 80px rgba(0,0,0,0.9)
        `,
                overflow: 'hidden',
            }} />

            {/* LISSAJOUS SVG */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {/* Grid */}
                <line x1={cx} y1={cy - scale} x2={cx} y2={cy + scale} stroke="rgba(0,255,100,0.08)" strokeWidth="1" />
                <line x1={cx - scale} y1={cy} x2={cx + scale} y2={cy} stroke="rgba(0,255,100,0.08)" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={scale} fill="none" stroke="rgba(0,255,100,0.07)" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={scale * 0.5} fill="none" stroke="rgba(0,255,100,0.05)" strokeWidth="1" />

                {/* Trails (oldest first, dimmest) */}
                {[...trails].reverse().map((t, i) => (
                    <path key={i} d={t.path} fill="none"
                        stroke={`hsl(${t.hue},100%,55%)`}
                        strokeWidth={t.sw} opacity={t.opacity}
                    />
                ))}

                {/* Current path — brightest with glow */}
                <path d={trails[0]?.path ?? ''} fill="none"
                    stroke={`hsl(${(frame * 0.6) % 360},100%,70%)`}
                    strokeWidth={2.5} opacity={0.98}
                    style={{ filter: `drop-shadow(0 0 4px hsl(${(frame * 0.6) % 360},100%,70%))` }}
                />
            </svg>

            {/* PHOSPHOR GLOW */}
            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at center,
          rgba(0,255,100,${0.05 + volume * 0.07}) 30%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* SCANLINES */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.14) 3px)',
                pointerEvents: 'none',
            }} />

            {/* LABEL */}
            <div style={{
                position: 'absolute', bottom: height * 0.03,
                left: 0, right: 0, textAlign: 'center',
                color: 'rgba(0,255,100,0.55)', fontFamily: 'monospace',
                fontSize: 26, letterSpacing: 10,
            }}>
                LISSAJOUS · XY MODE
            </div>

            {isBeat && (
                <AbsoluteFill style={{
                    background: `rgba(0,255,100,${bass * 0.07})`, pointerEvents: 'none',
                }} />
            )}
        </AbsoluteFill>
    );
};
