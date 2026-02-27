import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { useMemo } from 'react';

// Hexagon SVG helper
const getHexPoints = (cx: number, cy: number, r: number) => {
    let points = "";
    for (let i = 0; i < 6; i++) {
        // Pointy topped hexagon
        const angle_deg = 60 * i + 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points += `${cx + r * Math.cos(angle_rad)},${cy + r * Math.sin(angle_rad)} `;
    }
    return points.trim();
};

export const CyberDrummer: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    // --- NEURAL NETWORK MESH ---
    // Defined above early return to satisfy Rule of Hooks
    const { nodes, edges } = useMemo(() => {
        const _nodes = Array.from({ length: 45 }).map((_, i) => ({
            id: i,
            x: Math.random() * width,
            y: Math.random() * height * 0.45,
            size: 2 + Math.random() * 3,
            phase: Math.random() * Math.PI * 2
        }));

        const _edges: any[] = [];
        for (let i = 0; i < _nodes.length; i++) {
            for (let j = i + 1; j < _nodes.length; j++) {
                const dist = Math.hypot(_nodes[i].x - _nodes[j].x, _nodes[i].y - _nodes[j].y);
                if (dist < 320) {
                    _edges.push({ a: i, b: j, dist });
                }
            }
        }
        return { nodes: _nodes, edges: _edges };
    }, [width, height]);

    const activeEdgeIndex = Math.floor(frame / 15) % (edges.length || 1);
    const activeEdgeIndex2 = Math.floor(frame / 18 + 15) % (edges.length || 1);
    const activeEdgeIndex3 = Math.floor(frame / 22 + 30) % (edges.length || 1);
    const activeEdgeIndex4 = Math.floor(frame / 12 + 45) % (edges.length || 1);
    const activeEdgeIndex5 = Math.floor(frame / 20 + 60) % (edges.length || 1);
    const activeEdgeIndex6 = Math.floor(frame / 28 + 75) % (edges.length || 1);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#02000a' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    // Shifted all frequency bins much lower. Phonk tracks have very little at viz[18+],
    // so the right arm was completely starved. Now both arms read from the active low/mid zones.
    const bass = Math.min((viz[0] + viz[1]) / 2 * 3, 1);
    const midL = Math.min((viz[2] + viz[3]) / 2 * 4, 1);
    const midR = Math.min((viz[4] + viz[5] + viz[6]) / 3 * 5, 1);
    const high = Math.min((viz[8] + viz[10] + viz[12]) / 3 * 6, 1);
    const pulse = Math.max(high, midL * 0.3, bass * 0.2);


    const t = frame;
    const cx = width / 2;
    const FLOOR = Math.round(height * 0.85);
    const bodyCx = cx;
    const bodyCy = FLOOR - 240;

    // ── COLORS ──
    const BG_DARK = '#050214';
    const NEON_PINK = '#ff0055';
    const NEON_CYAN = '#00ffff';
    const NEON_PURPLE = '#bc00ff';
    const METAL_GRID = '#110a26';
    const ROBOT_DARK = '#565662';
    const ROBOT_LIGHT = '#9696a6';

    // ── ANIMATION ──
    const headRot = Math.sin(t * 0.15) * (3 + bass * 10);
    const bodyDy = Math.sin(t * 0.25) * (5 + bass * 20);

    // ── DRUM PADS (Hexagons) ──
    // Pad 1: Far Left (Kick, hits on Bass)
    const p1x = cx - 350; const p1y = FLOOR - 100;
    // Pad 2: Mid Left (Snare/Tom, hits on MidL)
    const p2x = cx - 140; const p2y = FLOOR - 40;
    // Pad 3: Mid Right (Snare/Tom, hits on MidR)
    const p3x = cx + 140; const p3y = FLOOR - 40;
    // Pad 4: Far Right (Hi-hat/Crash, hits on High)
    const p4x = cx + 350; const p4y = FLOOR - 100;

    // ── ARMS & DRUMSTICKS ──
    // Shoulders
    const sLx = bodyCx - 140;
    const sLy = bodyCy + bodyDy - 40;
    const sRx = bodyCx + 140;
    const sRy = bodyCy + bodyDy - 40;

    // ── CONTINUOUS KINEMATICS (Hit & Bounce) ──
    const drumBounceL = Math.abs(Math.sin(t * 0.45));
    const drumBounceR = Math.abs(Math.cos(t * 0.50));

    // Phonk Randomizer: Since we lack highs, we force Bass to hit both outer and inner pads pseudo-randomly
    const targetInnerL = Math.sin(t * 0.1) > 0.3; // 30% chance to hit inner left pad
    const targetInnerR = Math.cos(t * 0.15) > 0.1; // 40% chance to hit inner right pad

    // Left Arm (Screen Left)
    const activeL = bass > midL ? 'bass' : 'mid';
    const intensityL = activeL === 'bass' ? bass : midL;

    // Apply intensity with dynamic bouncing
    const hitL = Math.min(Math.pow(intensityL * 1.5, 2) * (0.2 + 0.8 * drumBounceL), 1);

    // If bass, dynamically switch between outer Kick (p1) and inner Snare (p2)
    const tLx = activeL === 'bass' && targetInnerL ? p2x : (activeL === 'bass' ? p1x : p2x);
    const tLy = activeL === 'bass' && targetInnerL ? p2y - 20 : (activeL === 'bass' ? p1y - 20 : p2y - 20);

    // Virtual wrist attractor
    const wLx_rest = cx - 180;
    const wLy_rest = FLOOR - 260 - Math.sin(t * 0.3) * 30;
    const wLx_hit = tLx - 100;
    const wLy_hit = tLy - 120;

    // Tip resting position (anatomically natural angle)
    const rLx = wLx_rest - 40;
    const rLy = wLy_rest - 140;

    // Actual interpolated Tip position hitting the drum
    const hLx = rLx + (tLx - rLx) * hitL;
    const hLy = rLy + (tLy - rLy) * hitL;

    // Interpolated wrist attractor
    const wristLx = wLx_rest + (wLx_hit - wLx_rest) * hitL;
    const wristLy = wLy_rest + (wLy_hit - wLy_rest) * hitL;

    // Stick angle between attractor wrist and target tip
    const angleL = Math.atan2(hLy - wristLy, hLx - wristLx);

    // Rigid dimensions
    const L_stick = 190;
    const L_butt = 50;

    // The actual Hand strictly locked to the lower portion of the stick
    const handLx = hLx - L_stick * Math.cos(angleL);
    const handLy = hLy - L_stick * Math.sin(angleL);
    const buttLx = handLx - L_butt * Math.cos(angleL);
    const buttLy = handLy - L_butt * Math.sin(angleL);

    // Which pad to light up visually based on where the stick actually went
    const hitL1 = (tLx === p1x) && hitL > 0.7;
    const hitL2 = (tLx === p2x) && hitL > 0.7;

    // --- ANTENNA SEQUENTIAL FLASH ---
    const antennaStep = Math.floor(frame / (fps * 0.5)) % 3;


    // Right Arm (Screen Right) - Rewired to hit on Bass and MidL because the track has no high frequencies
    const activeR = bass > midL * 0.8 ? 'bass' : 'mid';
    const intensityR = activeR === 'bass' ? bass : midL;

    // Apply intensity with dynamic bouncing
    const hitR = Math.min(Math.pow(intensityR * 1.8, 2) * (0.2 + 0.8 * drumBounceR), 1);

    // If bass, dynamically switch between outer Kick (p4) and inner Snare (p3)
    const tRx = activeR === 'bass' && targetInnerR ? p3x : (activeR === 'bass' ? p4x : p3x);
    const tRy = activeR === 'bass' && targetInnerR ? p3y - 20 : (activeR === 'bass' ? p4y - 20 : p3y - 20);

    const wRx_rest = cx + 180;
    const wRy_rest = FLOOR - 260 - Math.cos(t * 0.3) * 30;
    const wRx_hit = tRx + 100;
    const wRy_hit = tRy - 120;

    // Tip resting position (anatomically natural angle)
    const rRx = wRx_rest + 40;
    const rRy = wRy_rest - 140;

    const hRx = rRx + (tRx - rRx) * hitR;
    const hRy = rRy + (tRy - rRy) * hitR;

    const wristRx = wRx_rest + (wRx_hit - wRx_rest) * hitR;
    const wristRy = wRy_rest + (wRy_hit - wRy_rest) * hitR;

    const angleR = Math.atan2(hRy - wristRy, hRx - wristRx);

    const handRx = hRx - L_stick * Math.cos(angleR);
    const handRy = hRy - L_stick * Math.sin(angleR);
    const buttRx = handRx - L_butt * Math.cos(angleR);
    const buttRy = handRy - L_butt * Math.sin(angleR);

    // Which pad to light up visually
    const hitR4 = (tRx === p4x) && hitR > 0.7;
    const hitR3 = (tRx === p3x) && hitR > 0.7;

    // ── CABLES ──
    const cables = Array.from({ length: 6 }).map((_, i) => {
        // Thick dreadlock cables from head to back
        const startX = bodyCx + (i - 2.5) * 30;
        const startY = bodyCy + bodyDy - 180; // top of head
        const cpX = bodyCx + (i > 2 ? 200 : -200) + Math.sin(t * 0.1 + i) * 30;
        const cpY = bodyCy + 50 + bass * 50;
        const endX = cx + (i - 2.5) * 60;
        const endY = FLOOR - 100;
        return { startX, startY, cpX, cpY, endX, endY };
    });


    return (
        <AbsoluteFill style={{ backgroundColor: BG_DARK, overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* ── DIGITAL RAIN / GRID BACKGROUND ── */}
            <svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
                <defs>
                    <radialGradient id="reactorGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={NEON_PINK} stopOpacity={0.8 + bass * 0.2} />
                        <stop offset="60%" stopColor={NEON_PINK} stopOpacity={0.2 + bass * 0.6} />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="laserFade" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={NEON_CYAN} stopOpacity="0.8" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Cyberpunk Horizon Grid */}
                <g transform={`translate(0, ${FLOOR - 200})`}>
                    {Array.from({ length: 20 }).map((_, i) => {
                        const lineY = i * i * 1.5 + (t * 5) % 100;
                        return lineY < height - FLOOR + 200 ? (
                            <line key={`h-${i}`} x1="0" y1={lineY} x2={width} y2={lineY}
                                stroke={METAL_GRID} strokeWidth={Math.max(1, i * 0.3)} opacity={1 - lineY / 800} />
                        ) : null;
                    })}
                    {/* Perspective Vertical Lines */}
                    {Array.from({ length: 15 }).map((_, i) => (
                        <line key={`v-${i}`} x1={cx} y1="0" x2={cx + (i - 7) * 400} y2={1000}
                            stroke={METAL_GRID} strokeWidth="3" opacity="0.3" />
                    ))}
                </g>

                {/* --- ATMOSPHERIC FOG (Huge blurred blobs) --- */}
                <g opacity={0.3 + bass * 0.2}>
                    <circle cx={width * 0.2 + Math.sin(t * 0.02) * 100} cy={height * 0.3} r="400" fill={NEON_PURPLE} style={{ filter: 'blur(120px)' }} opacity="0.4" />
                    <circle cx={width * 0.8 + Math.cos(t * 0.02) * 100} cy={height * 0.4} r="500" fill={NEON_CYAN} style={{ filter: 'blur(150px)' }} opacity="0.3" />
                    <circle cx={width * 0.5} cy={height * 0.2} r="300" fill={NEON_PINK} style={{ filter: 'blur(100px)' }} opacity="0.2" />
                </g>

                {/* --- CRT SCANLINES (Visual Texture) --- */}
                <g opacity="0.07">
                    {Array.from({ length: Math.ceil(height / 6) }).map((_, i) => (
                        <line key={`scanline-${i}`} x1="0" y1={i * 6} x2={width} y2={i * 6} stroke="#000" strokeWidth="2" />
                    ))}
                </g>

                {/* Giant Radar / Sun in BG */}
                <g transform={`translate(${cx}, ${FLOOR - 200}) rotate(${t * 0.2})`}>
                    <circle cx="0" cy="0" r="400" fill="none" stroke={NEON_PINK} strokeWidth="2" opacity="0.1" />
                    <circle cx="0" cy="0" r="380" fill="none" stroke={NEON_CYAN} strokeWidth="2" strokeDasharray="20 40" opacity="0.3" />
                    <circle cx="0" cy="0" r="300" fill="none" stroke={NEON_PINK} strokeWidth="5" strokeDasharray={`100 ${100 + bass * 200}`} opacity={0.3 + bass * 0.4} />
                </g>

                {/* --- NEURAL WEB (Purple, behind rain) --- */}
                <g>
                    {edges.map((edge, i) => {
                        const na = nodes[edge.a];
                        const nb = nodes[edge.b];
                        const ax = na.x + Math.sin(t * 0.05 + na.phase) * 20;
                        const ay = na.y + Math.cos(t * 0.05 + na.phase) * 20;
                        const bx = nb.x + Math.sin(t * 0.05 + nb.phase) * 20;
                        const by = nb.y + Math.cos(t * 0.05 + nb.phase) * 20;

                        const isPulse = [activeEdgeIndex, activeEdgeIndex2, activeEdgeIndex3, activeEdgeIndex4, activeEdgeIndex5, activeEdgeIndex6].includes(i);

                        return (
                            <g key={`edge-${i}`}>
                                <line x1={ax} y1={ay} x2={bx} y2={by}
                                    stroke={isPulse ? '#fff' : NEON_PURPLE}
                                    strokeWidth={isPulse ? 2 : 1.5}
                                    opacity={isPulse ? 0.9 : (1 - edge.dist / 320) * (0.25 + pulse * 0.3)}
                                    style={isPulse ? { filter: 'drop-shadow(0 0 10px #bc00ff)' } : {}}
                                />
                                {isPulse && (
                                    <circle cx={ax + (bx - ax) * ((frame % 30) / 30)} cy={ay + (by - ay) * ((frame % 30) / 30)}
                                        r="3" fill="#fff" style={{ filter: 'drop-shadow(0 0 10px #fff)' }} />
                                )}
                            </g>
                        );
                    })}
                    {nodes.map((node, i) => {
                        const nx = node.x + Math.sin(t * 0.05 + node.phase) * 20;
                        const ny = node.y + Math.cos(t * 0.05 + node.phase) * 20;
                        return (
                            <g key={`node-${i}`}>
                                <circle cx={nx} cy={ny} r={node.size + pulse * 5} fill={NEON_PURPLE} opacity={0.3 + pulse * 0.4} />
                                <circle cx={nx} cy={ny} r="2" fill="#fff" opacity={0.6 + pulse * 0.4} />
                            </g>
                        );
                    })}
                </g>

                {/* Falling Digital Data (In front of Neural Web) */}
                {Array.from({ length: 64 }).map((_, i) => {
                    // Mirror mapping: 0-31 left, 32-63 right
                    const vizIndex = i < 32 ? i : 63 - i;
                    // Map inner visualizer values (closer to 16) to have higher impact to avoid empty centers
                    const eqAmp = Math.min((viz[vizIndex] ?? 0) * 4, 1);
                    const dh = 30 + eqAmp * 800; // taller base drops
                    const dx = (width / 64) * i;
                    // Make them look like glitching blocks raining down
                    const dy = ((t * 15 + i * 143) % height) - dh;
                    return (
                        <rect key={`data-${i}`} x={dx} y={dy} width="6" height={dh} fill={NEON_CYAN} opacity={0.3 + eqAmp * 0.6} style={{ filter: 'blur(1px)' }} />
                    );
                })}

                {/* ── DRUM PADS (Hexagons) ── */}
                {[
                    { x: p1x, y: p1y, hit: hitL1, color: NEON_PINK, scale: 1.5 },
                    { x: p2x, y: p2y, hit: hitL2, color: NEON_CYAN, scale: 1.2 },
                    { x: p3x, y: p3y, hit: hitR3, color: NEON_CYAN, scale: 1.2 },
                    { x: p4x, y: p4y, hit: hitR4, color: '#ffee00', scale: 1.5 },
                ].map((pad, i) => (
                    <g key={`pad-${i}`} transform={`translate(${pad.x}, ${pad.y})`}>
                        {/* Glow/Shockwave when hit */}
                        {pad.hit && (
                            <circle cx="0" cy="0" r={80 * pad.scale} fill={pad.color} opacity={0.4} style={{ filter: 'blur(20px)' }} />
                        )}
                        {/* Hexagon base */}
                        <polygon points={getHexPoints(0, 0, 70 * pad.scale)} fill={METAL_GRID} stroke={pad.color} strokeWidth={pad.hit ? 8 : 3} />
                        {/* Inner glowing core */}
                        <polygon points={getHexPoints(0, 0, 45 * pad.scale)} fill={pad.color} opacity={pad.hit ? 0.8 : 0.2} />
                        <circle cx="0" cy="0" r={15 * pad.scale} fill="#fff" opacity={pad.hit ? 1 : 0.3} />
                    </g>
                ))}


                {/* ── ROBOT COMPONENTS (Scaled) ── */}
                <g transform={`translate(${cx}, ${FLOOR}) scale(1.1) translate(${-cx}, ${-FLOOR})`}>
                    <g transform={`translate(0, ${bodyDy})`}>
                        {/* Dreadlock Cables (Behind Torso) */}
                        {cables.map((cable, i) => (
                            <path key={`cable-${i}`} d={`M ${cable.startX} ${cable.startY} Q ${cable.cpX} ${cable.cpY} ${cable.endX} ${cable.endY}`}
                                stroke="#0a0a0a" strokeWidth="18" fill="none" strokeLinecap="round" />
                        ))}
                        {cables.map((cable, i) => (
                            <path key={`cable-hl-${i}`} d={`M ${cable.startX} ${cable.startY} Q ${cable.cpX} ${cable.cpY} ${cable.endX} ${cable.endY}`}
                                stroke={NEON_CYAN} strokeWidth="3" fill="none" strokeDasharray="10 20" opacity={0.5} />
                        ))}

                        {/* Shoulders */}
                        <rect x={bodyCx - 150} y={bodyCy - 60} width="300" height="60" rx="30" fill={ROBOT_DARK} />

                        {/* Torso */}
                        <path d={`M ${bodyCx - 100} ${bodyCy - 50} L ${bodyCx + 100} ${bodyCy - 50} L ${bodyCx + 60} ${bodyCy + 150} L ${bodyCx - 60} ${bodyCy + 150} Z`} fill={ROBOT_LIGHT} />
                        <path d={`M ${bodyCx - 90} ${bodyCy - 40} L ${bodyCx + 90} ${bodyCy - 40} L ${bodyCx + 50} ${bodyCy + 140} L ${bodyCx - 50} ${bodyCy + 140} Z`} fill={ROBOT_DARK} />

                        {/* Subwoofer Reactor Core */}
                        <g transform={`translate(${bodyCx}, ${bodyCy + 60})`}>
                            <circle cx="0" cy="0" r={60 + bass * 20} fill={ROBOT_LIGHT} />
                            <circle cx="0" cy="0" r={50 + bass * 20} fill="#0a0a0a" />
                            <circle cx="0" cy="0" r={50 + bass * 20} fill="url(#reactorGlow)" />
                            {/* Speaker Cone Lines */}
                            <use href="#coneLines" />
                            <g id="coneLines">
                                {[0, 45, 90, 135].map(a => (
                                    <line key={a} x1="-50" y1="0" x2="50" y2="0" stroke={NEON_PINK} strokeWidth="2" opacity="0.3" transform={`rotate(${a})`} />
                                ))}
                            </g>
                            <circle cx="0" cy="0" r={20 + bass * 15} fill={NEON_PINK} />
                            <circle cx="0" cy="0" r={10 + bass * 8} fill="#fff" />
                        </g>

                        {/* Head */}
                        <g transform={`translate(${bodyCx}, ${bodyCy - 110}) rotate(${headRot})`}>
                            {/* Neck */}
                            <rect x="-20" y="0" width="40" height="60" fill={ROBOT_LIGHT} />

                            {/* Antennas */}
                            <g transform="translate(0, -100)">
                                {/* Left Antenna */}
                                <line x1="-30" y1="10" x2="-75" y2="-95" stroke={ROBOT_LIGHT} strokeWidth="5" />
                                <circle cx="-75" cy="-95" r={8.8 + midL * 11} fill={antennaStep === 0 ? NEON_CYAN : ROBOT_DARK} style={{ filter: antennaStep === 0 ? 'drop-shadow(0 0 10px cyan)' : 'none' }} />
                                <circle cx="-75" cy="-95" r="4.4" fill="#fff" opacity={antennaStep === 0 ? 1 : 0} />

                                {/* Middle Antenna */}
                                <line x1="0" y1="0" x2="0" y2="-120" stroke={ROBOT_LIGHT} strokeWidth="5" />
                                <circle cx="0" cy="-120" r={11 + bass * 16.5} fill={antennaStep === 1 ? NEON_PINK : ROBOT_DARK} style={{ filter: antennaStep === 1 ? 'drop-shadow(0 0 10px pink)' : 'none' }} />
                                <circle cx="0" cy="-120" r="5.5" fill="#fff" opacity={antennaStep === 1 ? 1 : 0} />

                                {/* Right Antenna */}
                                <line x1="30" y1="10" x2="75" y2="-95" stroke={ROBOT_LIGHT} strokeWidth="5" />
                                <circle cx="75" cy="-95" r={8.8 + midR * 11} fill={antennaStep === 2 ? '#ffee00' : ROBOT_DARK} style={{ filter: antennaStep === 2 ? 'drop-shadow(0 0 10px yellow)' : 'none' }} />
                                <circle cx="75" cy="-95" r="4.4" fill="#fff" opacity={antennaStep === 2 ? 1 : 0} />
                            </g>


                            {/* Cyber Skull */}
                            <path d="M -70 0 L 70 0 L 50 -100 L -50 -100 Z" fill={ROBOT_LIGHT} />
                            <path d="M -60 -10 L 60 -10 L 40 -90 L -40 -90 Z" fill={ROBOT_DARK} />

                            {/* 3 Glowing Eyes (Splinter Cell style) */}
                            <g transform={`translate(0, -60)`}>
                                <circle cx="-25" cy="-10" r={10 + (hitL1 || hitL2 ? 5 : 0)} fill={NEON_CYAN} style={{ filter: 'drop-shadow(0 0 8px cyan)' }} />
                                <circle cx="25" cy="-10" r={10 + (hitR4 || hitR3 ? 5 : 0)} fill={NEON_CYAN} style={{ filter: 'drop-shadow(0 0 8px cyan)' }} />
                                <circle cx="0" cy="15" r={12 + bass * 8} fill={NEON_PINK} style={{ filter: 'drop-shadow(0 0 10px red)' }} />
                                {/* Inner white dots */}
                                <circle cx="-25" cy="-10" r="4" fill="#fff" />
                                <circle cx="25" cy="-10" r="4" fill="#fff" />
                                <circle cx="0" cy="15" r="5" fill="#fff" />
                            </g>
                        </g>
                    </g>

                    {/* ── IK ARMS & DRUMSTICKS ── */}
                    {/* Left Arm Curve */}
                    <path d={`M ${sLx} ${sLy} Q ${sLx - 100} ${(sLy + handLy) / 2} ${handLx} ${handLy}`}
                        stroke={ROBOT_LIGHT} strokeWidth="28" fill="none" strokeLinecap="round" />
                    <path d={`M ${sLx} ${sLy} Q ${sLx - 100} ${(sLy + handLy) / 2} ${handLx} ${handLy}`}
                        stroke={ROBOT_DARK} strokeWidth="20" fill="none" strokeLinecap="round" />

                    {/* Right Arm Curve */}
                    <path d={`M ${sRx} ${sRy} Q ${sRx + 100} ${(sRy + handRy) / 2} ${handRx} ${handRy}`}
                        stroke={ROBOT_LIGHT} strokeWidth="28" fill="none" strokeLinecap="round" />
                    <path d={`M ${sRx} ${sRy} Q ${sRx + 100} ${(sRy + handRy) / 2} ${handRx} ${handRy}`}
                        stroke={ROBOT_DARK} strokeWidth="20" fill="none" strokeLinecap="round" />

                    {/* Left Drumstick (Lightsaber style) */}
                    <g>
                        {/* The stick from butt to tip */}
                        <line x1={buttLx} y1={buttLy} x2={hLx} y2={hLy} stroke={NEON_CYAN} strokeWidth="10" strokeLinecap="round" style={{ filter: 'blur(4px)' }} />
                        <line x1={buttLx} y1={buttLy} x2={hLx} y2={hLy} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                        {/* Left Hand */}
                        <circle cx={handLx} cy={handLy} r="25" fill="#111" stroke={NEON_CYAN} strokeWidth="4" />
                    </g>

                    {/* Right Drumstick */}
                    <g>
                        <line x1={buttRx} y1={buttRy} x2={hRx} y2={hRy} stroke={NEON_PINK} strokeWidth="10" strokeLinecap="round" style={{ filter: 'blur(4px)' }} />
                        <line x1={buttRx} y1={buttRy} x2={hRx} y2={hRy} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                        {/* Right Hand */}
                        <circle cx={handRx} cy={handRy} r="25" fill="#111" stroke={NEON_PINK} strokeWidth="4" />
                    </g>
                </g>

            </svg>
        </AbsoluteFill >
    );
};
