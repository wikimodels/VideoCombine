import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

interface VCRPromptProps {
    text: string;
    cycleSeconds: number;
    offsetSeconds: number;
    holdSeconds: number;
    standalone?: boolean;
}

export const VCRPrompt: React.FC<VCRPromptProps> = ({
    text,
    cycleSeconds = 40,
    offsetSeconds,
    holdSeconds,
    standalone = false
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const initialBlinkFrames = 1 * fps;
    const typeSpeedFrames = 4;
    const typeDurationFrames = text.length * typeSpeedFrames;
    const holdDurationFrames = holdSeconds * fps;
    const exitDurationFrames = 1 * fps;

    const cycleFrames = Math.max(cycleSeconds * fps, initialBlinkFrames + typeDurationFrames + holdDurationFrames + exitDurationFrames);
    const offsetFrames = offsetSeconds * fps;
    const currentModuloFrame = (frame - offsetFrames + cycleFrames * 1000) % cycleFrames;

    const isActive = currentModuloFrame >= 0 && currentModuloFrame < (initialBlinkFrames + typeDurationFrames + holdDurationFrames + exitDurationFrames);

    if (!isActive) return null;

    const isInitialBlink = currentModuloFrame < initialBlinkFrames;
    const typingPhase = currentModuloFrame >= initialBlinkFrames && currentModuloFrame < (initialBlinkFrames + typeDurationFrames);
    const visibleChars = isInitialBlink ? 0 : typingPhase
        ? Math.floor((currentModuloFrame - initialBlinkFrames) / typeSpeedFrames)
        : text.length;

    const displayedText = text.substring(0, visibleChars);
    const isHolding = currentModuloFrame >= (initialBlinkFrames + typeDurationFrames) && currentModuloFrame < (initialBlinkFrames + typeDurationFrames + holdDurationFrames);
    const isExiting = currentModuloFrame >= (initialBlinkFrames + typeDurationFrames + holdDurationFrames);
    const exitLocalFrame = isExiting ? currentModuloFrame - (initialBlinkFrames + typeDurationFrames + holdDurationFrames) : 0;

    let opacity = 1;
    if (isExiting) {
        const flickerPattern = [1, 0, 1, 1, 0.5, 0, 1, 0, 0, 0.8, 0, 1, 0.2, 0, 0, 0.5, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
        const idx = Math.min(Math.floor(exitLocalFrame), flickerPattern.length - 1);
        opacity = flickerPattern[idx] ?? 0;
    }

    const showCursor = Math.floor(currentModuloFrame / 15) % 2 === 0;

    const inner = (
        <div style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '41px',
            fontWeight: 'bold',
            color: '#ffffff',
            textTransform: 'uppercase',
            whiteSpace: 'pre',
            opacity: opacity,
            textShadow: `
                0 0 5px rgba(255, 255, 255, 0.9),
                0 0 15px rgba(100, 200, 255, 0.7),
                0 0 30px rgba(100, 200, 255, 0.5),
                2px 0 2px rgba(255, 0, 0, 0.7),
                -2px 0 2px rgba(0, 0, 255, 0.7)
            `,
            background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%)',
            backgroundSize: '100% 4px',
            padding: '14px 22px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '4px'
        }}>
            {displayedText}
            {(!text.endsWith('_') || isInitialBlink || typingPhase || isHolding) ? (showCursor ? '_' : ' ') : ''}
        </div>
    );

    if (standalone) return inner;

    return (
        <AbsoluteFill style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            padding: '80px 50px',
            pointerEvents: 'none',
            zIndex: 5001
        }}>
            {inner}
        </AbsoluteFill>
    );
};

