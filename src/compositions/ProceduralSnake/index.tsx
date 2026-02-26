import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const CELL = 55;           // grid cell size px
const SEGMENT_FRAMES = 14; // new segment every 14 frames (~2 beats at 120bpm)
const MAX_SEGMENTS = 220;

// Deterministic direction schedule: pattern of directions for each segment
const DIR_SCHEDULE: number[] = (() => {
    const dirs: number[] = [];
    const pattern = [0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 1, 1, 0, 3, 0, 0, 2, 2, 0, 1];
    for (let i = 0; i < MAX_SEGMENTS; i++) {
        dirs.push(pattern[i % pattern.length]);
    }
    return dirs;
})();

// 0=right 1=down 2=left 3=up
const MOVES = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export const ProceduralSnake: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#001a00' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const COLS = Math.floor(width / CELL);
    const ROWS = Math.floor(height / CELL);

    // Grow snake up to current segment count
    const numSegments = Math.min(Math.floor(frame / SEGMENT_FRAMES) + 1, MAX_SEGMENTS);

    // Build snake path (deterministic)
    let cx = Math.floor(COLS / 2);
    let cy = Math.floor(ROWS / 2);
    let dir = 0;
    const segments: { gx: number; gy: number; seg: number }[] = [{ gx: cx, gy: cy, seg: 0 }];

    for (let seg = 1; seg < numSegments; seg++) {
        dir = DIR_SCHEDULE[seg % DIR_SCHEDULE.length];
        cx = ((cx + MOVES[dir][0]) % COLS + COLS) % COLS;
        cy = ((cy + MOVES[dir][1]) % ROWS + ROWS) % ROWS;
        segments.push({ gx: cx, gy: cy, seg });
    }

    const head = segments[segments.length - 1];

    // Partial segment (growing animation)
    const partialProgress = (frame % SEGMENT_FRAMES) / SEGMENT_FRAMES;

    // Audio visualizer bars across the top
    const topBars = Array.from({ length: 32 }, (_, i) => viz[i] ?? 0);

    return (
        <AbsoluteFill style={{ backgroundColor: '#001a00', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* GRID DOTS */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {Array.from({ length: COLS }).map((_, col) =>
                    Array.from({ length: ROWS }).map((_, row) => (
                        <circle key={`${col}-${row}`}
                            cx={col * CELL + CELL / 2} cy={row * CELL + CELL / 2}
                            r={1.5}
                            fill="rgba(0,255,80,0.12)"
                        />
                    ))
                )}
            </svg>

            {/* SNAKE BODY SEGMENTS */}
            {segments.slice(0, -1).map(({ gx, gy, seg }) => {
                const age = numSegments - seg;
                const hue = (seg * 8 + frame * 0.3) % 360; // rainbow along body
                const amp = (viz[seg % 32] ?? 0) * 3;
                const size = CELL * 0.72 + amp * CELL * 0.2;
                const opacity = Math.max(0.3, 1 - age / MAX_SEGMENTS * 0.7);
                return (
                    <div key={seg} style={{
                        position: 'absolute',
                        left: gx * CELL + (CELL - size) / 2,
                        top: gy * CELL + (CELL - size) / 2,
                        width: size, height: size,
                        borderRadius: 8,
                        background: `hsl(${hue},100%,50%)`,
                        opacity,
                        boxShadow: `0 0 ${amp * 20 + 6}px hsl(${hue},100%,55%)`,
                    }} />
                );
            })}

            {/* SNAKE HEAD (animated growth) */}
            {(() => {
                const headHue = (head.seg * 8 + frame * 0.3) % 360;
                const headSize = CELL * 0.72 * partialProgress + (CELL * 0.72) * (1 - partialProgress) * 0.4;
                const amp = (viz[head.seg % 32] ?? 0) * 3;
                return (
                    <div style={{
                        position: 'absolute',
                        left: head.gx * CELL + (CELL - headSize) / 2,
                        top: head.gy * CELL + (CELL - headSize) / 2,
                        width: headSize, height: headSize,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: `0 0 ${20 + amp * 30 + volume * 40}px #fff, 0 0 ${10 + volume * 20}px hsl(${headHue},100%,70%)`,
                    }} />
                );
            })()}

            {/* BEAT PULSE: entire snake flashes */}
            {isBeat && (
                <AbsoluteFill style={{
                    background: `rgba(0,255,80,${bass * 0.1})`, pointerEvents: 'none',
                }} />
            )}

            {/* TOP WAVEFORM BARS */}
            <div style={{
                position: 'absolute', top: 10, left: 20, right: 20,
                height: Math.round(height * 0.06), display: 'flex', alignItems: 'flex-start', gap: 4,
            }}>
                {topBars.map((amp, i) => {
                    const h = Math.max(3, amp * 3 * height * 0.06);
                    const hue = (i / 32) * 120 + 100;
                    return (
                        <div key={i} style={{
                            flex: 1, height: h,
                            background: `hsl(${hue},100%,55%)`,
                            borderRadius: '0 0 3px 3px',
                            boxShadow: `0 0 ${amp * 20}px hsl(${hue},100%,55%)`,
                        }} />
                    );
                })}
            </div>

            {/* SEGMENT COUNT LABEL */}
            <div style={{
                position: 'absolute', bottom: 20, right: 30,
                color: 'rgba(0,255,80,0.5)', fontFamily: 'monospace', fontSize: 22,
            }}>
                LEN {numSegments}
            </div>
        </AbsoluteFill>
    );
};
