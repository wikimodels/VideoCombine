import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

interface VCRPromptProps {
    text: string;
    cycleSeconds: number;
    offsetSeconds: number;
    holdSeconds: number;
}

export const VCRPrompt: React.FC<VCRPromptProps> = ({
    text,
    cycleSeconds = 40,
    offsetSeconds,
    holdSeconds
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Text parsing
    // If user forgot to add an underscore cursor, let's artificially manage it, or just use their text directly.
    // Assuming the text itself contains whatever it needs (e.g., "> FOLLOW US ON SPOTIFY_")

    const initialBlinkFrames = 1 * fps; // 1 second of just the blinking cursor
    const typeSpeedFrames = 4; // Every 4 frames (slower), a new character appears.
    const typeDurationFrames = text.length * typeSpeedFrames;
    const holdDurationFrames = holdSeconds * fps;

    // The flicker out animation takes ~1 second (30 frames)
    const exitDurationFrames = 1 * fps;

    // Guaranteed loop duration based on user master config
    const cycleFrames = Math.max(cycleSeconds * fps, initialBlinkFrames + typeDurationFrames + holdDurationFrames + exitDurationFrames);

    // Apply offset so it doesn't collide with the Spotify promo
    const offsetFrames = offsetSeconds * fps;
    const currentModuloFrame = (frame - offsetFrames + cycleFrames * 1000) % cycleFrames; // +cycleFrames*1000 to handle negative modulo

    // Check if we are in the active phase of the cycle
    const isActive = currentModuloFrame >= 0 && currentModuloFrame < (initialBlinkFrames + typeDurationFrames + holdDurationFrames + exitDurationFrames);

    if (!isActive) return null;

    // --- Phase calculations ---

    // 0. Initial Blink Phase
    const isInitialBlink = currentModuloFrame < initialBlinkFrames;

    // 1. Typing Phase
    const typingPhase = currentModuloFrame >= initialBlinkFrames && currentModuloFrame < (initialBlinkFrames + typeDurationFrames);
    const visibleChars = isInitialBlink ? 0 : typingPhase
        ? Math.floor((currentModuloFrame - initialBlinkFrames) / typeSpeedFrames)
        : text.length;

    const displayedText = text.substring(0, visibleChars);

    // 2. Hold Phase
    const isHolding = currentModuloFrame >= (initialBlinkFrames + typeDurationFrames) && currentModuloFrame < (initialBlinkFrames + typeDurationFrames + holdDurationFrames);

    // 3. Exit Phase (Flicker/Loss of Signal)
    const isExiting = currentModuloFrame >= (initialBlinkFrames + typeDurationFrames + holdDurationFrames);
    const exitLocalFrame = isExiting ? currentModuloFrame - (initialBlinkFrames + typeDurationFrames + holdDurationFrames) : 0;

    // Flicker logic (random opacity drops during the 30 exit frames)
    let opacity = 1;
    if (isExiting) {
        // Fast hardcoded flicker map for the 30 frames
        const flickerPattern = [1, 0, 1, 1, 0.5, 0, 1, 0, 0, 0.8, 0, 1, 0.2, 0, 0, 0.5, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
        const idx = Math.min(Math.floor(exitLocalFrame), flickerPattern.length - 1);
        opacity = flickerPattern[idx] ?? 0;
    }

    // Cursor blink: blink every 15 frames
    const showCursor = Math.floor(currentModuloFrame / 15) % 2 === 0;

    // To prevent the text shifting, we can just use the final text length for measurement,
    // but the `white-space: pre` keeps it stable anyway.

    return (
        <AbsoluteFill style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-end', // Top Right corner
            padding: '80px 50px', // Extra top padding so it sits just under exactly where the widget is, or same place
            pointerEvents: 'none',
            zIndex: 5001 // Slightly above or below promo
        }}>
            <div style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '41px', // 34 * 1.2
                fontWeight: 'bold',
                color: '#ffffff',
                textTransform: 'uppercase',
                whiteSpace: 'pre',
                opacity: opacity,
                // VHS + Neon styling
                textShadow: `
                    0 0 5px rgba(255, 255, 255, 0.9),      /* Base glow */
                    0 0 15px rgba(100, 200, 255, 0.7),     /* Middle neon glow */
                    0 0 30px rgba(100, 200, 255, 0.5),     /* Outer neon spread */
                    2px 0 2px rgba(255, 0, 0, 0.7),        /* Chromatic red */
                    -2px 0 2px rgba(0, 0, 255, 0.7)        /* Chromatic blue */
                `,
                // Mild scanline overlay specific to the text box
                background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%)',
                backgroundSize: '100% 4px',
                padding: '14px 22px', // 12 * 1.2, 18 * 1.2
                backgroundColor: 'rgba(0,0,0,0.4)', // Slightly dark background block like a VCR OSD
                borderRadius: '4px'
            }}>
                {/* Replace actual underscores with the block if we want it to blink, or just let string building handle it */}
                {displayedText}
                {(!text.endsWith('_') || isInitialBlink || typingPhase || isHolding) ? (showCursor ? '_' : ' ') : ''}
            </div>
        </AbsoluteFill>
    );
};
