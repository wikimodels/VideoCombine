import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from 'remotion';

interface VCRPromptProps {
    text: string;
    cycleSeconds: number;
    offsetSeconds: number;
    holdSeconds: number;
}

// Pre-compute typing schedule with variable speed + one deliberate typo
function buildSchedule(text: string) {
    const entries: { char: string; cumFrame: number }[] = [];
    let cum = 0;

    // Typo: inject at ~35% through. Pick a visually different wrong char.
    const typoAt = Math.max(1, Math.floor(text.length * 0.35));
    const typoChar = text[typoAt];
    // Adjacent key on keyboard row — keep it simple: next char or previous
    const wrongChar = typoChar === '>' ? '<'
        : typoChar === '_' ? '-'
        : String.fromCharCode(typoChar.charCodeAt(0) + 1);

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const isSpecial = ch === ' ' || ch === '_' || ch === '>' || ch === '/';

        // Variable delay: random 2–7f normal, 8–18f for spaces/symbols
        const minD = isSpecial ? 8 : 2;
        const maxD = isSpecial ? 20 : 8;
        const delay = minD + Math.floor(random(`vcr-d-${text}-${i}`) * (maxD - minD));
        cum += delay;

        // Inject typo before the target character
        if (i === typoAt) {
            entries.push({ char: wrongChar, cumFrame: cum });
            cum += 7; // hold wrong char for 7 frames
            entries.push({ char: '\b', cumFrame: cum }); // backspace
            cum += 5; // pause after delete
        }

        entries.push({ char: ch, cumFrame: cum });
    }

    return { entries, totalFrames: cum };
}

export const VCRPrompt: React.FC<VCRPromptProps> = ({
    text,
    cycleSeconds = 120,
    offsetSeconds,
    holdSeconds
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Pre-compute the full per-character timing schedule (deterministic via random())
    const schedule = useMemo(() => buildSchedule(text), [text]);

    const initialBlinkFrames = Math.round(fps * 0.8); // 0.8s cursor blink
    const typeDurationFrames = schedule.totalFrames;
    const holdDurationFrames = holdSeconds * fps;
    const exitDurationFrames = Math.round(fps * 0.9);

    const totalActiveDuration = initialBlinkFrames + typeDurationFrames + holdDurationFrames + exitDurationFrames;
    const cycleFrames = Math.max(cycleSeconds * fps, totalActiveDuration);

    const offsetFrames = offsetSeconds * fps;
    const currentModuloFrame = (frame - offsetFrames + cycleFrames * 1000) % cycleFrames;

    const isActive = currentModuloFrame < totalActiveDuration;
    if (!isActive) return null;

    const localFrame = currentModuloFrame;
    const isInitialBlink = localFrame < initialBlinkFrames;
    const isExiting = localFrame >= initialBlinkFrames + typeDurationFrames + holdDurationFrames;

    // ── Build displayed text from schedule ──────────────────────────────────
    let chars: string[] = [];
    let justTypedRecently = false;

    if (!isInitialBlink) {
        const typingOffset = localFrame - initialBlinkFrames;
        for (const entry of schedule.entries) {
            if (entry.cumFrame > typingOffset) break;
            if (entry.char === '\b') {
                chars.pop();
            } else {
                chars.push(entry.char);
            }
        }
        // Check if a char just appeared in the last 4 frames (key-press flash)
        const nearbyEntry = schedule.entries.find(e =>
            e.char !== '\b' &&
            typingOffset - e.cumFrame >= 0 &&
            typingOffset - e.cumFrame < 4
        );
        justTypedRecently = !!nearbyEntry;
    }

    const displayedText = chars.join('');

    // ── Exit flicker ────────────────────────────────────────────────────────
    let opacity = 1;
    if (isExiting) {
        const exitLocal = localFrame - (initialBlinkFrames + typeDurationFrames + holdDurationFrames);
        const flickerPattern = [1, 0, 1, 1, 0.5, 0, 1, 0.3, 0, 0.8, 0, 1, 0.2, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0];
        opacity = flickerPattern[Math.min(Math.floor(exitLocal), flickerPattern.length - 1)] ?? 0;
    }

    // ── Cursor blink — faster during typing (feels more real terminal) ──────
    const blinkRate = isInitialBlink ? 15 : 8;
    const showCursor = Math.floor(currentModuloFrame / blinkRate) % 2 === 0;

    // ── Glow intensity: pulse on keypress ───────────────────────────────────
    const glowIntensity = justTypedRecently ? 1.0 : 0.6;
    const textColor = isExiting ? `rgba(180,230,255,${opacity})` : 'rgba(210,240,255,1)';

    return (
        <AbsoluteFill style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            padding: '80px 50px',
            pointerEvents: 'none',
            zIndex: 5001,
        }}>
            <div style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '37px',
                fontWeight: 'bold',
                color: textColor,
                textTransform: 'uppercase',
                whiteSpace: 'pre',
                opacity: isExiting ? 1 : opacity, // handled per-char in exit
                letterSpacing: '0.5px',
                textShadow: `
                    0 0 ${4 * glowIntensity}px rgba(255,255,255,${0.9 * glowIntensity}),
                    0 0 ${14 * glowIntensity}px rgba(100,200,255,${0.7 * glowIntensity}),
                    0 0 ${28 * glowIntensity}px rgba(100,200,255,${0.45 * glowIntensity}),
                    ${1.5 * glowIntensity}px 0 2px rgba(255,0,0,${0.65 * glowIntensity}),
                    ${-1.5 * glowIntensity}px 0 2px rgba(0,0,255,${0.65 * glowIntensity})
                `,
                background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%)',
                backgroundSize: '100% 4px',
                padding: '13px 20px',
                backgroundColor: justTypedRecently
                    ? 'rgba(10,20,40,0.55)'    // slight highlight on keypress
                    : 'rgba(0,0,0,0.42)',
                borderRadius: '4px',
                borderLeft: `2px solid rgba(100,200,255,${0.3 * glowIntensity})`,
                transition: 'none',
            }}>
                {displayedText}
                {(!text.endsWith('_') || isInitialBlink || !isExiting) && (
                    showCursor
                        ? <span style={{
                            display: 'inline-block',
                            width: '2px',
                            height: '1em',
                            backgroundColor: 'rgba(180,230,255,0.95)',
                            verticalAlign: 'text-bottom',
                            marginLeft: '2px',
                            boxShadow: `0 0 6px rgba(100,200,255,${glowIntensity})`,
                          }} />
                        : <span style={{ display: 'inline-block', width: '4px' }} />
                )}
            </div>
        </AbsoluteFill>
    );
};
