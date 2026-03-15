import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const pixelFont = { fontFamily: '"Courier New", monospace' };

// Physics constants
const GRAVITY = 0.45;
const FRAGMENTS_PER_ALIEN = 6;
const PROJECTILE_SPEED = 25;
const GROUND_HEIGHT = 100;
const SHIP_SIZE = 90;
const ALIEN_EMOJIS = ['👾', '🛸', '👽', '🤖'];

const sr = (seed: number) => Math.abs(Math.sin(seed * 127.1 + 97.3));

export const RetroGameScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height, durationInFrames } = useVideoConfig();
    const audioUrl = staticFile('audio/track.mp3');
    const audioData = useAudioData(audioUrl);

    const SHIP_Y_BASE = height - GROUND_HEIGHT - 20;

    // --- 1. Pre-calculate absolute deterministic physics ---
    const {
        shootingFrames,
        marchTimeline,
        deadAliensMap,
        COLS,
        TOTAL_ALIENS,
        laserHits,
        shipXTimeline
    } = React.useMemo(() => {
        if (!audioData) return {
            shootingFrames: [],
            marchTimeline: new Float32Array(0),
            deadAliensMap: new Map(),
            COLS: 8, TOTAL_ALIENS: 0,
            laserHits: new Map(),
            shipXTimeline: new Float32Array(0)
        };

        const threshold = 0.35;
        const totalFrames = durationInFrames;
        const sFrames: number[] = [];
        const mTimeline = new Float32Array(totalFrames);
        let mPos = 0;

        // Pass 1: Timeline Analysis (find beats and march)
        for (let f = 0; f < totalFrames; f++) {
            const fViz = visualizeAudio({ fps, frame: f, audioData, numberOfSamples: 64 });
            const fBass = (fViz[0] + fViz[1] + fViz[2]) / 3;

            // Continuous march moves steadily, and pulses on bass
            mPos += 0.05 + Math.max(0, fBass - 0.2) * 1.5;
            mTimeline[f] = mPos;

            // Detect rising edge beat peak for shooting
            const pViz = f > 0 ? visualizeAudio({ fps, frame: f - 1, audioData, numberOfSamples: 64 }) : null;
            const pBass = pViz ? (pViz[0] + pViz[1] + pViz[2]) / 3 : 0;

            if (fBass > threshold && pBass <= threshold) {
                sFrames.push(f);
            }
        }

        const N = sFrames.length;
        if (N === 0) {
            return {
                shootingFrames: [], marchTimeline: mTimeline, deadAliensMap: new Map(),
                COLS: 8, TOTAL_ALIENS: 0, laserHits: new Map(), shipXTimeline: new Float32Array(totalFrames).fill(width / 2)
            };
        }

        // Pass 2: Decide Hits vs Misses
        const isHit = new Array(N).fill(false);
        let numHits = 0;
        for (let k = 0; k < N - 1; k++) {
            if (sr(k * 77) > 0.25) { // 75% accuracy
                isHit[k] = true;
                numHits++;
            }
        }
        isHit[N - 1] = true; // MUST hit last alien on last beat
        numHits++;

        const T_ALIENS = numHits;
        const C = 8;

        // --- SAFE BOUNDARIES ---
        const MARGIN = 60; // 60px safe margin from edge
        const MAX_WIGGLE = width * 0.15; // 15% horizontal screen swing
        const ARMADA_WIDTH = width - 2 * MARGIN - 2 * MAX_WIGGLE;
        const ARMADA_START_X = MARGIN + MAX_WIGGLE;
        const spacingX = ARMADA_WIDTH / (C - 1);

        const aliveAliens = new Set<number>();
        for (let i = 0; i < T_ALIENS; i++) aliveAliens.add(i);

        // Pass 3: Perfect Physics Engine (Auto-Aiming Ship with Raycasting)
        const dAliens = new Map<number, { frame: number, x: number, y: number }>();
        const targetShipX = new Float32Array(N);
        const lHits = new Map<number, number>();

        const raycast = (sf: number, sx: number, living: Set<number>) => {
            for (let t = sf; t < totalFrames; t++) {
                const ly = SHIP_Y_BASE - (t - sf) * PROJECTILE_SPEED;
                if (ly < -50) break;

                const mX = Math.sin(mTimeline[t] * 0.08) * MAX_WIGGLE;
                for (const i of living) {
                    const row = Math.floor(i / C);
                    const col = i % C;
                    const mY = Math.floor((t / totalFrames) * (SHIP_Y_BASE - 250)) + 160 + row * 80;
                    const ax = ARMADA_START_X + col * spacingX + mX;

                    if (Math.abs(sx - ax) < 35 && Math.abs(ly - mY) < 35) {
                        return { hitF: t, hitAlien: i, hitY: mY };
                    }
                }
            }
            return null;
        };

        for (let k = 0; k < N; k++) {
            const sf = sFrames[k];

            let wantHit = isHit[k];
            if (aliveAliens.size >= (N - k)) wantHit = true; // MUST hit to clear the board
            if (aliveAliens.size === 0) wantHit = false;
            if (k === N - 1 && aliveAliens.size > 0) wantHit = true; // Final beat insurance

            if (wantHit && aliveAliens.size > 0) {
                // Target random alien
                const targetList = Array.from(aliveAliens);
                const targetA = targetList[Math.floor(sr(k) * targetList.length)];

                const row = Math.floor(targetA / C);
                const col = targetA % C;

                // Aim EXACTLY at when that alien will cross our Y intersection
                let hitF_approx = sf;
                for (let t = sf; t < totalFrames; t++) {
                    const ly = SHIP_Y_BASE - (t - sf) * PROJECTILE_SPEED;
                    const mY = Math.floor((t / totalFrames) * (SHIP_Y_BASE - 250)) + 160 + row * 80;
                    if (ly <= mY + 20) {
                        hitF_approx = t; break;
                    }
                }
                const mX_hit = Math.sin(mTimeline[hitF_approx] * 0.08) * MAX_WIGGLE;
                const sx = ARMADA_START_X + col * spacingX + mX_hit;

                // Confirm hit, if it hits someone else in front, that's perfect!
                const hitResult = raycast(sf, sx, aliveAliens);
                if (hitResult) {
                    dAliens.set(hitResult.hitAlien, { frame: hitResult.hitF, x: sx, y: hitResult.hitY });
                    aliveAliens.delete(hitResult.hitAlien);
                    lHits.set(sf, hitResult.hitF);
                } else {
                    // Insurance (rare)
                    dAliens.set(targetA, { frame: hitF_approx, x: sx, y: SHIP_Y_BASE - (hitF_approx - sf) * PROJECTILE_SPEED });
                    aliveAliens.delete(targetA);
                    lHits.set(sf, hitF_approx);
                }
                targetShipX[k] = sx;
            } else {
                // Intended Miss - Hunt for a genuine gap in the armada!
                let sx = -1;
                for (let attempt = 0; attempt < 20; attempt++) {
                    const testSx = ARMADA_START_X + sr(k * 99 + attempt) * ARMADA_WIDTH;
                    if (!raycast(sf, testSx, aliveAliens)) {
                        sx = testSx; break;
                    }
                }
                // If armada is impenetrable, shoot safely wide on the flanks
                if (sx === -1) {
                    sx = sr(k) > 0.5 ? MARGIN / 2 : width - MARGIN / 2;
                }
                targetShipX[k] = sx;
            }
        }

        // Pass 4: Build smooth ShipX timeline
        const sTimeline = new Float32Array(totalFrames);
        let lastF = 0;
        let lastX = width / 2;

        for (let k = 0; k < N; k++) {
            const sf = sFrames[k];
            const tX = targetShipX[k];
            const dur = Math.max(1, sf - lastF);

            for (let f = lastF; f <= sf; f++) {
                const p = (f - lastF) / dur;
                // Smooth easing so the ship naturally glides to the exact target
                const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                // Add some robotic tracking jitter that stops at the moment of firing
                const noise = Math.sin(f * 0.3) * 30 * Math.sin(p * Math.PI);

                sTimeline[f] = lastX + (tX - lastX) * ease + noise;
            }
            lastF = sf;
            lastX = tX;
        }
        for (let f = lastF + 1; f < totalFrames; f++) {
            sTimeline[f] = lastX;
        }

        return {
            shootingFrames: sFrames,
            marchTimeline: mTimeline,
            deadAliensMap: dAliens,
            COLS: C,
            TOTAL_ALIENS: T_ALIENS,
            laserHits: lHits,
            shipXTimeline: sTimeline
        };
    }, [audioData, fps, width, height, durationInFrames, SHIP_Y_BASE]);

    const Ship = ({ x, y, volume }: { x: number, y: number, volume: number }) => (
        <div style={{
            position: 'absolute',
            left: x - SHIP_SIZE / 2,
            top: y - SHIP_SIZE + 20,
            width: SHIP_SIZE,
            height: SHIP_SIZE,
            filter: `drop-shadow(0 0 ${10 + volume * 30}px #ff0000)`,
            transform: `scale(${1 + volume * 0.1})`,
            zIndex: 10
        }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                {/* Battle Ship: White with Red accents */}
                <path d="M50 5 L85 85 L70 85 L65 70 L35 70 L30 85 L15 85 Z" fill="white" stroke="#ff0000" strokeWidth="2" />
                <path d="M40 70 L50 40 L60 70 Z" fill="#ff0000" />
                <rect x="42" y="25" width="16" height="12" fill="#ff0000" opacity="0.9" rx="2" />
                {/* Dual Thruster Flame */}
                <path d={`M35 85 L50 ${110 + volume * 40} L65 85 Z`} fill="white" opacity={0.7 + volume * 0.3}>
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="0.08s" repeatCount="indefinite" />
                </path>
                <path d={`M42 85 L50 ${95 + volume * 20} L58 85 Z`} fill="#ff0000" opacity={0.8} />
            </svg>
        </div>
    );

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const volume = Math.min(bass * 3, 1);

    // --- State helpers ---
    const shipX = shipXTimeline[frame];
    const currentMarch = marchTimeline[frame] ?? 0;

    // safe bounds matching pre-calc
    const MARGIN = 60;
    const MAX_WIGGLE = width * 0.15;
    const ARMADA_WIDTH = width - 2 * MARGIN - 2 * MAX_WIGGLE;
    const ARMADA_START_X = MARGIN + MAX_WIGGLE;
    const spacingX = ARMADA_WIDTH / Math.max(1, COLS - 1);

    const score = Array.from(deadAliensMap.values()).filter(d => d.frame <= frame).length * 125;
    const allDead = deadAliensMap.size === TOTAL_ALIENS && Array.from(deadAliensMap.values()).every(d => d.frame <= frame);


    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* CRT SCANLINES */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,68,0.1) 4px)',
                pointerEvents: 'none', zIndex: 100,
            }} />

            {/* HUD */}
            <div style={{
                position: 'absolute', top: 36, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between', padding: '0 50px',
                color: '#ffffff', fontSize: 34, ...pixelFont, zIndex: 50
            }}>
                <span>SCORE<br />{String(score).padStart(6, '0')}</span>
                <span style={{ textAlign: 'center', fontSize: 28, color: '#ff0000' }}>BEAT<br />INVADERS</span>
                <span style={{ textAlign: 'right' }}>STAGE<br />01</span>
            </div>

            {/* ALIENS */}
            {Array.from({ length: TOTAL_ALIENS }).map((_, i) => {
                const death = deadAliensMap.get(i);
                if (death && frame > death.frame) return null; // Dead

                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const mX = Math.sin(currentMarch * 0.08) * MAX_WIGGLE;
                // Strict steady march down the screen based on total frame progression
                const mY = Math.floor((frame / durationInFrames) * (SHIP_Y_BASE - 250)) + 160 + row * 80;
                const ax = ARMADA_START_X + col * spacingX + mX;

                const pulse = 1 + volume * 0.12 + Math.sin(frame * 0.2 + row * 0.4) * 0.04;
                return (
                    <div key={i} style={{
                        position: 'absolute', left: ax - 30, top: mY - 30,
                        fontSize: 50, transform: `scale(${pulse})`,
                        filter: `drop-shadow(0 0 ${volume > 0.5 ? 15 : 5}px #00ff44)`,
                    }}>
                        {ALIEN_EMOJIS[row % 4]}
                    </div>
                );
            })}

            {/* LASERS */}
            {shootingFrames.filter(sf => sf <= frame).map((sf, idx) => {
                const age = frame - sf;
                const hitF = laserHits.get(sf);
                if (hitF !== undefined && frame > hitF) return null; // Exploded on alien

                const ly = SHIP_Y_BASE - age * PROJECTILE_SPEED;
                if (ly < -100 || ly > SHIP_Y_BASE + 50) return null; // Off screen

                const sx = shipXTimeline[sf]; // Exact aim!

                return (
                    <div key={idx} style={{
                        position: 'absolute', left: sx - 4, top: ly,
                        width: 8, height: 45, background: 'white',
                        boxShadow: '0 0 15px white, 0 0 5px #ff0000', borderRadius: 4,
                        border: '1px solid #ff0000', zIndex: 5
                    }} />
                );
            })}

            {/* EXPLOSIONS */}
            {Array.from(deadAliensMap.values()).map((death, di) => {
                const age = frame - death.frame;
                if (age < 0 || age > 40) return null;

                return (
                    <React.Fragment key={di}>
                        {/* Boom Core */}
                        <div style={{
                            position: 'absolute', left: death.x - 50, top: death.y - 50,
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'white', opacity: Math.max(0, 1 - age * 0.03),
                            filter: 'blur(25px)', zIndex: 1
                        }} />
                        {/* Shards */}
                        {Array.from({ length: FRAGMENTS_PER_ALIEN }).map((_, fi) => {
                            const seed = death.frame + di + fi * 99;
                            const speed = 6 + sr(seed * 2) * 12;
                            const vx = Math.cos((fi / 6) * 6.28) * speed;
                            const vy = Math.sin((fi / 6) * 6.28) * speed - 6;
                            return (
                                <div key={fi} style={{
                                    position: 'absolute',
                                    left: death.x + vx * age,
                                    top: death.y + vy * age + 0.5 * GRAVITY * age * age,
                                    width: 16, height: 16, background: (fi % 2 === 0 ? 'white' : '#ff0000'),
                                    opacity: Math.max(0, 1 - age / 40),
                                    boxShadow: `0 0 10px ${fi % 2 === 0 ? 'white' : '#ff0000'}`,
                                    zIndex: 2
                                }} />
                            );
                        })}
                    </React.Fragment>
                );
            })}

            {/* SHIP */}
            <Ship x={shipX} y={SHIP_Y_BASE - volume * 25} volume={volume} />

            {/* VICTORY OVERLAY */}
            {allDead && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    pointerEvents: 'none', zIndex: 200
                }}>
                    <div style={{
                        fontSize: 140, color: '#00ff44', ...pixelFont,
                        textShadow: '8px 8px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 2px 2px 0px #000',
                        animation: 'pulse 0.5s infinite alternate'
                    }}>
                        YOU WIN
                    </div>
                </div>
            )}

            {/* GROUND LINE */}
            <div style={{ position: 'absolute', bottom: GROUND_HEIGHT, left: 0, right: 0, height: 4, background: 'white', zIndex: 10 }} />

            {/* GREEN ROBOT-APOCALYPSE STYLE EQ */}
            {(() => {
                const NBLOCKS = 12; // 12 blocks total
                const BARS = 20; // 20 bars per block
                const maxH = GROUND_HEIGHT - 10;
                const bW = width / NBLOCKS;
                const barW = bW / BARS;

                return Array.from({ length: NBLOCKS }).map((_, bi) => {
                    // Triple sine wave interference for organic flicker
                    const bScale = 0.6 + Math.sin(frame * 0.03 + bi) * 0.2 + Math.sin(frame * 0.05 + bi * 1.5) * 0.1;

                    return Array.from({ length: BARS }).map((__, i) => {
                        const bin = Math.floor((i / BARS) * 32);
                        const amp = Math.min((viz[bin] ?? 0) * 4.2 * bScale, 1);
                        return (
                            <div key={`${bi}-${i}`} style={{
                                position: 'absolute', left: bi * bW + i * barW, bottom: 0,
                                width: barW - 1, height: Math.max(4, amp * maxH),
                                background: `hsl(${120 + amp * 40}, 100%, ${45 + amp * 45}%)`,
                                opacity: 0.7 + amp * 0.3,
                                boxShadow: amp > 0.5 ? `0 0 10px hsla(120, 100%, 50%, 0.5)` : 'none',
                                zIndex: 5
                            }} />
                        );
                    });
                });
            })()}

            {viz[0] > 0.4 && <AbsoluteFill style={{ background: `rgba(255,255,255,${bass * 0.1})`, pointerEvents: 'none' }} />}
            <style>{`
                @keyframes pulse {
                    from { transform: scale(1); opacity: 0.8; }
                    to { transform: scale(1.1); opacity: 1; }
                }
            `}</style>
        </AbsoluteFill>
    );
};
