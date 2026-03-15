import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

import { usePopupSchedule } from '../shared/usePopupSchedule';

interface PromoPopupProps {
    text: string;
    iconSrc?: string;
    cycleSeconds?: number;
    offsetSeconds?: number;
    holdSeconds?: number;
}

export const PromoPopup: React.FC<PromoPopupProps> = ({
    text,
    iconSrc = 'spotify.svg',
    cycleSeconds = 120, // default up from 40
    offsetSeconds = 0,
    holdSeconds = 4
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // --- NEW Animation Timeline (Strict Timing) ---
    // User requested schedule:
    // 0s - 2s (Phase 1): Icon rolls in
    // 2s - 4s (Phase 2): Text slides OUT LEFT from icon
    // 4s - [4+holdSeconds]s (Phase 3): Hold
    // [4+holdSeconds]s - [6+holdSeconds]s (Phase 4): Text slides IN RIGHT back to icon
    // [6+holdSeconds]s - [8+holdSeconds]s (Phase 5): Icon rolls OUT RIGHT 

    // Total animation time is exactly 8 seconds of movement + holdSeconds of pause
    const totalAnimationSeconds = 8 + holdSeconds;

    // Use the robust scheduler instead of modulo math
    const schedule = usePopupSchedule({
        cycleSeconds,
        animationDurationSeconds: totalAnimationSeconds,
        offsetSeconds,
        safeZoneStartSeconds: 5,  // Don't show in the first 5 seconds
        safeZoneEndSeconds: 5     // Don't let it overlap into the final 5 seconds
    });

    const framesPerPhase = 2 * fps; // 60 frames = 2 seconds
    const totalAnimFrames = totalAnimationSeconds * fps;

    // Find if we are currently within any active schedule window
    const activeStartFrame = schedule.find(s => frame >= s && frame < s + totalAnimFrames);
    const isActive = activeStartFrame !== undefined;

    if (!isActive) return null;

    const localFrame = frame - activeStartFrame;

    // 1. Icon Rolls In (0s -> 2s)
    const iconInPhase = Math.max(0, Math.min(localFrame, framesPerPhase));

    // 2. Text Slides Out (2s -> 4s)
    const textOutStart = framesPerPhase;
    const textOutPhase = Math.max(0, Math.min(localFrame - textOutStart, framesPerPhase));

    // 3. Hold
    const holdDurationFrames = holdSeconds * fps;

    // 4. Text Slides In
    const textInStart = textOutStart + framesPerPhase + holdDurationFrames;
    const textInPhase = Math.max(0, Math.min(localFrame - textInStart, framesPerPhase));

    // 5. Icon Rolls Out
    const iconOutStart = textInStart + framesPerPhase;
    const iconOutPhase = Math.max(0, Math.min(localFrame - iconOutStart, framesPerPhase));

    // Calculate absolute progress 0-1 for each phase using elegant easing (easeInOutCubic equivalent)
    const smoothEasing = Easing.bezier(0.65, 0, 0.35, 1);

    const iconInT = interpolate(iconInPhase, [0, framesPerPhase], [0, 1], { easing: smoothEasing, extrapolateRight: 'clamp' });
    const textOutT = interpolate(textOutPhase, [0, framesPerPhase], [0, 1], { easing: smoothEasing, extrapolateRight: 'clamp' });
    const textInT = interpolate(textInPhase, [0, framesPerPhase], [0, 1], { easing: smoothEasing, extrapolateRight: 'clamp' });
    const iconOutT = interpolate(iconOutPhase, [0, framesPerPhase], [0, 1], { easing: smoothEasing, extrapolateRight: 'clamp' });

    // Sizing (Reduced by 10% from the previous 120 base)
    const iconSize = 97;      // -10%
    const pillHeight = 69;    // -10%
    const fontSize = 28;      // -10%
    const paddingRight = 69;  // -10%
    const paddingLeft = 34;   // -10%

    // Translations
    // Icon slides in from +600px -> 0px. Then stays. Then slides out 0 -> +600px.
    const baseIconTx = interpolate(iconInT, [0, 1], [600, 0]);
    const finalIconTx = interpolate(iconOutT, [0, 1], [baseIconTx, 600]);
    const iconTranslateX = finalIconTx;

    // Text "Sheath": Starts hidden under the icon (translateX = -100%).
    // Slides out to 0%. Then slides back to -100%.
    const baseTextTx = interpolate(textOutT, [0, 1], [100, 0]);
    const finalTextTx = interpolate(textInT, [0, 1], [baseTextTx, 100]);
    const textTranslateXOffsetPercent = finalTextTx;

    // Physical Rolling Calculation for Icon
    const circumference = Math.PI * iconSize;
    const iconRotation = (iconTranslateX / circumference) * 360;

    const iconUrl = iconSrc || null;

    // Total visibility opacity for the text
    const textOpacity = interpolate(textOutT - textInT, [0, 0.2, 1], [0, 1, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

    return (
        <AbsoluteFill style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            padding: '50px',
            pointerEvents: 'none',
            zIndex: 5000
        }}>
            {/* Main container keeps its absolute position on the right, pieces move inside */}
            <div style={{
                display: 'flex',
                // Changed from row-reverse or implicit order. We explicitly do [Icon] -> [TextMask]
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                position: 'relative',
                height: `${iconSize}px`,
                // Shift the whole assembly so the icon moves, carrying the text with it.
                transform: `translateX(${iconTranslateX}px)`,
            }}>

                {/* ── The Primary Icon Badge (Now on the LEFT) ── */}
                <div style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2,
                    position: 'relative',
                }}>
                    {/* The actual rolling graphic */}
                    {iconUrl ? (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url('${iconUrl}')`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            // Soft drop shadow directly on the SVG shape
                            filter: 'drop-shadow(0 6px 15px rgba(29, 185, 84, 0.5))',
                            // The rotation is tied directly to the travel distance
                            transform: `rotate(${iconRotation}deg)`
                        }} />
                    ) : (
                        // Fallback circle if icon fails
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#1DB954' }} />
                    )}
                </div>

                {/* ── Text Pill Container (Now on the RIGHT) ── */}
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    // Pull the text container behind the icon's center
                    marginLeft: `-${iconSize / 2}px`,
                    // Clip anything that slides left of this container's left edge (hidden behind icon)
                    clipPath: 'inset(-50px -50px -50px 0)',
                }}>
                    {/* ── Text Pill (The "Sword" sliding right from the sheath) ── */}
                    <div style={{
                        height: `${pillHeight}px`,
                        display: 'flex',
                        alignItems: 'center',
                        // Add icon radius to left padding so text doesn't overlap the icon hole
                        padding: `0 ${paddingRight}px 0 ${paddingLeft + (iconSize / 2)}px`,
                        // Rounded only on the right
                        borderRadius: `0 ${pillHeight / 2}px ${pillHeight / 2}px 0`,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(12px)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        borderLeft: 'none',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.6)',

                        // Slide out as a percentage
                        // When textTranslateXOffsetPercent is 100, the pill is shifted 100% left (hidden).
                        transform: `translateX(-${textTranslateXOffsetPercent}%)`,
                    }}>
                        <span style={{
                            color: 'white',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontWeight: 600,
                            fontSize: `${fontSize}px`,
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                            // Map opacity to the text opening/closing sequence
                            opacity: textOpacity
                        }}>
                            {text}
                        </span>
                    </div>
                </div>

            </div>
        </AbsoluteFill>
    );
};
