import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const NUM_RUNGS = 22;
const HELIX_TURNS = 3.5;
const BASE_COLORS: [string, string][] = [
    ['#ff4488', '#44ffaa'],
    ['#4488ff', '#ffaa44'],
    ['#aa44ff', '#ffff44'],
    ['#44ffff', '#ff6644'],
];

const buildPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const cpx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
        const cpy = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
        d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${cpx} ${cpy}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
};

export const DNAHelix: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000a15' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const high = (viz[18] + viz[19]) / 2;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const cx = width / 2;
    const helixAmp = 200 + bass * 130;
    const rotSpeed = 0.7 + high * 1.8;
    const phase = frame * rotSpeed;

    const rungSpacing = height / (NUM_RUNGS + 1);

    const rungs = Array.from({ length: NUM_RUNGS }, (_, i) => {
        const y = (i + 1) * rungSpacing;
        const t = i / NUM_RUNGS;
        const rungPhase = (t * HELIX_TURNS * 360 + phase) % 360;
        const rad = (rungPhase * Math.PI) / 180;
        const x1 = cx + Math.sin(rad) * helixAmp;
        const x2 = cx + Math.sin(rad + Math.PI) * helixAmp;
        const depth = Math.sin(rad);
        const opacity = 0.35 + ((depth + 1) / 2) * 0.65;
        const sw = 2 + ((depth + 1) / 2) * 5;
        const freqIdx = Math.floor(t * 22);
        const amp = (viz[freqIdx] ?? 0) * 3;
        return { y, x1, x2, depth, opacity, sw, colorPair: BASE_COLORS[i % 4], amp };
    });

    const sorted = [...rungs].sort((a, b) => a.depth - b.depth);
    const strand1 = rungs.map(r => ({ x: r.x1, y: r.y }));
    const strand2 = rungs.map(r => ({ x: r.x2, y: r.y }));

    return (
        <AbsoluteFill style={{ backgroundColor: '#000a15', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at center, rgba(0,80,255,${0.15 + volume * 0.2}) 0%, transparent 65%)`,
            }} />

            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                <defs>
                    <filter id="dnaGlow">
                        <feGaussianBlur stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Glowing strand backgrounds */}
                <path d={buildPath(strand1)} fill="none"
                    stroke={`rgba(0,150,255,${0.35 + volume * 0.3})`}
                    strokeWidth={10 + volume * 8} filter="url(#dnaGlow)" strokeLinecap="round" />
                <path d={buildPath(strand2)} fill="none"
                    stroke={`rgba(255,50,150,${0.35 + volume * 0.3})`}
                    strokeWidth={10 + volume * 8} filter="url(#dnaGlow)" strokeLinecap="round" />

                {/* Sharp strand lines */}
                <path d={buildPath(strand1)} fill="none" stroke="#0099ff" strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
                <path d={buildPath(strand2)} fill="none" stroke="#ff3399" strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />

                {/* Rungs sorted by depth */}
                {sorted.map((r, i) => (
                    <g key={i}>
                        <line x1={r.x1} y1={r.y} x2={r.x2} y2={r.y}
                            stroke={`rgba(180,180,255,${r.opacity * 0.6})`} strokeWidth={r.sw * 0.4} />
                        <circle cx={r.x1} cy={r.y} r={7 + r.amp * 18} fill={r.colorPair[0]} opacity={r.opacity}
                            style={{ filter: `drop-shadow(0 0 ${4 + r.amp * 12}px ${r.colorPair[0]})` }} />
                        <circle cx={r.x2} cy={r.y} r={7 + r.amp * 18} fill={r.colorPair[1]} opacity={r.opacity}
                            style={{ filter: `drop-shadow(0 0 ${4 + r.amp * 12}px ${r.colorPair[1]})` }} />
                    </g>
                ))}
            </svg>

            {/* ── SIDE EQ BARS — symmetric mirror, same frequencies both sides ── */}
            {(() => {
                const EQ_BARS = 26;
                const EQ_SENS = 5.4;
                const EQ_MAX_W = 72;
                const EQ_BAR_H = Math.floor((height - 120) / EQ_BARS) - 3;
                const amps = Array.from({ length: EQ_BARS }, (_, i) =>
                    Math.min((viz[i] ?? 0) * EQ_SENS, 1)
                ).reverse(); // low freq at bottom, high freq at top
                return (
                    <>
                        {/* LEFT — bars grow rightward (flush left) */}
                        <div style={{
                            position: 'absolute', top: 0, left: 8, bottom: 0, width: EQ_MAX_W + 4,
                            display: 'flex', flexDirection: 'column', gap: 3,
                            justifyContent: 'center', alignItems: 'flex-start',
                        }}>
                            {amps.map((amp, i) => {
                                const hue = 190 + (i / EQ_BARS) * 90; // blue → cyan → green
                                const w = Math.max(5, amp * EQ_MAX_W);
                                return (
                                    <div key={i} style={{
                                        height: EQ_BAR_H, width: w,
                                        background: `hsl(${hue},100%,58%)`,
                                        borderRadius: '0 5px 5px 0',
                                        boxShadow: `0 0 ${amp * 20}px hsl(${hue},100%,60%)`,
                                    }} />
                                );
                            })}
                        </div>

                        {/* RIGHT — bars grow leftward (flush right), mirror of left */}
                        <div style={{
                            position: 'absolute', top: 0, right: 8, bottom: 0, width: EQ_MAX_W + 4,
                            display: 'flex', flexDirection: 'column', gap: 3,
                            justifyContent: 'center', alignItems: 'flex-end',
                        }}>
                            {amps.map((amp, i) => {
                                const hue = 300 + (i / EQ_BARS) * 70; // pink → magenta → orange
                                const w = Math.max(5, amp * EQ_MAX_W);
                                return (
                                    <div key={i} style={{
                                        height: EQ_BAR_H, width: w,
                                        background: `hsl(${hue},100%,58%)`,
                                        borderRadius: '5px 0 0 5px',
                                        boxShadow: `0 0 ${amp * 20}px hsl(${hue},100%,60%)`,
                                    }} />
                                );
                            })}
                        </div>
                    </>
                );
            })()}

            {isBeat && <AbsoluteFill style={{ background: `rgba(0,100,255,${bass * 0.12})`, pointerEvents: 'none' }} />}
        </AbsoluteFill>
    );
};
