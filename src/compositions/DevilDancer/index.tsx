import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

// ── Seeded pseudo-random ────────────────────────────────────────────────────

// ── Flame column: animated bezier flame shape ───────────────────────────────
const FlameCol: React.FC<{
    x: number; baseY: number; h: number; w: number; hue: number; opacity: number;
}> = ({ x, baseY, h, w, hue, opacity }) => {
    const hw = w / 2;
    const cp = h * 0.35;
    const d = [
        `M ${x} ${baseY}`,
        `C ${x - hw} ${baseY - cp} ${x - hw * 0.4} ${baseY - h * 0.75} ${x} ${baseY - h}`,
        `C ${x + hw * 0.4} ${baseY - h * 0.75} ${x + hw} ${baseY - cp} ${x} ${baseY}`,
        'Z',
    ].join(' ');
    return (
        <path d={d} fill={`hsl(${hue},100%,58%)`} opacity={opacity}
            style={{ filter: `blur(${w * 0.18}px)` }} />
    );
};

// ── Glow dot (pitchfork tine tip / horn tip) ────────────────────────────────
const GlowDot: React.FC<{
    cx: number; cy: number; pulse: number; color: string; baseR?: number;
}> = ({ cx, cy, pulse, color, baseR = 10 }) => (
    <>
        <circle cx={cx} cy={cy} r={baseR + pulse * 48} fill={color}
            opacity={0.18 + pulse * 0.45} style={{ filter: 'blur(8px)' }} />
        <circle cx={cx} cy={cy} r={baseR + pulse * 22} fill={color}
            opacity={0.7 + pulse * 0.3}
            style={{ filter: `drop-shadow(0 0 ${10 + pulse * 38}px ${color})` }} />
        <circle cx={cx} cy={cy} r={baseR * 0.6 + pulse * 8} fill="white"
            opacity={0.3 + pulse * 0.75} />
    </>
);

