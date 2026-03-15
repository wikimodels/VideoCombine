import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

import { usePopupSchedule } from '../shared/usePopupSchedule';

interface VCRPromptProps {
    text: string;
    cycleSeconds?: number;
    offsetSeconds?: number;
    holdSeconds?: number;
    background?: string;   // pill bg — default dark transparent
}

// Constant-speed typewriter — no random delays, no typos
// Increased to 5 frames per char (slower typing for a stronger retro effect)
const TYPE_SPEED_FRAMES = 5;

export const VCRPrompt: React.FC<VCRPromptProps> = ({
    text,
    cycleSeconds = 120,
    offsetSeconds = 0,
    holdSeconds = 5,
    background = 'rgba(0,0,0,0.82)',
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ── Timing ────────────────────────────────────────────────────────────────
    // ── Timing & Parsing ──────────────────────────────────────────────────────
    const holdDurationFrames  = holdSeconds * fps;
    const exitDurationFrames  = Math.round(fps * 0.9);         // ~0.9s flicker out

    // Cursor Blink Settings (Slowed down by ~2x for a calmer retro feel)
    const blinkFramesDelay = 20;        // 20 frames = 2/3 sec per blink state
    const numBlinks = 3;                
    const initialBlinkDuration = blinkFramesDelay * numBlinks * 2; // 120 frames = 4 seconds of pure blinking

    // Split text into prefix and rest
    const rawText = text.trimStart();
    const hasPrefix = rawText.startsWith('>');
    const prefix = hasPrefix ? '>' : '';
    let textToType = hasPrefix ? rawText.substring(1).trimStart() : rawText;
    
    // Auto-remove trailing underscore from textToType (we render a real cursor instead)
    if (textToType.endsWith('_')) {
        textToType = textToType.slice(0, -1);
    }

    const typeDurationFrames = textToType.length * TYPE_SPEED_FRAMES;
    
    // Re-calculate the full duration now that we know prefix/blinks length
    const totalAnimFrames         = initialBlinkDuration + typeDurationFrames + holdDurationFrames + exitDurationFrames;
    const totalAnimationSeconds   = totalAnimFrames / fps;

    const schedule = usePopupSchedule({
        cycleSeconds,
        animationDurationSeconds: totalAnimationSeconds,
        offsetSeconds,
        safeZoneStartSeconds: 5,
        safeZoneEndSeconds: 8,
    });

    const activeStartFrame = schedule.find(s => frame >= s && frame < s + totalAnimFrames);
    if (activeStartFrame === undefined) return null;

    const localFrame = frame - activeStartFrame;
    
    // ── Phases ────────────────────────────────────────────────────────────────
    const isBlinkingPhase = localFrame < initialBlinkDuration;
    const typeLocalFrame = localFrame - initialBlinkDuration;
    const isTypingPhase = typeLocalFrame >= 0 && typeLocalFrame < typeDurationFrames;
    const isHoldingPhase = typeLocalFrame >= typeDurationFrames && typeLocalFrame < typeDurationFrames + holdDurationFrames;
    const isExitingPhase = typeLocalFrame >= typeDurationFrames + holdDurationFrames;

    let visibleChars = 0;
    if (isTypingPhase) {
        visibleChars = Math.floor(typeLocalFrame / TYPE_SPEED_FRAMES);
    } else if (isHoldingPhase || isExitingPhase) {
        visibleChars = textToType.length;
    }
    const typedSubstring = textToType.substring(0, visibleChars);

    // ── Exit flicker ──────────────────────────────────────────────────────────
    let opacity = 1;
    if (isExitingPhase) {
        const exitLocal = typeLocalFrame - typeDurationFrames - holdDurationFrames;
        const flicker = [1, 0, 1, 1, 0.5, 0, 1, 0.3, 0, 0.8, 0, 1, 0.2, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0];
        opacity = flicker[Math.min(Math.floor(exitLocal), flicker.length - 1)] ?? 0;
    }

    // ── Cursor + glow ─────────────────────────────────────────────────────────
    // Blink rate while typing and holding (also slowed down by ~2x)
    const blinkRate   = isTypingPhase ? 16 : 20;
    const showCursor  = Math.floor(localFrame / blinkRate) % 2 === 0;
    const glowStr = isTypingPhase ? '1.0' : '0.6';

    const showCursorElement = (isBlinkingPhase || isTypingPhase || isHoldingPhase) && showCursor;

    const cursorEl = showCursorElement ? (
        <span style={{
            display: 'inline-block',
            width: '3px', /* Thin vertical line */
            height: '0.8em', /* Match height to > */
            backgroundColor: 'currentColor', 
            verticalAlign: 'middle', 
            transform: 'translateY(-2px)', /* Fine-tune optical alignment with > */
            marginLeft: '6px', /* Gap between the last typed letter and the cursor */
            boxShadow: '0 0 6px rgba(100,200,255,0.9)', 
        }} />
    ) : null;

    // Controls the space between the ">" and the text/cursor 
    // This is explicitly adjustable without breaking the rest of typing 
    const prefixGap = '14px';

    return (
        <AbsoluteFill style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            padding: '80px 50px',
            pointerEvents: 'none',
            zIndex: 5001,
        }}>
            <div style={{
                marginLeft: 'auto',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '37px',
                fontWeight: 'bold',
                color: isExitingPhase ? `rgba(180,230,255,${opacity})` : 'rgba(210,240,255,1)',
                textTransform: 'uppercase',
                whiteSpace: 'pre',
                letterSpacing: '0.5px',
                textShadow: `
                    0 0 4px rgba(255,255,255,${glowStr}),
                    0 0 14px rgba(100,200,255,0.7),
                    0 0 28px rgba(100,200,255,0.45),
                    1.5px 0 2px rgba(255,0,0,0.65),
                    -1.5px 0 2px rgba(0,0,255,0.65)
                `,
                background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%)',
                backgroundSize: '100% 4px',
                padding: '13px 20px',
                backgroundColor: background,
                borderRadius: '4px',
                borderLeft: '2px solid rgba(100,200,255,0.3)',
                pointerEvents: 'none',
                position: 'relative',
                width: 'max-content',
            }}>
                {/* 1. HIDDEN TEXT: Establishes the EXACT final size of the pill from frame 0 */}
                <div style={{ visibility: 'hidden', display: 'flex', alignItems: 'center' }}>
                    {prefix && <span style={{ marginRight: prefixGap }}>{prefix}</span>}
                    <span>{textToType}<span style={{ display: 'inline-block', width: '3px', marginLeft: '6px' }}/></span>
                </div>

                {/* 2. ABSOLUTE TEXT: Renders text exactly on top of the hidden layer layout, preventing shifting */}
                <div style={{ position: 'absolute', top: '13px', left: '20px', display: 'flex', alignItems: 'center' }}>
                    {prefix && <span style={{ marginRight: prefixGap }}>{prefix}</span>}
                    <span>{typedSubstring}{cursorEl}</span>
                </div>
            </div>
        </AbsoluteFill>
    );
};
