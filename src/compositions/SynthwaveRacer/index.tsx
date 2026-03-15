import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

export const SynthwaveRacer: React.FC = () => {
    const frame = useCurrentFrame();
    // Default TikTok/Shorts 1080x1920
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#020010' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });

    // Audio ranges
    const bass = Math.min((viz[0] + viz[1]) / 2 * 3, 1);
    const midR = Math.min((viz[4] + viz[5] + viz[6]) / 3 * 5, 1);

    const cx = width / 2;
    const cy = height * 0.55; // Horizon line slightly below center

    const t = frame;

    // --- COLORS ---
    const BG_DARK = '#030010';
    const SUN_TOP = '#ffcc00';
    const SUN_BOTTOM = '#ff0055';
    const NEON_GRID_H = '#ff00ff'; // Vibrant Magenta
    const NEON_GRID_V = '#00ffff'; // Electric Cyan
    const MOUNTAIN_HUE = 280; // Deep Purple

    // --- ANIMATIONS & PHYSICS ---
    // Scene scroll speed (massively increased)
    const baseSpeed = 15.0; // Much faster base speed
    const boost = bass > 0.6 ? bass * 15 : 0;
    const scrollOffset = (frame * (baseSpeed + boost)) % 1000;

    // Aggressive Camera Shake on Heavy Bass
    const dropShake = bass > 0.8 ? (bass * 20) : (bass > 0.5 ? bass * 5 : 0);
    const shakeX = dropShake * (Math.random() - 0.5);
    const shakeY = dropShake * (Math.random() - 0.5);
    // Car Suspension Bounce & Drifting Left/Right
    const carBounce = Math.sin(t * 0.4) * 5 - (bass * 15) + (Math.random() > 0.8 && bass > 0.6 ? 5 : 0);
    // Smooth, slow drift left and right
    const carDriftX = Math.sin(t * 0.05) * 80 + Math.cos(t * 0.03) * 40;

    // Sun Size & Glitch
    // Almost static sun size (max +6% jump on heavy drops)
    const sunSize = 500 + bass * 30;

    // Tighter VHS tracking glitch
    const isGlitch = bass > 0.85;
    const sunGlitchX = isGlitch ? (Math.random() - 0.5) * 40 : 0;
    const sunGlitchY = isGlitch ? (Math.random() - 0.5) * 10 : 0;

    return (
        <AbsoluteFill style={{
            backgroundColor: BG_DARK,
            overflow: 'hidden',
            transform: `translate(${shakeX}px, ${shakeY}px) scale(1.02)` // scale slightly to hide edges during shake
        }}>
            <Audio src={audioUrl} />

            {/* ── SKY GRADIENT ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={cy}>
                <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#02000a" />
                        <stop offset="50%" stopColor="#14002e" />
                        <stop offset="85%" stopColor="#4a004a" />
                        <stop offset="100%" stopColor="#cc0055" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width={width} height={cy} fill="url(#skyGrad)" />

                {/* Vintage Starfield */}
                {Array.from({ length: 60 }).map((_, i) => {
                    const sx = (Math.sin(i * 123) * width + width) % width;
                    const sy = (Math.cos(i * 321) * cy + cy) % cy;
                    const isTwinkle = Math.sin(t * 0.1 + i) > 0.5;
                    return (
                        <circle key={`star-${i}`} cx={sx} cy={sy} r={1.5} fill="#fff" opacity={isTwinkle ? 0.8 : 0.2} />
                    );
                })}

                {/* Shooting Stars (One exactly every 3 to 4 seconds) */}
                {Array.from({ length: 25 }).map((_, i) => { // 25 comets covers ~87 seconds of video
                    // Stable pseudo-random values based on index
                    const seed = (i + 1) * 1234.56;
                    const r1 = Math.abs(Math.sin(seed));
                    const r2 = Math.abs(Math.cos(seed));
                    const r3 = Math.abs(Math.sin(seed * 2));

                    // Base spawn time: every 105 frames (3.5 seconds at 30 fps)
                    const baseSpawnFrame = i * 105;

                    // Jitter: +/- 15 frames (0.5 seconds of randomness)
                    // This creates a guaranteed gap of 3 to 4 seconds between each comet.
                    const jitter = (r1 - 0.5) * 30;
                    const spawnFrame = baseSpawnFrame + jitter;

                    // Lifetime offset for THIS specific comet
                    const tOffset = frame - spawnFrame;

                    // Comet lives for 60 frames and fades out (longer trail)
                    const lifeTime = 60;
                    if (tOffset < 0 || tOffset > lifeTime) return null;

                    // Random start position exclusively within upper screen
                    // Start anywhere from X=0 to X=width.
                    const startX = r1 * width;
                    const startY = -50 + r2 * 100;

                    // Force direction INWARDS so they never fly off-screen out of view
                    const dirX = startX < (width / 2) ? 1 : -1;

                    // Random Velocity (faster but smoother)
                    const speed = 20 + r3 * 25;

                    const headX = startX + tOffset * speed * dirX;
                    const headY = startY + tOffset * (speed * 0.4); // Fall downwards less steeply

                    // Trail length that stretches out then catches up (longer trail)
                    const tailX = startX + Math.max(0, tOffset - 12) * speed * dirX;
                    const tailY = startY + Math.max(0, tOffset - 12) * (speed * 0.4);

                    // Fade out comet as it nears its lifetime
                    const cometAlpha = Math.max(0, 1 - (tOffset / lifeTime));

                    // Cyan vs Pink comet
                    const coreColor = r1 > 0.5 ? '#00ffff' : '#ff00ff';

                    const gradId = `cometGrad-${i}`;

                    return (
                        <g key={`comet-${i}`} opacity={cometAlpha}>
                            <defs>
                                <linearGradient id={gradId} x1={tailX} y1={tailY} x2={headX} y2={headY} gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="transparent" />
                                    <stop offset="50%" stopColor={coreColor} stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#ffffff" />
                                </linearGradient>
                            </defs>
                            {/* Glowing aura (Another 15% thicker) */}
                            <line x1={tailX} y1={tailY} x2={headX} y2={headY} stroke={`url(#${gradId})`} strokeWidth="13" style={{ filter: 'blur(5px)' }} opacity="0.75" />
                            {/* Intense Core (Another 15% thicker) */}
                            <line x1={tailX} y1={tailY} x2={headX} y2={headY} stroke={`url(#${gradId})`} strokeWidth="4.6" />
                            {/* Bright head star (Another 15% larger) */}
                            <circle cx={headX} cy={headY} r="3.45" fill="#fff" style={{ filter: 'drop-shadow(0 0 8px white)' }} />
                        </g>
                    );
                })}
            </svg>

            {/* ── THE RETRO SUN ── */}
            {/* Split into two pieces for glitching/slicing effect */}
            <svg style={{ position: 'absolute', top: cy - sunSize * 0.8, left: 0, filter: `drop-shadow(0 0 ${40 + bass * 60}px ${SUN_BOTTOM})` }} width={width} height={sunSize}>
                <defs>
                    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={SUN_TOP} />
                        <stop offset="50%" stopColor="#ff6600" />
                        <stop offset="100%" stopColor={SUN_BOTTOM} />
                    </linearGradient>
                    {/* The iconic horizontal cutouts of a synthwave sun */}
                    <mask id="sunMask">
                        <rect x="0" y="0" width={width} height={sunSize} fill="white" />
                        {Array.from({ length: 12 }).map((_, i) => {
                            // Lines get thicker towards the bottom
                            const y = sunSize * 0.4 + Math.pow(i, 1.4) * 8;
                            const h = 2 + Math.pow(i, 1.1) * 1.5;
                            return <rect key={`cut-${i}`} x="0" y={y} width={width} height={h} fill="black" />;
                        })}
                    </mask>
                </defs>

                {/* Top unglitched half */}
                <g mask="url(#sunMask)">
                    <clipPath id="topClip">
                        <rect x="0" y="0" width={width} height={sunSize * 0.5} />
                    </clipPath>
                    <circle cx={cx} cy={sunSize * 0.8} r={sunSize * 0.5} fill="url(#sunGrad)" clipPath="url(#topClip)" />
                </g>

                {/* Bottom glitched half (shifts horizontally on bass hits) */}
                <g mask="url(#sunMask)" transform={`translate(${sunGlitchX}, ${sunGlitchY})`}>
                    <clipPath id="bottomClip">
                        <rect x={-50} y={sunSize * 0.5} width={width + 100} height={sunSize * 0.5 + 50} />
                    </clipPath>
                    <circle cx={cx} cy={sunSize * 0.8} r={sunSize * 0.5} fill="url(#sunGrad)" clipPath="url(#bottomClip)" />
                </g>
            </svg>

            {/* ── EQ MOUNTAINS (Dynamic Vector Path) ── */}
            <svg style={{ position: 'absolute', top: cy - 250, left: 0 }} width={width} height={252}>
                <defs>
                    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={`hsla(${MOUNTAIN_HUE}, 80%, 30%, 1)`} />
                        <stop offset="100%" stopColor="#080015" />
                    </linearGradient>
                </defs>
                {/* Generate Left and Right mountain ranges directly from EQ viz */}
                {(() => {
                    const mountPoints = 40;
                    // We will generate one continuous mountain range that spans the whole width.
                    let p = `M 0,252 `;

                    for (let i = 0; i <= mountPoints; i++) {
                        const x = (width / mountPoints) * i;

                        // 3 peaks logic (similar to PepeStormFlyer Ocean EQ)
                        const blockWidth = mountPoints / 3;
                        const blockIdx = Math.min(2, Math.floor(i / blockWidth));
                        const center = (blockIdx + 0.5) * blockWidth;

                        // Dist: 0 at the peak, 1 at the edges
                        const dist = Math.min(1, Math.abs(i - center) / (blockWidth / 2));

                        // Map the most active bass bins (0) to the peak, and the quieter bins (15) to valleys
                        const vIdx = Math.floor(dist * 15);

                        // Randomize height multiplier per peak
                        const blockMod = 0.5 + Math.abs(Math.sin((blockIdx + 1) * 31.4)) * 1.5;

                        const eqAmp = (viz[vIdx] ?? 0) * 3 * blockMod;

                        // Smoothly merge to the horizon line (y=250) at edges
                        const y = 250 - (eqAmp * 160);

                        p += `${x},${y} `;
                    }

                    p += ` ${width},252 Z`;

                    return (
                        <g>
                            {/* Inner Glow Behind Mountains */}
                            <path d={p} fill="none" stroke="#ff0088" strokeWidth="8" style={{ filter: 'blur(10px)' }} opacity={0.6 + bass * 0.4} />

                            {/* Mountain Fills */}
                            <path d={p} fill="url(#mountainGrad)" stroke="#ff0088" strokeWidth="2" />
                        </g>
                    );
                })()}
            </svg>

            {/* ── 3D PERSPECTIVE NEON GRID ── */}
            <svg style={{ position: 'absolute', top: cy, left: 0 }} width={width} height={height - cy}>
                <defs>
                    <linearGradient id="gridGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="transparent" stopOpacity="0" />
                        <stop offset="30%" stopColor={NEON_GRID_H} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={NEON_GRID_H} stopOpacity="1" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width={width} height={height - cy} fill="#050011" />

                {/* Horizontal Perspective Lines (Scrolling) */}
                {Array.from({ length: 25 }).map((_, i) => {
                    // Normalize time + loop
                    const normalizedTime = ((scrollOffset * 0.05 + i * 4) % 100) / 100;
                    // Exponential curve creates 3D depth towards horizon
                    const y = Math.pow(normalizedTime, 3) * (height - cy);
                    const lineOp = Math.min(1, Math.pow(normalizedTime, 1.5) * 1.5 + bass * 0.5);
                    const sw = Math.max(1, 4 * normalizedTime);

                    // Flash cyan on bass drops intermittently
                    const lColor = (bass > 0.7 && i % 3 === 0) ? NEON_GRID_V : NEON_GRID_H;

                    // Only render lines visibly below the horizon
                    if (y < 2) return null;
                    return (
                        <line key={`h-${i}`} x1="0" y1={y} x2={width} y2={y} stroke={lColor} strokeWidth={sw} opacity={lineOp} style={{ filter: 'drop-shadow(0 0 5px magenta)' }} />
                    );
                })}

                {/* Vertical Radiating Lines */}
                {Array.from({ length: 31 }).map((_, i) => {
                    // Spread coordinates exponentially to create wide 3D base
                    const spreadScale = Math.pow(Math.abs(i - 15) / 15, 1.5) * Math.sign(i - 15);
                    const xBase = cx + spreadScale * (width * 1.8);

                    return (
                        <line key={`v-${i}`} x1={cx} y1={0} x2={xBase} y2={height - cy} stroke={NEON_GRID_V} strokeWidth={1.5} opacity={0.4 + midR * 0.4} style={{ filter: 'drop-shadow(0 0 4px cyan)' }} />
                    );
                })}

                {/* Center Road Highlight reflecting car taillights */}
                <polygon points={`${cx - 5},0 ${cx + 5},0 ${cx + 250},${height - cy} ${cx - 250},${height - cy}`} fill="#ff0033" opacity={0.15 + bass * 0.15} style={{ filter: 'blur(30px)' }} />
            </svg>

            {/* ── THE SUPERCAR (Detailed Synthwave DeLorean/Countach rear view) ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }} width={width} height={height}>
                <g transform={`translate(${cx + carDriftX}, ${height * 0.75 + carBounce})`}>

                    {/* Ambient Taillight Glow cast on the road */}
                    <ellipse cx="0" cy="180" rx="300" ry="100" fill="#ff0033" opacity={0.3 + bass * 0.5} style={{ filter: 'blur(60px)', transition: 'opacity 0.1s' }} />

                    <g scale="1.61">
                        {/* Shadow block underneath the car */}
                        <path d="M -180 80 L 180 80 L 160 50 L -160 50 Z" fill="#000" opacity="0.8" style={{ filter: 'blur(10px)' }} />

                        {/* --- TIRES & ALLOY WHEELS --- */}
                        {/* Thicc rear tires */}
                        <rect x="-170" y="30" width="70" height="70" rx="10" fill="#050505" stroke="#222" strokeWidth="2" />
                        <rect x="100" y="30" width="70" height="70" rx="10" fill="#050505" stroke="#222" strokeWidth="2" />
                        {/* Tire treads / rotation blur */}
                        <rect x="-160" y="30" width="50" height="70" fill="none" stroke="#222" strokeDasharray={`5 ${20 - bass * 15}`} />
                        <rect x="110" y="30" width="50" height="70" fill="none" stroke="#222" strokeDasharray={`5 ${20 - bass * 15}`} />
                        {/* Inside wheel rims (just barely visible edge) */}
                        <path d="M -160 40 L -160 90" stroke="#555" strokeWidth="2" />
                        <path d="M 160 40 L 160 90" stroke="#555" strokeWidth="2" />

                        {/* --- ENGINE REAR DIFFUSER & TWIN EXHAUSTS --- */}
                        {/* Diffuser base */}
                        <path d="M -120 70 L 120 70 L 110 90 L -110 90 Z" fill="#0a0a0a" stroke="#111" strokeWidth="2" />
                        {/* Diffuser fins */}
                        <line x1="-80" y1="70" x2="-75" y2="90" stroke="#222" strokeWidth="3" />
                        <line x1="-30" y1="70" x2="-28" y2="90" stroke="#222" strokeWidth="3" />
                        <line x1="30" y1="70" x2="28" y2="90" stroke="#222" strokeWidth="3" />
                        <line x1="80" y1="70" x2="75" y2="90" stroke="#222" strokeWidth="3" />

                        {/* Exhaust Pipes (Chrome-tipped) */}
                        <rect x="-115" y="72" width="25" height="12" rx="4" fill="#000" stroke="#888" strokeWidth="2" />
                        <rect x="-85" y="72" width="25" height="12" rx="4" fill="#000" stroke="#888" strokeWidth="2" />

                        <rect x="90" y="72" width="25" height="12" rx="4" fill="#000" stroke="#888" strokeWidth="2" />
                        <rect x="60" y="72" width="25" height="12" rx="4" fill="#000" stroke="#888" strokeWidth="2" />

                        {/* --- NITRO FLAMES (Audio Reactive!) --- */}
                        {/* Left flames */}
                        <g transform={`translate(-100, 80) scale(${0.5 + bass * 1.5}, ${1 + bass * 3})`}>
                            <path d="M 0 0 C -15 20, -10 60, 0 80 C 10 60, 15 20, 0 0" fill="#00ffff" opacity={0.8} style={{ filter: 'blur(3px)' }} />
                            <path d="M 0 0 C -8 15, -5 40, 0 50 C 5 40, 8 15, 0 0" fill="#ffffff" />
                        </g>
                        {/* Right flames */}
                        <g transform={`translate(100, 80) scale(${0.5 + bass * 1.5}, ${1 + bass * 3})`}>
                            <path d="M 0 0 C -15 20, -10 60, 0 80 C 10 60, 15 20, 0 0" fill="#ff00ff" opacity={0.8} style={{ filter: 'blur(3px)' }} />
                            <path d="M 0 0 C -8 15, -5 40, 0 50 C 5 40, 8 15, 0 0" fill="#ffffff" />
                        </g>

                        {/* --- MAIN CAR BODY WIDEBODY KIT --- */}
                        {/* Flared Wheel Arches */}
                        <path d="M -180 30 Q -180 20 -150 20 L -150 40 L -180 40 Z" fill="#181818" />
                        <path d="M 180 30 Q 180 20 150 20 L 150 40 L 180 40 Z" fill="#181818" />

                        {/* Lower Bumper */}
                        <path d="M -155 40 L 155 40 L 140 70 L -140 70 Z" fill="#161616" stroke="#222" strokeWidth="1" />

                        {/* Mid Body Chassis (Tail light housing base) */}
                        <path d="M -175 -5 L 175 -5 L 150 40 L -150 40 Z" fill="#202020" />
                        {/* License plate indent */}
                        <path d="M -45 40 L 45 40 L 40 70 L -40 70 Z" fill="#0d0d0d" />

                        {/* Angular Side Mirrors (Countach style) */}
                        <polygon points="-135,-35 -155,-40 -150,-25 -125,-20" fill="#111" />
                        <polygon points="135,-35 155,-40 150,-25 125,-20" fill="#111" />

                        {/* Rear Engine Cover / Hood Base */}
                        <path d="M -130 -45 L 130 -45 L 170 -5 L -170 -5 Z" fill="#141414" stroke="#333" strokeWidth="1" />

                        {/* Roofline (Adds massive depth) */}
                        <path d="M -80 -80 L 80 -80 L 110 -45 L -110 -45 Z" fill="#0a0a0a" stroke="#222" strokeWidth="1" />

                        {/* Classic 80s Rear Window Louvers (Detailed steps) */}
                        <g transform="translate(0, -6)">
                            {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                <path key={`lvr-${idx}`} d={`M ${-100 - idx * 4} ${-35 + idx * 5.5} L ${100 + idx * 4} ${-35 + idx * 5.5} L ${104 + idx * 4} ${-32 + idx * 5.5} L ${-104 - idx * 4} ${-32 + idx * 5.5} Z`} fill="#080808" stroke="#1a1a1a" strokeWidth="0.5" />
                            ))}
                        </g>

                        {/* Detailed Sunset Window Reflections */}
                        <polygon points="-70,-25 -40,-25 -60,-5 -90,-5" fill="url(#sunGrad)" opacity="0.6" />
                        <polygon points="-30,-25 -10,-25 -30,-5 -50,-5" fill="url(#sunGrad)" opacity="0.6" />
                        <polygon points="50,-25 30,-25 10,-5 30,-5" fill="url(#sunGrad)" opacity="0.6" />
                        <polygon points="90,-25 60,-25 40,-5 70,-5" fill="url(#sunGrad)" opacity="0.6" />

                        {/* --- REAR SPOILER (Bigger, sharper) --- */}
                        {/* Aero struts */}
                        <polygon points="-145,-5 -135,-5 -160,-65 -170,-65" fill="#111" />
                        <polygon points="145,-5 135,-5 160,-65 170,-65" fill="#111" />
                        {/* Massive Main Wing */}
                        <path d="M -190 -65 L 190 -65 L 175 -50 L -175 -50 Z" fill="#222" stroke="#333" strokeWidth="1" />
                        <line x1="-185" y1="-65" x2="185" y2="-65" stroke="#ff00ff" strokeWidth="3" opacity="0.8" />
                        {/* Spoiler Endplates */}
                        <polygon points="-190,-75 -190,-45 -175,-50 -175,-70" fill="#181818" />
                        <polygon points="190,-75 190,-45 175,-50 175,-70" fill="#181818" />

                        {/* --- NEON TAILLIGHTS (Cyberpunk Housing) --- */}
                        {/* Black housing */}
                        <rect x="-160" y="5" width="320" height="30" rx="4" fill="#050505" stroke="#333" strokeWidth="1" />

                        {/* Inner glowing grids */}
                        <rect x="-155" y="8" width="100" height="24" fill="#aa0022" />
                        <rect x="-150" y="11" width="90" height="18" fill={bass > 0.5 ? '#ff5577' : '#ff0033'} style={{ transition: 'fill 0.05s' }} />
                        <rect x="-145" y="16" width="80" height="8" fill={bass > 0.6 ? '#ffffff' : '#ff99aa'} style={{ transition: 'fill 0.05s' }} />

                        <rect x="55" y="8" width="100" height="24" fill="#aa0022" />
                        <rect x="60" y="11" width="90" height="18" fill={bass > 0.5 ? '#ff5577' : '#ff0033'} style={{ transition: 'fill 0.05s' }} />
                        <rect x="65" y="16" width="80" height="8" fill={bass > 0.6 ? '#ffffff' : '#ff99aa'} style={{ transition: 'fill 0.05s' }} />

                        {/* Center reflector strip */}
                        <rect x="-45" y="15" width="90" height="10" fill="#550011" />

                        {/* Massive Bloom from taillights */}
                        <rect x="-160" y="5" width="320" height="30" fill="#ff0033" opacity={0.6 + bass * 0.4} style={{ filter: `drop-shadow(0 0 ${40 + bass * 80}px #ff0044)`, transition: 'opacity 0.1s, filter 0.1s' }} />

                        {/* Cyber License Plate with bevel */}
                        <rect x="-38" y="45" width="76" height="30" fill="#886600" />
                        <rect x="-35" y="48" width="70" height="24" fill="#ffcc00" />
                        <rect x="-32" y="50" width="64" height="20" fill="#111" />
                        <text x="0" y="65" fill="#00ffff" fontSize="15" fontFamily="monospace" fontWeight="bold" textAnchor="middle" style={{ filter: `drop-shadow(0 0 ${5 + bass * 5}px cyan)` }}>OUTRUN</text>

                    </g>
                </g>
            </svg>

            {/* ── VHS OVERLAY (Scanlines + Screen Glare) ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={width} height={height}>
                {/* Thin scanlines */}
                <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="4" y2="0" stroke="#000" strokeWidth="1" opacity="0.25" />
                    <line x1="0" y1="2" x2="4" y2="2" stroke="#fff" strokeWidth="1" opacity="0.03" />
                </pattern>
                <rect width={width} height={height} fill="url(#scanlines)" />

                {/* Rolling VHS Noise Band (slowly moves down) */}
                <rect x="0" y={(t * 5 + 200) % (height + 200) - 200} width={width} height="40" fill="#fff" opacity="0.03" style={{ filter: 'blur(2px)' }} />

                {/* Edge Vignette / Vignetting shadow to focus center */}
                <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="transparent" stopOpacity="0" />
                    <stop offset="100%" stopColor="#0a001a" stopOpacity="0.8" />
                </radialGradient>
                <rect width={width} height={height} fill="url(#vignette)" />
                <rect width={width} height={height} fill="none" stroke="#220044" strokeWidth="20" opacity="0.3" />
            </svg>

        </AbsoluteFill>
    );
};
