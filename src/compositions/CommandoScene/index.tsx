import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { random } from 'remotion';

const pixelFont = {
    fontFamily: '"Press Start 2P", monospace',
    textTransform: 'uppercase' as const,
};

// Seeded random helper
const sr = (seed: number | string) => random(`commando-${seed}`);

// Game constants
const ARENA_L_MIN_X = 100;
const ARENA_L_MAX_X = 600;
const ARENA_R_MIN_X = 1100;
const ARENA_R_MAX_X = 1800;
const ARENA_MIN_Y = 200;
const ARENA_MAX_Y = 1000;

const BULLET_SPEED = 50;
const ENEMY_SPEED = 6;
const COMMANDO_SPEED = 8;
const ENEMY_FIRE_RATE = 0.01;

// Types
type Point = { x: number; y: number };
type Enemy = {
    id: number;
    startF: number;
    killShotF: number;
    basePath: Point[];
    finalPath: Point[];
    deadF: number | null;
    headshot: boolean;
};
type Bullet = {
    id: number;
    startF: number;
    startX: number;
    startY: number;
    hitF: number | null;
    isEnemy: boolean;
};
type Explosion = { frame: number; x: number; y: number; type: 'head' | 'body' };

// Helpers
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const generatePath = (dur: number, minX: number, maxX: number, minY: number, maxY: number, speed: number, seedStr: string): Point[] => {
    const path = new Array<Point>(dur);
    let curX = minX + sr(`${seedStr}-startX`) * (maxX - minX);
    let curY = minY + sr(`${seedStr}-startY`) * (maxY - minY);
    let targetX = curX;
    let targetY = curY;

    for (let f = 0; f < dur; f++) {
        const dx = targetX - curX;
        const dy = targetY - curY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed * 2) {
            targetX = minX + sr(`${seedStr}-tx-${f}`) * (maxX - minX);
            targetY = minY + sr(`${seedStr}-ty-${f}`) * (maxY - minY);
        }

        if (dist > 0.1) {
            curX += (dx / dist) * speed;
            curY += (dy / dist) * speed;
        }
        path[f] = { x: curX, y: curY };
    }
    return path;
};

const generateEnemyPath = (dur: number, spawnF: number, minX: number, maxX: number, minY: number, maxY: number, speed: number, seedStr: string): Point[] => {
    const path = new Array<Point>(dur);
    const inactivePos = { x: 3000, y: 1500 };
    let curX = 2200 + sr(`${seedStr}-spx`) * 400;
    let curY = minY + sr(`${seedStr}-spy`) * (maxY - minY);
    let targetX = minX + sr(`${seedStr}-tx-init`) * (maxX - minX);
    let targetY = curY;

    for (let f = 0; f < dur; f++) {
        if (f < spawnF) {
            path[f] = { ...inactivePos };
            continue;
        }
        const dx = targetX - curX;
        const dy = targetY - curY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let currentSpeed = speed;
        if (curX > maxX + 100) {
            currentSpeed = speed * 1.5;
            targetY = curY;
            targetX = minX + sr(`${seedStr}-tx-f-${f}`) * (maxX - minX);
        } else if (dist < speed * 2) {
            targetX = minX + sr(`${seedStr}-tx-${f}`) * (maxX - minX);
            targetY = minY + sr(`${seedStr}-ty-${f}`) * (maxY - minY);
        }

        if (dist > 0.1) {
            curX += (dx / dist) * currentSpeed;
            curY += (dy / dist) * currentSpeed;
        }
        path[f] = { x: curX, y: curY };
    }
    return path;
};


