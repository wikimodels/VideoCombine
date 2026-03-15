import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const WINDOW_SAMPLES = 2048; // Less samples for tighter plasma
const STEP = 4;
const NUM_TRAILS = 5;
const TRAIL_OFFSET = 300;

// High-tech sci-fi colors
const PLASMA_CORE = '#ffffff';
const PLASMA_GLOW_MAIN = '#00f0ff'; // Cyan/Blue plasma for main
const PLASMA_GLOW_SIDE = '#ff0055'; // Pink/Red for side engines

export const CybercoreBreach: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    // Stars background generator (memoized so it's stable)
    const stars = useMemo(() => {
        return Array.from({ length: 150 }).map(() => ({
            x: Math.random() * width,
            y: Math.random() * height * 2, // Double height for smooth looping
            size: Math.random() * 3 + 1,
            speed: Math.random() * 15 + 10,
            color: Math.random() > 0.8 ? '#00f0ff' : '#ffffff',
        }));
    }, [width, height]);

    // 5 Unique UFO Saucers hovering around the rocket (Scaled up 10%)
    const ufos = useMemo(() => {
        return [
            // Top Left (Green)
            { id: 1, color: '#33ff00', hullColor: '#4d4d55', scale: 1.65, xOffset: -380, yOffset: -450, driftSpeed: 0.02, phase: 0, brightness: 1.0 },
            // Top Right (Purple)
            { id: 2, color: '#bf00ff', hullColor: '#464652', scale: 1.43, xOffset: 380, yOffset: -500, driftSpeed: 0.03, phase: 2, brightness: 1.0 },
            // Bottom Left (Orange)
            { id: 3, color: '#ff8800', hullColor: '#43434d', scale: 1.21, xOffset: -380, yOffset: -50, driftSpeed: 0.015, phase: 4, brightness: 1.0 },
            // Bottom Right (Blue)
            { id: 4, color: '#00d4ff', hullColor: '#3f3f4a', scale: 1.54, xOffset: 380, yOffset: -100, driftSpeed: 0.025, phase: 6, brightness: 1.0 },
            // Top Center (Red)
            { id: 5, color: '#ff0033', hullColor: '#4d4444', scale: 1.76, xOffset: 0, yOffset: -650, driftSpeed: 0.018, phase: 8, brightness: 1.3 },
        ];
    }, []);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#020205' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;

    // Thruster intensity based heavily on bass drops (boosted 10% per user request)
    const thrust = (0.2 + bass * 0.8) * 1.1;
    const isOverload = bass > 0.35;

    const { channelWaveforms, sampleRate, numberOfChannels } = audioData;
    const samplesPerFrame = Math.floor(sampleRate / fps);
    const startSample = Math.floor(frame * samplesPerFrame);
    const LEFT = channelWaveforms[0];
    const RIGHT = numberOfChannels > 1 ? channelWaveforms[1] : channelWaveforms[0];

    const cx = width / 2;
    const cy = height / 2;

    // ── 1. PLASMA EXHAUST GENERATOR (Lissajous) ──
    const renderPlasma = (nx: number, ny: number, scale: number, color: string, timeOffset: number) => {
        const buildPath = (tOffset: number): string => {
            const parts: string[] = [];
            for (let i = 0; i < WINDOW_SAMPLES; i += STEP) {
                const si = startSample - tOffset + i + timeOffset;
                if (si < 0 || si >= LEFT.length) continue;

                // Audio signal creates Lissajous shapes
                const xS = LEFT[si];
                // Phase delayed for Y axis to create loops
                const yS = RIGHT[Math.max(0, si - 200)];

                // Add vertical engine exhaust stretching (forces the flame downwards mostly)
                const exhaustStretch = 1 + thrust * 1.5;

                // X remains erratic, Y tends downwards to act as a thruster flame
                const x = (nx + (xS * scale * (0.5 + thrust * 0.5))).toFixed(1);
                const y = (ny + ((yS + 0.5) * scale * exhaustStretch)).toFixed(1);

                parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`);
            }
            return parts.join(' ');
        };

        const trails = Array.from({ length: NUM_TRAILS }, (_, t) => ({
            path: buildPath(t * TRAIL_OFFSET),
            // Older trails fade out
            opacity: (1 - t / NUM_TRAILS) * 0.9,
            // Older trails get thinner
            sw: Math.max(1, 4 - t * 0.6),
        }));

        return (
            <g>
                {/* Intense Core hole glow */}
                <circle cx={nx} cy={ny} r={scale * 0.6} fill={color} opacity={thrust * 0.6} style={{ filter: `blur(${10 + thrust * 30}px)` }} />

                {/* The Lissajous Plasma lines */}
                {[...trails].reverse().map((t, i) => (
                    <path key={i} d={t.path} fill="none"
                        stroke={t.opacity > 0.8 ? PLASMA_CORE : color}
                        strokeWidth={t.sw * (1 + thrust)} opacity={t.opacity}
                        style={{ filter: `drop-shadow(0 0 ${4 + thrust * 15}px ${color})` }}
                    />
                ))}
            </g>
        );
    };



    // ── 2. ROCKET NOZZLE GENERATOR ──
    const renderNozzle = (nx: number, ny: number, width: number, height: number) => (
        <g>
            {/* The Conical Nozzle Shell */}
            <path
                d={`M ${nx - width * 0.3} ${ny - height} L ${nx + width * 0.3} ${ny - height} L ${nx + width * 0.5} ${ny} L ${nx - width * 0.5} ${ny} Z`}
                fill="#252525" stroke="#4f4f55" strokeWidth="8" strokeLinejoin="round"
            />
            {/* Metallic heat rings across the cone */}
            <path d={`M ${nx - width * 0.35} ${ny - height * 0.6} L ${nx + width * 0.35} ${ny - height * 0.6}`} stroke="#333" strokeWidth="10" />
            <path d={`M ${nx - width * 0.43} ${ny - height * 0.2} L ${nx + width * 0.43} ${ny - height * 0.2}`} stroke="#424244" strokeWidth="6" />

            {/* Vertical Struts */}
            {Array.from({ length: 5 }).map((_, i) => {
                const px = nx - width * 0.35 + (i * width * 0.7 / 4);
                return <line key={`bolt-${i}`} x1={px} y1={ny - height * 0.9} x2={px} y2={ny - height * 0.1} stroke="#555" strokeWidth="4" />;
            })}
        </g>
    );

    // ── 3. DYNAMIC CAMERA & COORDINATES ──
    // Camera shakes violently at high thrust
    const shakeX = (Math.random() - 0.5) * 20 * (isOverload ? 1 : 0);
    const shakeY = (Math.random() - 0.5) * 20 * (isOverload ? 1 : 0);

    // Slow horizontal sway like a car drifting in its lane
    const swayX = Math.sin(frame / 60) * 120; // Drifts left and right 120px

    // Nozzle sizes
    const mainWidth = 280;
    const mainHeight = 150;
    const sideWidth = 180;
    const sideHeight = 100;

    // When bass drops, engine kicks back up slightly
    const enginePush = thrust * 30;

    // Shift entire ship down (originally +630, moved UP 10px per request)
    const mainY = cy + 620;
    const sideY = cy + 670;

    return (
        <AbsoluteFill style={{ backgroundColor: '#020205', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* Camera Shake Container */}
            <div style={{
                position: 'absolute', width: '100%', height: '100%',
                transform: `translate(${shakeX}px, ${shakeY}px)`,
            }}>

                {/* ── Z-LAYER: DEEP SPACE STARS ── */}
                <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
                    {stars.map((star, i) => {
                        // Stars fly DOWN (so rocket appears to fly UP)
                        // Speed scales insanely with the music beat (Warp effect)
                        const currentSpeed = star.speed * (1 + thrust * 4);
                        const sy = (star.y + frame * currentSpeed) % height;

                        // Stars stretch into warp lines at high speeds
                        const stretch = currentSpeed * 0.8;

                        return (
                            <line
                                key={`star-${i}`}
                                x1={star.x} y1={sy - stretch}
                                x2={star.x} y2={sy + stretch}
                                stroke={star.color}
                                strokeWidth={star.size}
                                strokeLinecap="round"
                                opacity={0.2 + thrust * 0.4}
                            />
                        );
                    })}
                </svg>

                {/* ── Z-LAYER: 4 FLOATING UFO SAUCERS ── */}
                <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
                    {ufos.map((ufo, i) => {
                        // Smooth, independent drifting movement
                        const ux = cx + ufo.xOffset + Math.sin(frame * ufo.driftSpeed + ufo.phase) * 60;
                        const uy = (cy + ufo.yOffset) - (enginePush * 0.5) + Math.cos(frame * ufo.driftSpeed * 0.8 + ufo.phase) * 40;

                        // Saucer banking to the side as it moves
                        const bankRot = Math.sin(frame * 0.05 + ufo.phase) * 15;

                        // Sparkle / Twinkle logic exactly like AlienDJ disco ball
                        const twinkle = Math.abs(Math.sin(frame * (0.1 + (i % 4) * 0.05) + i));
                        const b = ufo.brightness || 1;
                        const flareOpacity = Math.max(0.1, twinkle * (bass * 3)) * b;

                        return (
                            <g key={`ufo-${ufo.id}`} transform={`translate(${ux}, ${uy})`} opacity={0.8 + bass * 0.2}>
                                <g transform={`rotate(${bankRot}) scale(${ufo.scale})`}>

                                    {/* Tractor Beam Glow under ship */}
                                    <ellipse cx={0} cy={20} rx={45} ry={10} fill={ufo.color} opacity={(0.4 + bass * 0.5) * b} style={{ filter: `blur(${10 + bass * 15}px)` }} />

                                    {/* Additional ambient Core Glow */}
                                    <circle cx={0} cy={0} r={35} fill={ufo.color} opacity={(0.3 + bass * 0.3) * b} style={{ filter: `blur(25px)` }} />

                                    {/* Antenna Line */}
                                    <line x1={0} y1={-20} x2={0} y2={-50} stroke="#778" strokeWidth={3} />

                                    {/* Glass Dome */}
                                    <path
                                        d="M -30 -5 A 30 30 0 0 1 30 -5 Z"
                                        fill="rgba(150, 255, 255, 0.25)"
                                        stroke="rgba(255, 255, 255, 0.6)"
                                        strokeWidth={2}
                                    />
                                    {/* Alien Silhouette inside dome */}
                                    <path d="M -9 -5 Q 0 -24 9 -5 Z" fill="#050505" />
                                    <ellipse cx={-4} cy={-13} rx={2} ry={1} fill="#0f0" opacity={0.9} transform="rotate(15 -4 -13)" />
                                    <ellipse cx={4} cy={-13} rx={2} ry={1} fill="#0f0" opacity={0.9} transform="rotate(-15 4 -13)" />

                                    {/* Main Saucer Hull (Metal Disk) - Made sleeker */}
                                    <ellipse cx={0} cy={0} rx={55} ry={14} fill={ufo.hullColor} stroke="#222" strokeWidth={3} />
                                    <ellipse cx={0} cy={-2} rx={52} ry={10} fill="none" stroke="#556" strokeWidth={1.5} />
                                    <ellipse cx={0} cy={-4} rx={45} ry={7} fill="none" stroke="#334" strokeWidth={1} />

                                    {/* Glowing Ring on the saucer edge - Brighter and thicker */}
                                    <ellipse cx={0} cy={0} rx={55} ry={14} fill="none" stroke={ufo.color} strokeWidth={(3 + bass * 4) * b} style={{ filter: `drop-shadow(0 0 12px ${ufo.color})` }} />

                                    {/* Blinking rim lights */}
                                    {[-40, 0, 40].map((lx, idx) => (
                                        <circle
                                            key={idx}
                                            cx={lx} cy={6} r={3}
                                            fill={ufo.color}
                                            opacity={(Math.abs(Math.sin(frame * 0.2 + idx)) * bass + 0.3) * b}
                                            style={{ filter: `drop-shadow(0 0 8px ${ufo.color})` }}
                                        />
                                    ))}

                                    {/* ── HIGH-INTENSITY SPARKLE ON ANTENNA TIP ── */}
                                    <g transform={`translate(0, -50) scale(${b})`}>
                                        <g opacity={flareOpacity * 2.6}>
                                            {/* Bright white core */}
                                            <circle cx={0} cy={0} r={5.5} fill="#ffffff" />
                                            {/* Sharp Cross Flare */}
                                            <path d="M 0 -20 L 0 20 M -20 0 L 20 0" stroke="#ffffff" strokeWidth="3.5" />
                                            {/* Diagonal mini flare */}
                                            <path d="M -11 -11 L 11 11 M -11 11 L 11 -11" stroke="#ffffff" strokeWidth="1.5" opacity={0.8} />

                                            {/* Massive Color Bloom/Glow */}
                                            <circle cx={0} cy={0} r={26} fill={ufo.color} opacity={0.9} style={{ filter: 'blur(10px)' }} />
                                        </g>
                                    </g>

                                </g>
                            </g>
                        );
                    })}
                </svg>

                {/* ── Z-LAYER: SPACESHIP HULL & ENGINES ── */}
                <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
                    <g transform={`translate(${swayX}, 0)`}>
                        <defs>
                            {/* Much brighter, silver metallic gradients */}
                            <linearGradient id="hullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#676777" />
                                <stop offset="60%" stopColor="#4a4a55" />
                                <stop offset="100%" stopColor="#353540" />
                            </linearGradient>
                            <linearGradient id="wingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#5d5d6d" />
                                <stop offset="100%" stopColor="#41414e" />
                            </linearGradient>
                        </defs>

                        {/* BASE HULL: The dark metallic body of the ship */}
                        <g transform={`translate(0, ${-enginePush * 0.5})`}>
                            {/* Shorter, Parabolic Central Core (Fuselage) */}
                            <path
                                d={`M ${cx} ${mainY - mainHeight - 750} Q ${cx + 160} ${mainY - mainHeight - 400} ${cx + 140} ${mainY - mainHeight} L ${cx - 140} ${mainY - mainHeight} Q ${cx - 160} ${mainY - mainHeight - 400} ${cx} ${mainY - mainHeight - 750} Z`}
                                fill="url(#hullGrad)" stroke="#222" strokeWidth="8" strokeLinejoin="round"
                            />

                            {/* Central Core details */}
                            <line x1={cx} y1={mainY - mainHeight - 650} x2={cx} y2={mainY - mainHeight} stroke="#333" strokeWidth="20" />
                            <line x1={cx} y1={mainY - mainHeight - 650} x2={cx} y2={mainY - mainHeight} stroke="#424244" strokeWidth="4" />
                            <path d={`M ${cx - 120} ${mainY - 250} L ${cx} ${mainY - 200} L ${cx + 120} ${mainY - 250}`} fill="none" stroke="#222" strokeWidth="15" />

                            {/* Top Stabilizer Fins (Moved down and attached to fuselage) */}
                            <path
                                d={`M ${cx - 100} ${mainY - mainHeight - 350} L ${cx - 300} ${mainY - mainHeight + 50} L ${cx - 200} ${mainY - mainHeight + 100} L ${cx - 135} ${mainY - mainHeight - 150} Z`}
                                fill="url(#wingGrad)" stroke="#303038" strokeWidth="6" strokeLinejoin="round"
                            />
                            <path
                                d={`M ${cx + 100} ${mainY - mainHeight - 350} L ${cx + 300} ${mainY - mainHeight + 50} L ${cx + 200} ${mainY - mainHeight + 100} L ${cx + 135} ${mainY - mainHeight - 150} Z`}
                                fill="url(#wingGrad)" stroke="#303038" strokeWidth="6" strokeLinejoin="round"
                            />

                            {/* Side Boosters (Shorter parabolic cones) */}
                            <path
                                d={`M ${cx - 210} ${sideY - sideHeight - 400} Q ${cx - 130} ${sideY - 200} ${cx - 140} ${sideY - sideHeight} L ${cx - 280} ${sideY - sideHeight} Q ${cx - 290} ${sideY - 200} ${cx - 210} ${sideY - sideHeight - 400} Z`}
                                fill="url(#hullGrad)" stroke="#222" strokeWidth="6" strokeLinejoin="round"
                            />
                            <path
                                d={`M ${cx + 210} ${sideY - sideHeight - 400} Q ${cx + 130} ${sideY - 200} ${cx + 140} ${sideY - sideHeight} L ${cx + 280} ${sideY - sideHeight} Q ${cx + 290} ${sideY - 200} ${cx + 210} ${sideY - sideHeight - 400} Z`}
                                fill="url(#hullGrad)" stroke="#222" strokeWidth="6" strokeLinejoin="round"
                            />
                        </g>

                        {/* ── THE THRUSTERS ── */}
                        {/* Left Side Thruster (Pink) */}
                        <g transform={`translate(0, ${-enginePush * 0.8})`}>
                            {renderNozzle(cx - 210, sideY, sideWidth, sideHeight)}
                            {renderPlasma(cx - 210, sideY, sideWidth * 0.6, PLASMA_GLOW_SIDE, 5000)}
                        </g>

                        {/* Right Side Thruster (Pink) */}
                        <g transform={`translate(0, ${-enginePush * 0.8})`}>
                            {renderNozzle(cx + 210, sideY, sideWidth, sideHeight)}
                            {renderPlasma(cx + 210, sideY, sideWidth * 0.6, PLASMA_GLOW_SIDE, 10000)}
                        </g>

                        {/* Main Central Thruster (Cyan) */}
                        <g transform={`translate(0, ${-enginePush})`}>
                            {renderNozzle(cx, mainY, mainWidth, mainHeight)}
                            {renderPlasma(cx, mainY, mainWidth * 0.6, PLASMA_GLOW_MAIN, 0)}
                        </g>
                    </g>
                </svg>

                {/* ── HUD / SYSTEM TELEMETRY ── */}
                <div style={{
                    position: 'absolute', top: height * 0.05, left: width * 0.05,
                    color: '#00f0ff', fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold',
                    textShadow: `0 0 10px #00f0ff`, opacity: 0.8
                }}>
                    SYSTEM // OVERSEER-V2<br />
                    CORE_LOAD: {(thrust * 100).toFixed(1)}%<br />
                    STATUS: {isOverload ? <span style={{ color: '#ff0055' }}>CRITICAL</span> : 'NOMINAL'}
                </div>
            </div>

            {/* Global Post-Processing (Vignette) */}
            <AbsoluteFill style={{
                background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.85) 100%)`,
                pointerEvents: 'none',
                transition: 'box-shadow 0.1s'
            }} />
        </AbsoluteFill>
    );
};