// ── Main composition ─────────────────────────────────────────────────────────
export const DevilDancer: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#0a0000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = Math.min((viz[0] + viz[1] + viz[2]) / 3 * 3, 1);
    const mid = Math.min((viz[5] + viz[6] + viz[7]) / 3 * 3, 1);
    const high = Math.min((viz[16] + viz[17] + viz[18]) / 3 * 4, 1); // used in eye glow
    const volume = bass;
    const isBeat = bass > 0.3;

    const cx = width / 2;
    const FLOOR = Math.round(height * 0.80);

    // ── ANIMATION VALUES ──────────────────────────────────────────────────────
    const t = frame;

    // Body bounce on beat
    const bodyDy = -Math.abs(Math.sin(t * 0.19)) * (8 + bass * 44);

    // Head wobble
    const headRot = Math.sin(t * 0.13 + 1) * (6 + mid * 28);

    // ── ARMS (W-Shape / Cactus Pose) ──
    // The arm SVG groups are drawn pointing straight DOWN (+y).
    // To reliably raise them, we add 180° to point UP (-y).

    const raiseLeft = Math.sin(t * 0.1) > 0;
    const beatStrL = raiseLeft ? bass : bass * 0.2;

    // LEFT ARM
    // Base pointing straight up (180) minus 45 to lean left. 
    // Forearm bends back inwards 90.
    const uArmL = 180 - 45 - beatStrL * 30; // 135° -> 105° on beat (points more vertical)
    const fArmL = 90 - beatStrL * 90; // 90° inward bend -> 0° straight on beat

    // RIGHT ARM
    // Base pointing straight up (-180) plus 45 to lean right.
    // Forearm bends back inwards -90.
    const raiseRight = !raiseLeft;
    const beatStrR = raiseRight ? bass : bass * 0.2;
    const uArmR = -180 + 45 + beatStrR * 30; // -135° -> -105° on beat
    const fArmR = -90 + beatStrR * 90; // -90° inward bend -> 0° straight on beat

    // Legs: stomp driven by bass
    const stepL = Math.sin(t * 0.20) * (14 + bass * 40);
    const kneeL = -Math.abs(Math.cos(t * 0.20)) * (8 + bass * 32);
    const stepR = -Math.sin(t * 0.20) * (14 + bass * 40);
    const kneeR = Math.abs(Math.cos(t * 0.20)) * (8 + bass * 32);

    // Synced glow pulse — horns + pitchfork tines + tail tip all fire together
    const pulseSync = Math.min(bass * 2.2 + mid * 0.7 + high * 0.5, 1);

    // Tail sway
    const tailSway = Math.sin(t * 0.12) * 18;

    // Body center position
    const bodyCx = cx;
    const bodyCy = FLOOR - 240; // approximate center

    // Character dimensions
    const BODY_RX = 140; const BODY_RY = 130;
    const HEAD_R = 98;
    const ARM_U = 56; const ARM_F = 50;
    const LEG_U = 68; const LEG_L = 58;


    // Colors
    const RED = '#cc1100';
    const DRED = '#880800';
    const EYE = '#ffee00';
    const HORN = '#ff4400';

    // ── FIRE BACKGROUND ───────────────────────────────────────────────────────
    const FIRE_COLS = 24;
    const fireColW = width / FIRE_COLS;

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <AbsoluteFill style={{ backgroundColor: '#090000', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── HELLISH BG GRADIENT ── */}
            <AbsoluteFill style={{
                background: `radial-gradient(ellipse at 50% 80%,
          rgba(180,20,0,${0.35 + volume * 0.25}) 0%,
          rgba(80,0,0,0.8) 50%,
          rgba(5,0,0,1) 80%)`,
            }} />

            {/* ── FIRE WALL BEHIND CHARACTER ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                {Array.from({ length: FIRE_COLS }, (_, i) => {
                    const amp = Math.min((viz[i * 2 % 32] ?? 0) * 4, 1);
                    const timeOff = Math.sin(t * 0.04 + i * 0.7) * 0.3;
                    const flameH = (100 + amp * 650 + timeOff * 80) * (0.6 + bass * 0.55);
                    const fcx = i * fireColW + fireColW / 2;
                    const hue1 = 15 + amp * 20;  // orange-red
                    const hue2 = 35 + amp * 15;  // yellow-orange
                    return (
                        <g key={i}>
                            {/* Back flame (wider, darker) */}
                            <FlameCol x={fcx} baseY={FLOOR} h={flameH * 1.3} w={fireColW * 1.6}
                                hue={hue1 - 10} opacity={0.35 + amp * 0.3} />
                            {/* Main flame */}
                            <FlameCol x={fcx} baseY={FLOOR} h={flameH} w={fireColW * 1.1}
                                hue={hue2} opacity={0.6 + amp * 0.35} />
                        </g>
                    );
                })}

                {/* Flame floor glow */}
                <ellipse cx={cx} cy={FLOOR} rx={width * 0.6} ry={60 + bass * 40}
                    fill={`rgba(255,80,0,${0.25 + volume * 0.3})`}
                    style={{ filter: 'blur(20px)' }} />
            </svg>

            {/* ── CHARACTER SVG ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>

                {/* FLOOR SHADOW */}
                <ellipse cx={bodyCx} cy={FLOOR + 10} rx={120 + bass * 30} ry={18}
                    fill="rgba(0,0,0,0.55)" style={{ filter: 'blur(8px)' }} />

                {/* ── TAIL — bright orange, right side, curls UP ── */}
                {(() => {
                    // Start at the body (bottom right)
                    const tx0 = bodyCx + BODY_RX - 20;
                    const ty0 = bodyCy + 50;

                    // Control point: pushed far right and down to create the under-curve of the U-shape
                    const tx1 = bodyCx + BODY_RX + 120 + tailSway;
                    const ty1 = bodyCy + 180;

                    // End of the tail curve: pointing back UP and slightly right
                    const tx2 = bodyCx + BODY_RX + 150 + tailSway * 0.8;
                    const ty2 = bodyCy + 60; // Much higher Y coordinate (upwards)

                    // The actual arrowhead tip (positioned slightly beyond the curve end)
                    const tipX = tx2 + 10 + tailSway * 0.5;
                    const tipY = ty2 - 20; // Even higher for the tip

                    return (
                        <>
                            {/* Outline for contrast */}
                            <path d={`M ${tx0} ${ty0} Q ${tx1} ${ty1} ${tx2} ${ty2}`}
                                stroke="#330000" strokeWidth={30} fill="none" strokeLinecap="round" />
                            {/* Main tail */}
                            <path d={`M ${tx0} ${ty0} Q ${tx1} ${ty1} ${tx2} ${ty2}`}
                                stroke="#ff5500" strokeWidth={20} fill="none" strokeLinecap="round" />
                            {/* Bright center line */}
                            <path d={`M ${tx0} ${ty0} Q ${tx1} ${ty1} ${tx2} ${ty2}`}
                                stroke="#ffaa00" strokeWidth={7} fill="none" strokeLinecap="round"
                                opacity={0.7} />

                            {/* Arrowhead tip (pointing UP-RIGHT) */}
                            <g transform={`translate(${tipX}, ${tipY}) rotate(30)`}>
                                <polygon
                                    points="0,-25 20,15 -20,15"
                                    fill="#ff5500"
                                    stroke="#330000" strokeWidth={4} />
                                {/* Tail tip glow (synced!) */}
                                <GlowDot cx={0} cy={-5} pulse={pulseSync} color="#ff6600" baseR={9} />
                            </g>
                        </>
                    );
                })()}

                {/* ── Whole character group with body bounce ── */}
                <g transform={`translate(0, ${bodyDy})`}>

                    {/* ── LEGS ── */}
                    {/* Left leg */}
                    <g transform={`translate(${bodyCx - 55}, ${bodyCy + BODY_RY - 10})`}>
                        <g transform={`rotate(${stepL})`}>
                            <rect x="-20" y="0" width="40" height={LEG_U} rx="16"
                                fill={RED} />
                            <g transform={`translate(0, ${LEG_U})`}>
                                <g transform={`rotate(${kneeL})`}>
                                    <rect x="-18" y="0" width="36" height={LEG_L} rx="14"
                                        fill={RED} />
                                    {/* Hoof */}
                                    <ellipse cx="-8" cy={LEG_L + 12} rx="26" ry="16" fill={DRED} />
                                </g>
                            </g>
                        </g>
                    </g>
                    {/* Right leg */}
                    <g transform={`translate(${bodyCx + 55}, ${bodyCy + BODY_RY - 10})`}>
                        <g transform={`rotate(${stepR})`}>
                            <rect x="-20" y="0" width="40" height={LEG_U} rx="16"
                                fill={RED} />
                            <g transform={`translate(0, ${LEG_U})`}>
                                <g transform={`rotate(${kneeR})`}>
                                    <rect x="-18" y="0" width="36" height={LEG_L} rx="14"
                                        fill={RED} />
                                    <ellipse cx="8" cy={LEG_L + 12} rx="26" ry="16" fill={DRED} />
                                </g>
                            </g>
                        </g>
                    </g>

                    {/* ── LEFT ARM with PITCHFORK (always raised upper-left) ── */}
                    <g transform={`translate(${bodyCx - BODY_RX - 8}, ${bodyCy - BODY_RY * 0.25})`}>
                        <g transform={`rotate(${uArmL})`}>
                            <rect x="-18" y="0" width="36" height={ARM_U} rx="14" fill={RED} />
                            <g transform={`translate(0, ${ARM_U})`}>
                                <g transform={`rotate(${fArmL})`}>
                                    <rect x="-16" y="0" width="32" height={ARM_F} rx="12" fill={RED} />
                                    <ellipse cx="0" cy={ARM_F + 10} rx="18" ry="12" fill={DRED} />
                                    {/* ── PITCHFORK ── */}
                                    <g transform={`translate(0, ${ARM_F - 10})`}>
                                        <g transform="rotate(180)"> {/* Flip to point UP relative to the new hand orientation */}
                                            <rect x="-7" y="-20" width="14" height={200} rx="5"
                                                fill="#5a3000"
                                                style={{ filter: 'drop-shadow(0 0 4px #ff6600)' }} />
                                            <rect x="-60" y="-20" width="120" height="16" rx="6" fill="#5a3000" />
                                            {[-46, 0, 46].map((tx2, ti) => (
                                                <g key={ti} transform={`translate(${tx2}, -20)`}>
                                                    <rect x="-7" y={-120} width="14" height="120" rx="5"
                                                        fill="#3a2000"
                                                        style={{ filter: `drop-shadow(0 0 6px ${HORN})` }} />
                                                    <GlowDot cx={0} cy={-125}
                                                        pulse={pulseSync}
                                                        color={ti === 0 ? '#ff4400' : ti === 1 ? '#ffaa00' : '#ffee44'}
                                                        baseR={8} />
                                                </g>
                                            ))}
                                        </g>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </g>

                    {/* ── BODY (fat, round) ── */}
                    {/* Body glow */}
                    <ellipse cx={bodyCx} cy={bodyCy} rx={BODY_RX + 20} ry={BODY_RY + 20}
                        fill={`rgba(200,10,0,${0.15 + volume * 0.2})`}
                        style={{ filter: 'blur(20px)' }} />
                    {/* Body */}
                    <ellipse cx={bodyCx} cy={bodyCy} rx={BODY_RX} ry={BODY_RY} fill={RED} />
                    {/* Belly highlight */}
                    <ellipse cx={bodyCx} cy={bodyCy + 20} rx={70} ry={64} fill="rgba(255,80,60,0.22)" />
                    {/* Belly button */}
                    <circle cx={bodyCx} cy={bodyCy + 50} r={12} fill={DRED} />

                    {/* ── RIGHT ARM (free — swings + oppa raise) ── */}
                    <g transform={`translate(${bodyCx + BODY_RX + 8}, ${bodyCy - BODY_RY * 0.25})`}>
                        <g transform={`rotate(${uArmR})`}>
                            <rect x="-18" y="0" width="36" height={ARM_U} rx="14" fill={RED} />
                            <g transform={`translate(0, ${ARM_U})`}>
                                <g transform={`rotate(${fArmR})`}>
                                    <rect x="-16" y="0" width="32" height={ARM_F} rx="12" fill={RED} />
                                    <ellipse cx="0" cy={ARM_F + 10} rx="18" ry="12" fill={DRED} />
                                </g>
                            </g>
                        </g>
                    </g>

                    {/* ── HEAD ── */}
                    <g transform={`translate(${bodyCx}, ${bodyCy - BODY_RY - HEAD_R + 10}) rotate(${headRot})`}>

                        {/* Horns — big, bright, with outline for contrast */}
                        {/* Left horn */}
                        <g transform={`translate(-68, ${-HEAD_R + 5})`}>
                            {/* Shadow/outline */}
                            <polygon points="-30,10 30,10 2,-135" fill="rgba(0,0,0,0.6)" />
                            {/* Main horn */}
                            <polygon points="-24,6 24,6 0,-128" fill="#ff5500" />
                            {/* Bright highlight edge */}
                            <polygon points="-8,0 4,0 0,-100" fill="#ffaa44" opacity={0.5} />
                            {/* Glow column */}
                            <ellipse cx="0" cy={-80} rx={16 + pulseSync * 28} ry={38 + pulseSync * 52}
                                fill="#ff4400" opacity={0.28 + pulseSync * 0.58}
                                style={{ filter: 'blur(10px)' }} />
                            <GlowDot cx={0} cy={-122} pulse={pulseSync} color="#ffaa00" baseR={9} />
                        </g>
                        {/* Right horn */}
                        <g transform={`translate(68, ${-HEAD_R + 5})`}>
                            <polygon points="-30,10 30,10 -2,-135" fill="rgba(0,0,0,0.6)" />
                            <polygon points="-24,6 24,6 0,-128" fill="#ff5500" />
                            <polygon points="8,0 -4,0 0,-100" fill="#ffaa44" opacity={0.5} />
                            <ellipse cx="0" cy={-80} rx={16 + pulseSync * 28} ry={38 + pulseSync * 52}
                                fill="#ff4400" opacity={0.28 + pulseSync * 0.58}
                                style={{ filter: 'blur(10px)' }} />
                            <GlowDot cx={0} cy={-122} pulse={pulseSync} color="#ffaa00" baseR={9} />
                        </g>

                        {/* Head */}
                        <circle cx="0" cy="0" r={HEAD_R} fill={RED} />

                        {/* Eyes — bulging! */}
                        {/* Left eye */}
                        <ellipse cx="-38" cy="-10" rx="28" ry="32" fill="white" />
                        <circle cx="-38" cy="-8" r="18" fill={EYE} />
                        <circle cx="-38" cy="-8" r="10" fill="#220000" />
                        <circle cx="-30" cy="-15" r="4" fill="white" opacity={0.9} />
                        {/* Eye glow on beat */}
                        <ellipse cx="-38" cy="-10" rx={28 + bass * 12} ry={32 + bass * 14}
                            fill={EYE} opacity={bass * 0.35}
                            style={{ filter: 'blur(6px)' }} />

                        {/* Right eye */}
                        <ellipse cx="38" cy="-10" rx="28" ry="32" fill="white" />
                        <circle cx="38" cy="-8" r="18" fill={EYE} />
                        <circle cx="38" cy="-8" r="10" fill="#220000" />
                        <circle cx="46" cy="-15" r="4" fill="white" opacity={0.9} />
                        <ellipse cx="38" cy="-10" rx={28 + bass * 12} ry={32 + bass * 14}
                            fill={EYE} opacity={bass * 0.35}
                            style={{ filter: 'blur(6px)' }} />

                        {/* Eyebrows — evil! */}
                        <path d="M -66,-42 Q -38,-58 -10,-42" stroke={DRED} strokeWidth="9"
                            fill="none" strokeLinecap="round" />
                        <path d="M 66,-42 Q 38,-58 10,-42" stroke={DRED} strokeWidth="9"
                            fill="none" strokeLinecap="round" />

                        {/* Nose — big bulb */}
                        <ellipse cx="0" cy="22" rx="20" ry="16" fill={DRED}
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />

                        {/* Mouth — evil grin */}
                        {isBeat && bass > 0.45
                            ? <ellipse cx="0" cy="52" rx="38" ry="22" fill="#220000" />
                            : <path d="M -48,42 Q 0,74 48,42" stroke="#220000" strokeWidth="8"
                                fill="none" strokeLinecap="round" />
                        }
                        {/* Teeth on beat */}
                        {isBeat && bass > 0.45 && (
                            <>
                                {[-26, -8, 10, 28].map((tx2, i) => (
                                    <rect key={i} x={tx2} y="47" width="14" height="18" rx="3" fill="white" />
                                ))}
                            </>
                        )}
                    </g>

                </g>{/* end bodyDy group */}

                {/* ── FIRE FLOOR EQUALIZER (mini bars at bottom) ── */}
                {Array.from({ length: 32 }, (_, i) => {
                    const amp = Math.min((viz[i % 32] ?? 0) * 3.5, 1);
                    const bx = (i / 32) * width;
                    const bh = amp * 180 + 10;
                    const hue = 15 + amp * 30;
                    return (
                        <rect key={i} x={bx} y={FLOOR - bh} width={width / 32 - 2} height={bh}
                            fill={`hsl(${hue},100%,55%)`}
                            opacity={0.7 + amp * 0.3}
                        />
                    );
                })}

                {/* ── BEAT SCREEN FLASH ── */}
                {isBeat && (
                    <rect x="0" y="0" width={width} height={height}
                        fill={`rgba(220,30,0,${bass * 0.1})`} />
                )}
            </svg>

            {/* SCANLINES */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 4px)',
                pointerEvents: 'none',
            }} />
        </AbsoluteFill>
    );
};
