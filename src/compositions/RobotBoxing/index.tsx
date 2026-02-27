import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, staticFile, interpolate, spring, Easing } from 'remotion';

// ─── HELPER COMPONENT: Cutout using clipPath ───
const MaskedRobotPart: React.FC<{
    src: string;
    points: string;
    x: number;
    y: number;
    rotation?: number;
    pivotX?: number;
    pivotY?: number;
    scaleX?: number;
    opacity?: number;
    extraX?: number;
    extraY?: number;
}> = ({ src, points, x, y, rotation = 0, pivotX = 0, pivotY = 0, scaleX = 1, opacity = 1, extraX = 0, extraY = 0 }) => {
    const id = useMemo(() => `clip-${Math.random().toString(36).substr(2, 9)}`, []);
    return (
        <g transform={`translate(${x + pivotX + extraX}, ${y + pivotY + extraY}) rotate(${rotation}) scale(${scaleX}, 1)`}>
            <g transform={`translate(${-pivotX}, ${-pivotY})`}>
                <clipPath id={id}>
                    <polygon points={points} />
                </clipPath>
                <image
                    href={staticFile(src)}
                    width="1024"
                    height="1792"
                    clipPath={`url(#${id})`}
                    opacity={opacity}
                />
            </g>
        </g>
    );
};