export const CommandoScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, durationInFrames } = useVideoConfig();

    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    // --- DETERMINISTIC 6-PASS ENGINE ---
    const engine = useMemo(() => {
        if (!audioData) return null;

        // --- PASS 1: AUDIO (Shots) ---
        const commandoShots: number[] = [];
        const threshold = 0.35;
        for (let f = 0; f < durationInFrames; f++) {
            const fViz = visualizeAudio({ fps, frame: f, audioData, numberOfSamples: 64 });
            const fBass = (fViz[0] + fViz[1] + fViz[2]) / 3;
            const pViz = f > 0 ? visualizeAudio({ fps, frame: f - 1, audioData, numberOfSamples: 64 }) : null;
            const pBass = pViz ? (pViz[0] + pViz[1] + pViz[2]) / 3 : 0;

            if (fBass > threshold && pBass <= threshold) {
                commandoShots.push(f);
            }
        }

        // --- PASS 2: SQUAD ASSIGNMENT (70% Hit Rate) ---
        const enemies: Enemy[] = [];
        let eId = 0;
        const SQUAD_CHUNK = 5;
        const HIT_RATE = 0.70;
        const shotResults: { f: number, hit: boolean, enemy: Enemy | null }[] = [];

        for (let i = 0; i < commandoShots.length; i += SQUAD_CHUNK) {
            const chunk = commandoShots.slice(i, i + SQUAD_CHUNK);
            const spawnF = Math.max(0, chunk[0] - Math.floor(fps * 2.5));

            for (const sf of chunk) {
                const isHit = sr(`hitrate-${sf}`) < HIT_RATE;
                let assignedEnemy = null;

                if (isHit) {
                    assignedEnemy = {
                        id: eId++,
                        startF: spawnF,
                        killShotF: sf,
                        basePath: generateEnemyPath(durationInFrames, spawnF, ARENA_R_MIN_X, ARENA_R_MAX_X, ARENA_MIN_Y, ARENA_MAX_Y, ENEMY_SPEED, `enemy-${eId}`),
                        finalPath: [],
                        deadF: null,
                        headshot: sr(`hs-${sf}`) > 0.5
                    };
                    enemies.push(assignedEnemy);
                }
                shotResults.push({ f: sf, hit: isHit, enemy: assignedEnemy });
            }
        }

        // --- PASS 3: ENEMY FIRE ---
        const enemyBullets: Bullet[] = [];
        let bId = 0;
        for (let f = 0; f < durationInFrames; f++) {
            for (const e of enemies) {
                // Approximate time they are alive based on KillShotF
                if (f >= e.startF + fps && f < e.killShotF) {
                    if (e.basePath[f].x < width + 100) {
                        if (sr(`efire-${f}-${e.id}`) < ENEMY_FIRE_RATE) {
                            enemyBullets.push({
                                id: bId++,
                                startF: f,
                                startX: e.basePath[f].x - 60,
                                startY: e.basePath[f].y - 70,
                                hitF: null,
                                isEnemy: true
                            });
                        }
                    }
                }
            }
        }

        // --- PASS 4: COMMANDO PATH & DODGE ---
        const commandoBasePath = generatePath(durationInFrames, ARENA_L_MIN_X, ARENA_L_MAX_X, ARENA_MIN_Y, ARENA_MAX_Y, COMMANDO_SPEED, "commando");
        const commandoDodgeY = new Float32Array(durationInFrames);
        const commandoFinalTimeline: Point[] = new Array(durationInFrames);
        let curDodge = 0;

        for (let f = 0; f < durationInFrames; f++) {
            let cx = commandoBasePath[f].x;
            let cy = commandoBasePath[f].y + curDodge;

            let dangerDir = 0;
            for (const b of enemyBullets) {
                if (b.startF <= f) {
                    const bx = b.startX - (f - b.startF) * BULLET_SPEED;
                    if (bx > cx - 50 && bx < cx + 300) {
                        const by = b.startY;
                        const headY = cy - 130;
                        const feetY = cy;
                        if (by > headY - 40 && by < feetY + 40) {
                            if (by > headY + 50) dangerDir = -30;
                            else dangerDir = 30;
                        }
                    }
                }
            }

            if (dangerDir !== 0) curDodge += dangerDir * 0.4;
            else curDodge *= 0.85;

            cy = commandoBasePath[f].y + curDodge;
            if (cy < 150) cy = 150;
            if (cy > 1050) cy = 1050;

            commandoFinalTimeline[f] = { x: cx, y: cy };
        }

        // --- PASS 5: COMMANDO BULLETS (Strictly Horizontal) ---
        const cBullets: Bullet[] = [];
        for (const res of shotResults) {
            const sf = res.f;
            const cx = commandoFinalTimeline[sf].x + 60;
            const cy = commandoFinalTimeline[sf].y - 70; // Gun height

            cBullets.push({
                id: bId++,
                startF: sf,
                startX: cx,
                startY: cy,
                hitF: null, // calculated in Pass 6
                isEnemy: false
            });
        }

        // --- PASS 6: FINAL ENEMY PATHS & HITS ---
        const explosions: Explosion[] = [];

        for (const e of enemies) {
            // Find the bullet matching this enemy.
            const shotIndex = shotResults.findIndex(r => r.enemy?.id === e.id);
            const bullet = cBullets[shotIndex]; // The bullet shot exactly for him

            const sf = bullet.startF;
            const exAtShot = e.basePath[sf].x;
            const distance = Math.max(1, exAtShot - bullet.startX);
            const framesToHit = Math.floor(distance / BULLET_SPEED);
            const hitF = sf + framesToHit;

            bullet.hitF = hitF;
            e.deadF = hitF;

            // Where should the enemy be at hitF so the horizontal bullet hits?
            // targetHitY is the vertical coordinate of the bullet.
            // If headshot: targetHitY should be near Enemy's Head (EnemyY - 110) => EnemyY = targetHitY + 110
            // If body: targetHitY should be near Enemy Torso (EnemyY - 60) => EnemyY = targetHitY + 60
            const bulletY = bullet.startY;
            const requiredEnemyY = e.headshot ? bulletY + 110 : bulletY + 60;

            e.finalPath = [...e.basePath]; // copy base

            // Smoothly blend the enemy's Y position into the required position over 45 frames
            const BLEND_FRAMES = 45;
            for (let f = e.startF; f < durationInFrames; f++) {
                if (f > hitF) {
                    e.finalPath[f] = { x: e.basePath[f].x, y: requiredEnemyY };
                } else if (f > hitF - BLEND_FRAMES) {
                    const progress = 1 - ((hitF - f) / BLEND_FRAMES); // 0 to 1
                    // ease-in-out curve
                    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    e.finalPath[f] = {
                        x: e.basePath[f].x,
                        y: lerp(e.basePath[f].y, requiredEnemyY, ease)
                    };
                }
            }

            explosions.push({
                frame: hitF,
                x: e.finalPath[hitF].x,
                y: bulletY, // Exactly at bullet height
                type: e.headshot ? 'head' : 'body'
            });
        }

        // Deal with Miss bullets (let them fly offscreen)
        for (let i = 0; i < cBullets.length; i++) {
            if (!shotResults[i].hit) {
                // Arbitrary hitF far in the future so it renders flying horizontally
                cBullets[i].hitF = durationInFrames + 100;
            }
        }

        return {
            commandoShots,
            enemies,
            enemyBullets,
            commandoTimeline: commandoFinalTimeline,
            cBullets,
            explosions,
            totalHits: enemies.length,
            totalShots: commandoShots.length
        };

    }, [audioData, fps, width, durationInFrames]);

    // --- RENDERERS ---

    const CommandoSprite = ({ x, y, firing }: { x: number, y: number, firing: boolean }) => (
        <div style={{ position: 'absolute', left: x - 60, top: y - 140, width: 120, height: 140, zIndex: Math.floor(y) }}>
            <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%', filter: 'drop-shadow(8px 8px 0px rgba(0,0,0,0.4))' }}>
                {/* Legs */}
                <path d="M35 70 L25 115 L45 115 L50 85 L55 115 L75 115 L65 70 Z" fill="#3d4c1d" />
                <path d="M25 105 L45 105 L45 115 L25 115 Z M55 105 L75 105 L75 115 L55 115 Z" fill="#1b1b1b" />
                {/* Torso (Vest) */}
                <rect x="30" y="30" width="40" height="45" fill="#8b7355" rx="2" />
                <rect x="35" y="35" width="30" height="10" fill="#a08665" />
                {/* Head */}
                <rect x="38" y="5" width="28" height="28" fill="#f4c2c2" rx="4" />
                <rect x="38" y="12" width="28" height="6" fill="#cc0000" /> {/* Bandana */}
                <path d="M66 12 L80 15 L80 20 L66 18 Z" fill="#cc0000" /> {/* Bandana tail */}
                {/* Arms & Weapon */}
                <path d="M45 40 L90 40 L90 55 L45 55 Z" fill="#f4c2c2" />
                <rect x="70" y="32" width="45" height="15" fill="#222" rx="2" /> {/* Rifle */}
                <rect x="75" y="47" width="10" height="10" fill="#333" /> {/* Grip */}
                {firing && (
                    <g transform="translate(115, 39)">
                        <circle r="20" fill="yellow" opacity={0.6}>
                            <animate attributeName="r" values="15;25;15" dur="0.1s" repeatCount="indefinite" />
                        </circle>
                        <circle r="10" fill="white" opacity={0.8} />
                    </g>
                )}
            </svg>
        </div>
    );

    const ContraSprite = ({ x, y, dead }: { x: number, y: number, dead: boolean }) => {
        if (dead) return null;
        const bob = Math.sin(frame * 0.4) * 4;

        return (
            <div style={{ position: 'absolute', left: x - 50, top: y - 130 + bob, width: 100, height: 130, zIndex: Math.floor(y) }}>
                <svg viewBox="0 0 100 130" style={{ width: '100%', height: '100%', transform: 'scaleX(-1)', filter: 'drop-shadow(6px 6px 0px rgba(0,0,0,0.4))' }}>
                    {/* Legs */}
                    <path d="M40 80 L30 125 L48 125 L50 90 L52 125 L70 125 L60 80 Z" fill="#222" />
                    {/* Torso */}
                    <rect x="35" y="40" width="30" height="40" fill="#800000" rx="3" />
                    {/* Head */}
                    <rect x="38" y="15" width="26" height="26" fill="#e0ac69" rx="4" />
                    <rect x="38" y="15" width="26" height="8" fill="#333" /> {/* Cap */}
                    {/* Arms & Weapon */}
                    <path d="M45 50 L90 50 L90 65 L45 65 Z" fill="#e0ac69" />
                    <rect x="70" y="42" width="40" height="12" fill="#111" rx="1" />
                </svg>
            </div>
        );
    };

    if (!audioData || !engine) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const cx = engine.commandoTimeline[frame].x;
    const cy = engine.commandoTimeline[frame].y;
    const isFiring = engine.commandoShots.includes(frame);

    const score = engine.explosions.filter(e => e.frame <= frame).length * 150;
    const hitRate = Math.round((engine.totalHits / Math.max(1, engine.totalShots)) * 100);

    return (
        <AbsoluteFill style={{ backgroundColor: '#1a1d1a', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* BACKGROUND LAYERS */}
            {/* 1. Sky */}
            <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0e121a 0%, #2a3b2a 100%)', zIndex: 0 }} />

            {/* 2. Distant Hills (Slow Parallax) */}
            <div style={{ position: 'absolute', bottom: 400, left: 0, width: '200%', display: 'flex', transform: `translateX(${-frame * 0.5 % width}px)`, opacity: 0.4 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{
                        width: 500, height: 200, background: '#1b261b',
                        clipPath: 'polygon(0% 100%, 50% 20%, 100% 100%)', marginRight: -50
                    }} />
                ))}
            </div>

            {/* 3. Middle Ground Trench/Rocks (Medium Parallax) */}
            <div style={{ position: 'absolute', bottom: 350, left: 0, width: '200%', display: 'flex', transform: `translateX(${-frame * 1.5 % width}px)`, opacity: 0.6 }}>
                {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{
                        width: 300, height: 100, background: '#2a3b2a',
                        clipPath: 'polygon(0% 100%, 20% 70%, 50% 90%, 80% 60%, 100% 100%)', marginRight: -20
                    }} />
                ))}
            </div>

            {/* 4. GROUND FLOOR */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 500, background: '#1c1f1a', zIndex: 1 }} />

            {/* Ground Texture / Grass Patches */}
            {Array.from({ length: 40 }).map((_, i) => {
                const gx = (sr(`gx-${i}`) * width * 2 - (frame * 5) % (width * 2));
                const gy = 600 + sr(`gy-${i}`) * 400;
                return (
                    <div key={i} style={{ position: 'absolute', left: gx, top: gy, width: 20, height: 4, background: '#2a3b2a', opacity: 0.3, zIndex: 2 }} />
                );
            })}

            {/* BATTLEFIELD PROPS */}
            {Array.from({ length: 12 }).map((_, i) => {
                const px = (sr(`px-${i}`) * width * 3 - (frame * 5) % (width * 3));
                const py = 550 + sr(`py-${i}`) * 450;
                const type = sr(`ptype-${i}`); // 0: crate, 1: sandbag, 2: wire

                return (
                    <div key={i} style={{ position: 'absolute', left: px, top: py, zIndex: Math.floor(py) }}>
                        {type < 0.33 ? (
                            <svg width="60" height="60" viewBox="0 0 60 60">
                                <rect width="60" height="60" fill="#5d4037" stroke="#3e2723" strokeWidth="4" />
                                <line x1="0" y1="0" x2="60" y2="60" stroke="#3e2723" strokeWidth="2" />
                                <line x1="60" y1="0" x2="0" y2="60" stroke="#3e2723" strokeWidth="2" />
                            </svg>
                        ) : type < 0.66 ? (
                            <svg width="80" height="40" viewBox="0 0 80 40">
                                <rect width="80" height="40" rx="10" fill="#78909c" />
                                <line x1="0" y1="20" x2="80" y2="20" stroke="#455a64" strokeWidth="2" />
                            </svg>
                        ) : (
                            <svg width="100" height="30" viewBox="0 0 100 30">
                                <path d="M0 15 Q 10 0, 20 15 T 40 15 T 60 15 T 80 15 T 100 15" fill="none" stroke="#555" strokeWidth="2" />
                                <path d="M0 25 Q 10 10, 20 25 T 40 25 T 60 25 T 80 25 T 100 25" fill="none" stroke="#444" strokeWidth="2" />
                            </svg>
                        )}
                    </div>
                );
            })}

            <CommandoSprite x={cx} y={cy} firing={isFiring} />

            {engine.enemies.map(e => {
                if (frame < e.startF) return null;
                const p = e.finalPath[frame];
                return <ContraSprite key={`e-${e.id}`} x={p.x} y={p.y} dead={e.deadF !== null && frame >= e.deadF} />;
            })}

            {/* BULLETS */}
            {engine.cBullets.map(b => {
                if (frame < b.startF || (b.hitF !== null && frame > b.hitF)) return null;
                const bx = b.startX + (frame - b.startF) * BULLET_SPEED;
                return (
                    <div key={`cb-${b.id}`} style={{
                        position: 'absolute', left: bx, top: b.startY, width: 25, height: 6, background: 'yellow',
                        boxShadow: '0 0 10px yellow, 0 0 20px red', borderRadius: 3, zIndex: 1000
                    }} />
                );
            })}

            {engine.enemyBullets.map(b => {
                if (frame < b.startF) return null;
                const bx = b.startX - (frame - b.startF) * BULLET_SPEED;
                if (bx < -100) return null;
                return (
                    <div key={`eb-${b.id}`} style={{
                        position: 'absolute', left: bx, top: b.startY, width: 30, height: 10, background: '#ff3333',
                        boxShadow: '0 0 20px #ff0000, 0 0 10px #ffffff', borderRadius: 5, zIndex: 1001
                    }} />
                );
            })}

            {engine.explosions.map((exp, idx) => {
                const age = frame - exp.frame;
                if (age < 0 || age > 30) return null;
                const isHead = exp.type === 'head';
                const color = isHead ? '#4caf50' : '#e91e63';

                return (
                    <React.Fragment key={`exp-${idx}`}>
                        {Array.from({ length: 16 }).map((_, fi) => {
                            const speed = 10 + sr(exp.frame + fi) * 30;
                            const angle = sr(exp.frame + fi * 2) * Math.PI * 2;
                            const vx = Math.cos(angle) * speed;
                            const vy = Math.sin(angle) * speed - 15;
                            return (
                                <div key={fi} style={{
                                    position: 'absolute', left: exp.x + vx * age, top: exp.y + vy * age + 1.2 * age * age,
                                    width: isHead ? 8 : 12, height: isHead ? 8 : 12,
                                    background: color, opacity: 1 - age / 30, zIndex: 2000,
                                    borderRadius: sr(fi) > 0.5 ? '50%' : '0%'
                                }} />
                            );
                        })}
                    </React.Fragment>
                );
            })}

            {/* HUD */}
            <div style={{ position: 'absolute', top: 40, left: 60, color: '#fff', fontSize: 40, ...pixelFont, zIndex: 3000, textShadow: '4px 4px 1px #000' }}>
                SCORE: {String(score).padStart(6, '0')}
                <br />
                <span style={{ fontSize: 18, color: '#8bc34a', letterSpacing: 2 }}>ACCURACY: {hitRate}%</span>
            </div>

            <div style={{ position: 'absolute', bottom: 40, right: 60, color: '#ff5252', fontSize: 24, ...pixelFont, zIndex: 3000, textShadow: '2px 2px 0px #000' }}>
                STAGE 1: JUNGLE TRENCH
            </div>

            <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 9999 }} />
        </AbsoluteFill>
    );
};
