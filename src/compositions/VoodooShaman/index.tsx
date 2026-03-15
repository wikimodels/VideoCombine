import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

export const VoodooShaman: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    // ── SCENE CONSTANTS ──
    const cx = width / 2;
    const FLOOR = Math.round(height * 0.925); // Lowered from 0.85 (halved bottom gap)

    // ── COLORS (Moved up for useMemo/Global use) ──
    const FLAME_COLOR_1 = '#ff2200'; // Hellfire Red
    const FLAME_COLOR_2 = '#ff8800'; // Magic Orange

    // ── CONFIG ──
    const TOP_ZONE_PERCENT = 0.2; // Increased to 20%
    const TOP_ZONE_HEIGHT = height * TOP_ZONE_PERCENT;

    // ── RITUAL STICKS (Rotating in top zone) ──
    // Grid-based jitter distribution for a more 'harmonious' look
    const sticks = useMemo(() => {
        const columns = 9;
        const rows = 2;
        const _sticks: any[] = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                const cellW = width / columns;
                const cellH = TOP_ZONE_HEIGHT / rows;

                _sticks.push({
                    id: r * columns + c,
                    x: cellW * c + cellW / 2 + (Math.random() - 0.5) * cellW * 0.7,
                    y: cellH * r + cellH / 2 + (Math.random() - 0.5) * cellH * 0.7,
                    len: 45 + Math.random() * 65,
                    speed: 0.1 + Math.random() * 0.3,
                    rotationDir: Math.random() > 0.5 ? 1 : -1,
                    offset: Math.random() * Math.PI * 2,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)` // Sync with skulls palette
                });
            }
        }
        return _sticks;
    }, [width, TOP_ZONE_HEIGHT]);

    // ── RITUAL EMBERS (Flying sparks from fire) ──
    const embers = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            x: Math.random() * width,
            yBase: FLOOR,
            speed: 1 + Math.random() * 3,
            drift: (Math.random() - 0.5) * 100,
            size: 2 + Math.random() * 4,
            offset: Math.random() * 1000,
        }));
    }, [width, FLOOR]);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#02000a' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1]) / 2 * 4, 1);
    const midL = Math.min((viz[2] + viz[3]) / 2 * 4, 1);
    const high = Math.min((viz[8] + viz[10] + viz[12]) / 3 * 6, 1);

    const t = frame;

    // ── MORE COLORS ──
    const BG_DARK = '#080510';
    const MASK_WOOD = '#ffddaa'; // Bright Bone Skull color
    const CLOAK = '#aa0015'; // Bright Blood Red Cloak

    // ── SHAMAN BODY ──
    const shX = cx;
    const shY = FLOOR - 320; // Lifted even higher to clear the floor/fire
    // Bobs up and down subtly
    const shDy = Math.sin(t * 0.1) * 10 - bass * 30;

    // Head rotation
    const headRot = Math.sin(t * 0.2) * 5 + bass * 15;

    // Arms
    // Left holding a staff that rises with bass (raised by ~50% from prior position)
    const staffY = shY + shDy - 250 - Math.pow(bass, 1.5) * 80;
    // Right shaking a rattle on high/mids
    const shakeR = Math.sin(t * 1.5) * (10 + high * 40);

    // ── FIRE EQ POLYGONS ──
    // Create a dynamic, jagged wave peaking in the center, wrapped around the shaman.
    // We will render three layers of fire.
    const createFirePath = (offset: number, scale: number, layerBass: number) => {
        let d = `M 0,${FLOOR} `;
        for (let i = 0; i <= 64; i++) {
            const x = (width / 64) * i;
            // Mirror visualizer 0-31, 31-0
            const vIdx = i < 32 ? i : 63 - i;
            const amp = Math.min((viz[vIdx] ?? 0) * 4, 1);

            // Add some noise and make the center taller wrapping around the shaman
            const centerDist = Math.abs(32 - i) / 32; // 0 at center, 1 at edges
            const fireHeight = (100 + amp * 900 * layerBass * (1.2 - centerDist)) * scale;

            // Use vIdx for completely symmetric noise!
            const noise = Math.sin(t * 0.2 + vIdx * offset) * 50 * scale;
            const y = FLOOR - fireHeight + noise;

            d += `L ${x},${y} `;
        }
        d += `L ${width},${FLOOR} Z`;
        return d;
    };

    // ── MAGIC CIRCLE (Floor) ──
    const circleScale = 1 + bass * 0.1;

    // ── FLOATING NEON SKULLS ──
    // Generate a list of skulls that rise from the fire. 
    // We use a fixed array of e.g. 15 skulls, iterating their lifecycle based on frame `t`.
    const skullCount = 15;
    const skulls = Array.from({ length: skullCount }).map((_, i) => {
        const speed = 2 + (i % 3);
        const cycle = (t * speed + i * (1000 / skullCount)) % 1000;
        const progress = cycle / 1000; // 0 to 1
        // Randomize horizontal drift
        const dx = Math.sin(t * 0.02 + i) * 200 * progress;
        // Float up from the floor
        const sy = FLOOR - progress * 1200;
        const sx = cx + (i % 2 === 0 ? 1 : -1) * (50 + i * 20) + dx;

        // Size grows then shrinks, opacity fades out
        const sc = Math.sin(progress * Math.PI) * (0.5 + (i % 3) * 0.3);
        const op = Math.max(0, Math.sin(progress * Math.PI)) * (0.4 + (i % 2) * 0.4);

        const color = `hsl(${(i / skullCount) * 360}, 100%, 50%)`;

        return { sx, sy, sc, op, id: i, phase: (t * 0.1 + i), color };
    });


    return (
        <AbsoluteFill style={{ backgroundColor: BG_DARK, overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                <defs>
                    <radialGradient id="fireGlow" cx="50%" cy="100%" r="100%">
                        <stop offset="0%" stopColor={FLAME_COLOR_2} stopOpacity="0.4" />
                        <stop offset="50%" stopColor={FLAME_COLOR_1} stopOpacity="0.1" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="circleGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={FLAME_COLOR_1} stopOpacity="0.3" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                    {/* Reusable Voodoo Skull Symbol */}
                    <g id="voodooSkull">
                        {/* Skull Core */}
                        <path d="M -30 -20 C -30 -60, 30 -60, 30 -20 L 25 20 L 15 20 L 15 30 L -15 30 L -15 20 L -25 20 Z" fill="currentColor" />
                        {/* Eyes */}
                        <circle cx="-12" cy="-15" r="8" fill={BG_DARK} />
                        <circle cx="12" cy="-15" r="8" fill={BG_DARK} />
                        {/* Nose slits */}
                        <line x1="-3" y1="0" x2="-5" y2="10" stroke={BG_DARK} strokeWidth="2" strokeLinecap="round" />
                        <line x1="3" y1="0" x2="5" y2="10" stroke={BG_DARK} strokeWidth="2" strokeLinecap="round" />
                        {/* Stitched Mouth */}
                        <line x1="-15" y1="20" x2="15" y2="20" stroke={BG_DARK} strokeWidth="2" />
                        <line x1="-10" y1="15" x2="-10" y2="25" stroke={BG_DARK} strokeWidth="2" />
                        <line x1="0" y1="15" x2="0" y2="25" stroke={BG_DARK} strokeWidth="2" />
                        <line x1="10" y1="15" x2="10" y2="25" stroke={BG_DARK} strokeWidth="2" />
                        <circle cx="0" cy="0" r="40" fill="currentColor" opacity="0.3" style={{ filter: 'blur(10px)' }} />
                    </g>
                </defs>

                {/* ── BACKGROUND GLOW & MYSTICAL SMOKE ── */}
                <rect x="0" y="0" width={width} height={height} fill="url(#fireGlow)" />

                {/* Floating Mystical Smoke */}
                <g opacity={0.2 + bass * 0.1}>
                    <circle cx={width * 0.3 + Math.sin(t * 0.01) * 200} cy={height * 0.2} r="300" fill={FLAME_COLOR_1} style={{ filter: 'blur(100px)' }} opacity="0.3" />
                    <circle cx={width * 0.7 + Math.cos(t * 0.012) * 200} cy={height * 0.25} r="350" fill={FLAME_COLOR_2} style={{ filter: 'blur(120px)' }} opacity="0.2" />
                    <circle cx={width * 0.5 + Math.sin(t * 0.008) * 100} cy={height * 0.15} r="250" fill="#4400ff" style={{ filter: 'blur(110px)' }} opacity="0.2" />
                </g>

                {/* ── RITUAL STICKS (Rotating in Top Zone) ── */}
                <g>
                    {sticks.map((stick) => {
                        const rot = t * 0.02 * stick.speed * stick.rotationDir + stick.offset;
                        return (
                            <g key={stick.id} transform={`translate(${stick.x}, ${stick.y}) rotate(${rot * 180 / Math.PI})`}>
                                {/* The Stick - Thickness increased further (to 6) for better visibility */}
                                <rect x={-stick.len / 2} y="-3" width={stick.len} height="6" rx="3" fill={stick.color} opacity={0.4 + bass * 0.4} />
                                {/* Glowing tips */}
                                <circle cx={-stick.len / 2} cy="0" r="4" fill="#fff" opacity={0.7} />
                                <circle cx={stick.len / 2} cy="0" r="4" fill="#fff" opacity={0.7} />
                                <circle cx="0" cy="0" r={stick.len / 2} fill={stick.color} opacity={0.15 * bass} style={{ filter: 'blur(12px)' }} />
                            </g>
                        );
                    })}
                </g>

                {/* ── TOTEM POLES (Parallax Background) ── */}
                <g opacity="0.15">
                    {[-1, 1].map((dir, i) => (
                        <g key={i} transform={`translate(${cx + dir * 400}, ${FLOOR - 400})`}>
                            <rect x="-40" y="-300" width="80" height="800" fill="#111" />
                            {/* Simple Totem Face Shapes */}
                            <circle cx="0" cy="-200" r="60" fill="#222" stroke={FLAME_COLOR_2} strokeWidth="4" />
                            <circle cx="-20" cy="-220" r="10" fill={FLAME_COLOR_1} />
                            <circle cx="20" cy="-220" r="10" fill={FLAME_COLOR_1} />
                            <path d="M -30 -180 L 30 -180 L 0 -130 Z" fill="#111" />

                            <circle cx="0" cy="0" r="60" fill="#222" stroke={FLAME_COLOR_2} strokeWidth="4" />
                            <path d="M -20 -20 L 20 -20" stroke={FLAME_COLOR_1} strokeWidth="6" />
                            <path d="M -40 20 L 40 20 L 0 60 Z" fill="#111" />
                        </g>
                    ))}
                </g>

                {/* ── MAGIC CIRCLE FLOOR ── */}
                <g transform={`translate(${cx}, ${FLOOR}) scale(1, 0.25)`}>
                    <circle cx="0" cy="0" r="600" fill="url(#circleGlow)" />
                    <g transform={`rotate(${t * 0.5}) scale(${circleScale})`}>
                        <circle cx="0" cy="0" r="500" fill="none" stroke={FLAME_COLOR_2} strokeWidth="4" opacity="0.5" strokeDasharray="20 40" />
                        <circle cx="0" cy="0" r="450" fill="none" stroke={FLAME_COLOR_1} strokeWidth="6" opacity="0.8" />
                        <polygon points="0,-450 389,225 -389,225" fill="none" stroke={FLAME_COLOR_1} strokeWidth="4" opacity="0.6" />
                        <polygon points="0,450 389,-225 -389,-225" fill="none" stroke={FLAME_COLOR_1} strokeWidth="4" opacity="0.6" />
                        {/* Runes / Inner rings */}
                        <circle cx="0" cy="0" r="200" fill="none" stroke={FLAME_COLOR_2} strokeWidth="10" strokeDasharray="50 100" opacity={0.6} />
                    </g>
                </g>

                {/* ── FLOATING SPIRIT SKULLS ── */}
                {skulls.map((skull) => (
                    skull.op > 0.01 && (
                        <g key={skull.id} transform={`translate(${skull.sx}, ${skull.sy}) scale(${skull.sc})`} opacity={skull.op} color={skull.color}>
                            <use href="#voodooSkull" />
                            {/* Trailing wisp */}
                            <path d={`M 0 30 Q ${Math.sin(skull.phase) * 40} 100 0 150`} stroke="currentColor" strokeWidth="4" fill="none" opacity="0.5" style={{ filter: 'blur(2px)' }} />
                        </g>
                    )
                ))}

                {/* ── FIRE EQ WAVES (Behind Shaman) ── */}
                {/* Layer 1 - Deep Purple, tallest, slow noise */}
                <path d={createFirePath(1, 1.2, bass * 0.8 + 0.2)} fill={FLAME_COLOR_2} opacity="0.4" style={{ filter: 'blur(20px)' }} />
                {/* Layer 2 - Dark Green, mid height, medium noise */}
                <path d={createFirePath(3, 0.9, bass + 0.3)} fill="#005511" opacity="0.6" style={{ filter: 'blur(10px)' }} />

                {/* ── FLYING EMBERS (Middle Layer for Depth) ── */}
                <g>
                    {embers.map((ember) => {
                        const life = (t * ember.speed + ember.offset) % 1000;
                        const progress = life / 1000;
                        const ex = ember.x + Math.sin(t * 0.05 + ember.id) * 50 + ember.drift * progress;
                        const ey = FLOOR - progress * 1300;
                        const eScale = Math.sin(progress * Math.PI) * (1 + high * 2);
                        const eColor = progress < 0.3 ? '#fff' : FLAME_COLOR_2;

                        return (
                            <circle
                                key={ember.id}
                                cx={ex}
                                cy={ey}
                                r={ember.size * eScale}
                                fill={eColor}
                                opacity={Math.sin(progress * Math.PI) * (0.6 + high * 0.4)}
                                style={{ filter: `blur(${1 + high * 3}px)` }}
                            />
                        );
                    })}
                </g>

                {/* ── VOODOO SHAMAN CHARACTER ── */}
                <g transform={`translate(${shX}, ${shY + shDy}) translate(0, 150) scale(2.1) translate(0, -150)`}>

                    {/* Shadow on floor */}
                    <ellipse cx="0" cy="150" rx={150 + bass * 30} ry="20" fill="#000" opacity="0.6" />

                    {/* Back Cloak - Lengthened to reach floor */}
                    <path d="M -160 215 C -120 0, 120 0, 160 215 Z" fill="#500008" />

                    {/* Left Arm holding Staff - UP (Cactus pose) */}
                    <g transform={`translate(-100, -80)`}>
                        {/* Arm UP */}
                        <path d="M 0 0 C -40 -40, -80 -40, -80 -120" stroke={CLOAK} strokeWidth="40" fill="none" strokeLinecap="round" />
                        {/* Staff */}
                        <line x1="-80" y1="200" x2="-80" y2={staffY - (shY + shDy)} stroke={MASK_WOOD} strokeWidth="12" />
                        {/* Skull on staff */}
                        <g transform={`translate(-80, ${staffY - (shY + shDy)}) scale(1.5)`} color={FLAME_COLOR_2}>
                            <use href="#voodooSkull" />
                            {/* Extreme glow on strong bass */}
                            <circle cx="0" cy="0" r={40 + bass * 40} fill="currentColor" opacity={bass * 0.8} style={{ filter: 'blur(15px)', mixBlendMode: 'screen' }} />
                        </g>
                        {/* Hand */}
                        <circle cx="-80" cy="-120" r="15" fill={CLOAK} />
                    </g>

                    {/* Right Arm shaking Rattle - UP (Cactus pose) */}
                    <g transform={`translate(100, -80)`}>
                        {/* Arm UP */}
                        <path d="M 0 0 C 40 -40, 80 -40, 80 -120" stroke={CLOAK} strokeWidth="40" fill="none" strokeLinecap="round" />
                        {/* Rattle shaking - Lengthened handle BELOW hand, but restored length ABOVE hand */}
                        <g transform={`translate(80, -120) rotate(${shakeR})`}>
                            {/* Stick: y1 is below the hand (lengthened), y2 is above (restored) */}
                            <line x1="0" y1="40" x2="0" y2="-80" stroke={MASK_WOOD} strokeWidth="10" />
                            {/* Gourd moved back to original distance - Added independent pulse */}
                            {(() => {
                                const rattlePulse = 1 + Math.sin(t * 0.15) * 0.08;
                                return (
                                    <g transform={`scale(${rattlePulse})`}>
                                        <circle cx="0" cy={-80 / rattlePulse} r="25" fill="#8b5a2b" />
                                        <circle cx="0" cy={-80 / rattlePulse} r="25" fill={FLAME_COLOR_2} opacity={0.3 + high * 0.5} style={{ filter: 'blur(5px)' }} />
                                    </g>
                                );
                            })()}
                        </g>
                        {/* Hand */}
                        <circle cx="80" cy="-120" r="15" fill={CLOAK} />
                    </g>

                    {/* Main Cloak Body - Lengthened to reach floor */}
                    <path d="M -120 215 C -90 -60, 90 -60, 120 215 C 60 225, -60 225, -120 215 Z" fill={CLOAK} />

                    {/* Character Hood */}
                    <path d="M -60 -180 C -100 -180, -90 -30, -50 20 C 0 50, 0 50, 50 20 C 90 -30, 100 -180, 60 -180 C 30 -220, -30 -220, -60 -180 Z" fill="#050000" />
                    <path d="M -60 -180 C -100 -180, -90 -30, -50 20 C 0 50, 0 50, 50 20 C 90 -30, 100 -180, 60 -180 C 30 -220, -30 -220, -60 -180 Z" stroke={CLOAK} strokeWidth="20" fill="none" opacity="0.9" />

                    {/* Head / Voodoo Mask */}
                    <g transform={`translate(0, -90) rotate(${headRot})`}>

                        {/* UPPER MASK BASE (Fixed) */}
                        <path d="M -50 -40 Q 0 -80 50 -40 L 42 25 L -42 25 Z" fill={MASK_WOOD} />
                        <path d="M -40 -35 Q 0 -70 40 -35 L 33 25 L -33 25 Z" fill="#cca37a" />

                        {/* Glowing Eyes */}
                        {/* Large eye sockets */}
                        <polygon points="-35,-15 -10,-5 -20,10" fill="#000" />
                        <polygon points="35,-15 10,-5 20,10" fill="#000" />
                        {/* Bright glowing dots inside sockets, pulsing with high frequencies */}
                        <circle cx="-20" cy="-5" r="5" fill={FLAME_COLOR_1} />
                        <circle cx="-20" cy="-5" r={5 + high * 20} fill={FLAME_COLOR_1} opacity="0.8" style={{ filter: 'blur(10px)' }} />
                        <circle cx="20" cy="-5" r="5" fill={FLAME_COLOR_1} />
                        <circle cx="20" cy="-5" r={5 + high * 20} fill={FLAME_COLOR_1} opacity="0.8" style={{ filter: 'blur(10px)' }} />

                        {/* Ritual markings on forehead */}
                        <path d="M -15 -40 L 0 -25 L 15 -40" stroke={FLAME_COLOR_1} strokeWidth="3" fill="none" opacity={0.5 + midL * 0.5} />

                        {/* Humanoid Stitched Mouth & Lower Jaw - ANIMATED! */}
                        {/* Mouth Opening Void (Behind everything, expands as jaw drops) */}
                        <path d={`M -38 25 L 38 25 L 35 ${25 + bass * 30} L -35 ${25 + bass * 30} Z`} fill="#000" />

                        {/* Vertical stitches (Connecting top and bottom lips directly across the void) */}
                        {[-20, -10, 0, 10, 20].map((x, i) => (
                            <line key={i} x1={x} y1={23} x2={x * 0.9} y2={27 + bass * 30} stroke="#444" strokeWidth="4" />
                        ))}

                        {/* LOWER JAW (Moves down with the bass) */}
                        <g transform={`translate(0, ${bass * 30})`}>
                            {/* Lower Mask Bone */}
                            <path d="M 42 25 L 40 40 Q 0 80 -40 40 L -42 25 Z" fill={MASK_WOOD} />
                            <path d="M 33 25 L 30 35 Q 0 70 -30 35 L -33 25 Z" fill="#cca37a" />

                            {/* Bottom Lip Stitch */}
                            <path d="M -30 25 Q 0 20 30 25" stroke={CLOAK} strokeWidth="5" fill="none" />
                        </g>

                        {/* Top Lip Stitch (Fixed) */}
                        <path d="M -30 25 Q 0 30 30 25" stroke={CLOAK} strokeWidth="5" fill="none" />
                    </g>

                    {/* Toxic Glow cast on the cloak from the fire */}
                    <path d="M -130 100 C -100 -50, 100 -50, 130 100 C 60 110, -60 110, -130 100 Z" fill="url(#fireGlow)" opacity="0.3" style={{ mixBlendMode: 'screen' }} />
                </g>

                {/* ── FIRE EQ WAVES (In Front of Shaman) ── */}
                {/* Layer 3 - Bright Green, sharp spikes, fast noise */}
                <path d={createFirePath(7, 0.6, bass * 1.2)} fill={FLAME_COLOR_1} opacity="0.9" style={{ filter: 'blur(2px)' }} />

            </svg>
        </AbsoluteFill>
    );
};
