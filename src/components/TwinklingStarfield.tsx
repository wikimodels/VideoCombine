import React, { useRef, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

const STAR_COUNT = 320;
const STAR_DATA = Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: Math.abs(Math.sin(i * 127.1)),
    y: Math.abs(Math.sin(i * 311.7)),
    radius: 0.4 + Math.abs(Math.sin(i * 74.7)) * 1.9,
    phase: Math.abs(Math.sin(i * 529.3)) * Math.PI * 2,
    speed: 0.5 + (i % 7) * 0.22,
    r: 200 + Math.round(Math.abs(Math.sin(i * 17.3)) * 55),
    g: 210 + Math.round(Math.abs(Math.sin(i * 23.7)) * 45),
    b: 230 + Math.round(Math.abs(Math.sin(i * 9.1)) * 25),
}));

/**
 * 2-D canvas twinkling starfield with deep-space gradient background.
 * Drop it as the first layer inside an AbsoluteFill.
 */
export const TwinklingStarfield: React.FC = () => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const t = frame / 30;

        const grad = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7,
        );
        grad.addColorStop(0, '#090920');
        grad.addColorStop(1, '#020210');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        for (const s of STAR_DATA) {
            const raw = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
            const opacity = 0.25 + 0.75 * (raw * raw);
            ctx.beginPath();
            ctx.arc(s.x * width, s.y * height * 0.75, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${opacity.toFixed(3)})`;
            ctx.fill();
        }
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
