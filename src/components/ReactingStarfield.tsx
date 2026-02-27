import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData } from '@remotion/media-utils';

const STAR_COUNT = 400;

// Deterministic star data
const STAR_DATA = Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: Math.abs(Math.sin(i * 127.1)),
    y: Math.abs(Math.sin(i * 311.7)),
    baseRadius: 0.3 + Math.abs(Math.sin(i * 74.7)) * 1.5,
    phase: Math.abs(Math.sin(i * 529.3)) * Math.PI * 2,
    speed: 0.2 + (i % 7) * 0.1,
    // Slight tint
    r: 200 + Math.round(Math.abs(Math.sin(i * 17.3)) * 55),
    g: 210 + Math.round(Math.abs(Math.sin(i * 23.7)) * 45),
    b: 230 + Math.round(Math.abs(Math.sin(i * 9.1)) * 25),
}));

export const ReactingStarfield: React.FC<{ audioData: ReturnType<typeof useAudioData> | null }> = ({ audioData }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const t = frame / 30;

        // Deep space background
        ctx.fillStyle = '#020510';
        ctx.fillRect(0, 0, width, height);

        for (const s of STAR_DATA) {
            // Base twinkling (purely time-based, varied per star)
            const raw = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
            // Opacity ranges from 0.15 to ~0.95
            let opacity = 0.15 + 0.8 * (raw * raw * raw);
            let radius = s.baseRadius;

            // Randomly let some stars glow a bit larger when they hit max brightness
            if (opacity > 0.8) {
                radius += 0.5;
            }

            ctx.beginPath();
            ctx.arc(s.x * width, s.y * height, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${opacity.toFixed(3)})`;
            ctx.fill();

            // Add a slight glow to very bright stars
            if (opacity > 0.85) {
                ctx.beginPath();
                ctx.arc(s.x * width, s.y * height, radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${(opacity * 0.4).toFixed(3)})`;
                ctx.fill();
            }
        }

        // Clip the area below the desk so no stars peek from underneath
        const FLOOR = Math.round(height * 0.75);
        ctx.fillStyle = '#020510'; // Same as background
        ctx.fillRect(0, FLOOR, width, height - FLOOR);

    }, [frame, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0 }}
        />
    );
};