export const RobotBoxing: React.FC = () => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const t = frame / 30;

    // Timing for Robo_1's punch
    const punchStart = 15;

    // Extend punch using a spring for a snappy hit
    const punchProgress = spring({
        frame: frame - punchStart,
        fps: 30,
        config: { damping: 12, stiffness: 200, mass: 0.5 }
    });

    // Retract arm slower
    const retractProgress = spring({
        frame: frame - (punchStart + 10), // start retracting after 10 frames
        fps: 30,
        config: { damping: 15, stiffness: 100 }
    });

    // We can combine these: actual extension is punch progress minus retract progress
    const extension = Math.max(0, punchProgress - retractProgress);

    // Calculate rotation: 0 at rest, -110 degrees at full extension (swinging wildly up)
    const armRotation1 = interpolate(extension, [0, 1], [0, -110]);
    // Also thrust the shoulder forward
    const armThrustX = interpolate(extension, [0, 1], [0, 200]);
    const armThrustY = interpolate(extension, [0, 1], [0, -50]);

    // Body lunge: move the whole robot forward to simulate a deep stepping jab
    const bodyLungeX1 = interpolate(extension, [0, 1], [0, 150]);
    // Anticipation: pull back slightly before punching
    const anticipation = interpolate(frame, [punchStart - 5, punchStart], [0, -20], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.42, 0, 1, 1)
    });

    const totalX1 = 100 + bodyLungeX1 + (extension === 0 ? anticipation : 0);

    // --- ROBO_2 REACTION ---
    const hitFrame = punchStart + 3; // roughly when the extension peaks

    // Knockback spring
    const knockback = spring({
        frame: frame - hitFrame,
        fps: 30,
        config: { damping: 10, stiffness: 150 }
    });

    // Recovery spring
    const recovery = spring({
        frame: frame - (hitFrame + 10),
        fps: 30,
        config: { damping: 12, stiffness: 80 }
    });

    const reactionImpact = Math.max(0, knockback - recovery);

    // Move Robo_2 back and rotate
    const robo2X = 800 + interpolate(reactionImpact, [0, 1], [0, 80]);
    const robo2Y = 100 - interpolate(reactionImpact, [0, 1], [0, 20]); // slight lift
    // Rotate from origin of impact (roughly chest height, y=300)
    const robo2Rotation = interpolate(reactionImpact, [0, 1], [0, 15]);

    // --- VISUAL IMPACT EFFECTS ---
    // Camera shake
    const shakeAmount = interpolate(reactionImpact, [0, 1], [0, 15]);
    const shakeX = Math.sin(frame * 2) * shakeAmount;
    const shakeY = Math.cos(frame * 3) * shakeAmount;

    // Spark animation (scale rapidly then disappear)
    const sparkScale = interpolate(reactionImpact, [0, 0.2, 0.4], [0, 1.5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

    return (
        <AbsoluteFill style={{ backgroundColor: '#111' }}>
            <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Visual debug for extracting masks */}
                <g transform={`translate(${totalX1 + shakeX}, ${100 + shakeY}) scale(0.6)`}>
                    {/* ROBOT 1 */}

                    {/* Base image (fading this out for now to see what's masked) */}
                    <image href={staticFile("Robo_1.svg")} width="1024" height="1792" opacity={0.1} />

                    {/* Body (everything except arms) */}
                    <clipPath id="body-clip-1" clipPathUnits="userSpaceOnUse">
                        {/* Outer box clockwise, inner arm hole counter-clockwise so clipRule evenodd works natively or just use a path */}
                        <path d="
                            M 0 0 L 1024 0 L 1024 1792 L 0 1792 Z
                            M 560 180 L 590 190 L 490 470 L 230 550 L 500 340 Z
                         " clipRule="evenodd" fillRule="evenodd" />
                    </clipPath>
                    <image href={staticFile("Robo_1.svg")} width="1024" height="1792" clipPath="url(#body-clip-1)" />

                    {/* Back Arm */}
                    <MaskedRobotPart
                        src="Robo_1.svg"
                        points="20,400 150,280 280,450 180,680 70,680"
                        x={0} y={0} pivotX={220} pivotY={350}
                        rotation={Math.sin(t * Math.PI) * 10} // Just idling
                    />

                    {/* Lead Arm */}
                    <MaskedRobotPart
                        src="Robo_1.svg"
                        points="560,180 500,340 230,550 490,470 590,190"
                        x={0} y={0}
                        pivotX={550} pivotY={260}
                        rotation={armRotation1}
                        extraX={armThrustX}
                        extraY={armThrustY}
                    />
                </g>

                <g transform={`translate(${robo2X + shakeX}, ${robo2Y + shakeY}) rotate(${robo2Rotation}) scale(0.6)`} style={{ transformOrigin: '200px 300px' }}>
                    {/* ROBOT 2 */}
                    <image href={staticFile("Robo_2.svg")} width="1024" height="1792" opacity={0.1} />

                    <clipPath id="body-clip-2" clipPathUnits="userSpaceOnUse">
                        <path d="
                            M 0 0 L 1024 0 L 1024 1792 L 0 1792 Z
                            M 560 180 L 590 190 L 490 470 L 230 550 L 500 340 Z
                         " clipRule="evenodd" fillRule="evenodd" />
                    </clipPath>
                    <image href={staticFile("Robo_2.svg")} width="1024" height="1792" clipPath="url(#body-clip-2)" opacity={reactionImpact > 0.1 && reactionImpact < 0.9 && frame % 2 === 0 ? 0.5 : 1} />

                    {/* Back Arm */}
                    <MaskedRobotPart
                        src="Robo_2.svg"
                        points="100,400 230,280 360,450 260,680 150,680"
                        x={0} y={0} pivotX={220} pivotY={350}
                        // Open guard when hit
                        rotation={interpolate(reactionImpact, [0, 1], [0, -30])}
                        opacity={reactionImpact > 0.1 && reactionImpact < 0.9 && frame % 2 === 0 ? 0.5 : 1}
                    />

                    {/* Lead Arm */}
                    <MaskedRobotPart
                        src="Robo_2.svg"
                        points="560,180 500,340 230,550 490,470 590,190"
                        x={0} y={0}
                        pivotX={550} pivotY={260}
                        // Open guard when hit
                        rotation={interpolate(reactionImpact, [0, 1], [0, -40])}
                        opacity={reactionImpact > 0.1 && reactionImpact < 0.9 && frame % 2 === 0 ? 0.5 : 1}
                    />
                </g>

                {/* HIT SPARK at impact coordinates (roughly the chin/head of Robo 2) */}
                {sparkScale > 0 && (
                    <g transform={`translate(820, 180) scale(${sparkScale})`} style={{ transformOrigin: '0 0' }}>
                        <path d="M0 -50 L10 -15 L50 -10 L15 10 L25 50 L0 25 L-25 50 L-15 10 L-50 -10 L-10 -15 Z" fill="#ffea00" />
                        <path d="M0 -30 L5 -10 L30 -5 L10 5 L15 30 L0 15 L-15 30 L-10 5 L-30 -5 L-5 -10 Z" fill="#ffffff" />
                        <circle cx="0" cy="0" r="10" fill="magenta" opacity={0.5} />
                    </g>
                )}
            </svg>
        </AbsoluteFill>
    );
};
