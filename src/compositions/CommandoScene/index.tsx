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
const ARENA_MIN_Y = 200;
const ARENA_MAX_Y = 1000;

const BULLET_SPEED = 50;
const ENEMY_SPEED = 6;
const COMMANDO_SPEED = 8;
const WAVE_COOLDOWN = 180; // 3 seconds at 60fps

// Types
type Point = { x: number; y: number };

type WorldObject = {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'crate' | 'bush' | 'tower' | 'tree' | 'stone';
};

type Enemy = {
    id: number;
    type: 'type_1' | 'type_2' | 'type_3';
    startF: number;
    basePath: Point[];
    finalPath: Point[];
    deadF: number | null;
    headshot: boolean;
    assignedShotIdx: number | null;
};

type Bullet = {
    id: number;
    startF: number;
    startX: number;
    startY: number;
    hitF: number | null;
    hitX?: number; // Pre-calculated target for Interpolation
    hitY?: number;
    isEnemy: boolean;
    absorbedByObjectId: number | null;
};

type Explosion = { frame: number; x: number; y: number; type: 'head' | 'body' | 'spark' };

// Helpers

const checkCollision = (p: Point, objs: WorldObject[]): WorldObject | null => {
    for (const o of objs) {
        if (p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y - o.h && p.y <= o.y) {
            return o;
        }
    }
    return null;
};

const generatePath = (dur: number, minX: number, maxX: number, minY: number, maxY: number, speed: number, seedStr: string, objs: WorldObject[]): Point[] => {
    const path = new Array<Point>(dur);
    let curX = minX + sr(`${seedStr}-startX`) * (maxX - minX);
    let curY = minY + sr(`${seedStr}-startY`) * (maxY - minY);
    let targetX = minX + sr(`${seedStr}-tx-0`) * (maxX - minX);
    let targetY = minY + sr(`${seedStr}-ty-0`) * (maxY - minY);
    let targetIdx = 0;

    for (let f = 0; f < dur; f++) {
        const dx = targetX - curX;
        const dy = targetY - curY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed * 2) {
            targetIdx++;
            targetX = minX + sr(`${seedStr}-tx-${targetIdx}`) * (maxX - minX);
            targetY = minY + sr(`${seedStr}-ty-${targetIdx}`) * (maxY - minY);
        }

        if (dist > 0.1) {
            const stepX = (dx / dist) * speed;
            const stepY = (dy / dist) * speed;

            const nextP = { x: curX + stepX, y: curY + stepY };
            const obj = checkCollision(nextP, objs);
            if (obj) {
                const distToTop = Math.abs(nextP.y - (obj.y - obj.h));
                const distToBottom = Math.abs(nextP.y - obj.y);
                if (distToTop < distToBottom) curY -= speed * 1.5;
                else curY += speed * 1.5;
                curX -= speed * 0.2;
            } else {
                curX += stepX;
                curY += stepY;
            }
        }

        if (curX < minX) curX = minX; if (curX > maxX) curX = maxX;
        if (curY < minY) curY = minY; if (curY > maxY) curY = maxY;
        path[f] = { x: curX, y: curY };
    }
    return path;
};

const generateEnemyPath = (dur: number, spawnF: number, arenaMinY: number, arenaMaxY: number, speed: number, seedStr: string, objs: WorldObject[]): Point[] => {
    const path = new Array<Point>(dur);
    const inactivePos = { x: 3000, y: 1500 };

    let curX = 2000 + sr(`${seedStr}-spx`) * 200;
    let curY = arenaMinY + sr(`${seedStr}-spy`) * (arenaMaxY - arenaMinY);
    const driftY = (sr(`${seedStr}-drift`) - 0.5) * 0.4;

    for (let f = 0; f < dur; f++) {
        if (f < spawnF) {
            path[f] = { ...inactivePos };
            continue;
        }

        // LOOK-AHEAD: Check if intended movement hits something
        let nextX = curX - speed;
        let nextY = curY + driftY;

        // Horizontal look-ahead buffer
        const lookAheadP = { x: nextX - 30, y: nextY };
        const obj = checkCollision(lookAheadP, objs);

        if (obj) {
            // Blocked horizontally! Stay at current X, move ONLY vertically to bypass
            const distToTop = Math.abs(curY - (obj.y - obj.h));
            const distToBottom = Math.abs(curY - obj.y);

            if (distToTop < distToBottom) curY -= speed * 1.5;
            else curY += speed * 1.5;

            // Still "walking" in place horizontally
            path[f] = { x: curX, y: curY };
        } else {
            // Clear path
            curX = nextX;
            curY = nextY;
            // STRICT CLAMP: Never cross the 1100 barrier
            if (curX < 1100) curX = 1100;
            path[f] = { x: curX, y: curY };
        }

        // Clamp Y to arena
        if (curY < arenaMinY) curY = arenaMinY;
        if (curY > arenaMaxY) curY = arenaMaxY;
        path[f].y = curY;
    }
    return path;
};

export const CommandoScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, durationInFrames } = useVideoConfig();

    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    const engine = useMemo(() => {
        if (!audioData) return null;

        const worldObjects: WorldObject[] = [
            { id: 101, x: 700, y: 400, w: 80, h: 80, type: 'crate' },
            { id: 102, x: 800, y: 700, w: 100, h: 100, type: 'bush' },
            { id: 106, x: 1100, y: 220, w: 90, h: 150, type: 'tree' },
            { id: 107, x: 1600, y: 600, w: 70, h: 50, type: 'stone' },
        ];

        const commandoShots: number[] = [];
        const threshold = 0.35;
        for (let f = 0; f < durationInFrames; f++) {
            const fViz = visualizeAudio({ fps, frame: f, audioData, numberOfSamples: 64 });
            const fBass = (fViz[0] + fViz[1] + fViz[2]) / 3;
            const pViz = f > 0 ? visualizeAudio({ fps, frame: f - 1, audioData, numberOfSamples: 64 }) : null;
            const pBass = pViz ? (pViz[0] + pViz[1] + pViz[2]) / 3 : 0;
            if (fBass > threshold && pBass <= threshold) commandoShots.push(f);
        }

        // Territory limits
        const ENEMY_MIN_X = 1100;
        const MISS_RATE = 0.3; // 30% chance for a shot to be a dud

        // Simulation state
        const enemies: Enemy[] = [];
        let eId = 0;
        let lastWaveF = -WAVE_COOLDOWN;
        const usedShotIndices = new Set<number>();

        // Wave logic: One squad of 5 at a time
        for (let f = 0; f < durationInFrames; f++) {
            const hasAudioBeat = commandoShots.includes(f);

            // Census: is the previous wave CLEARED (entire squad dead)?
            const aliveInWave = enemies.filter(e => {
                const isAlive = e.deadF === null || f < e.deadF;
                return isAlive;
            });

            if (hasAudioBeat && aliveInWave.length === 0 && f > lastWaveF + WAVE_COOLDOWN) {
                // Spawn a new squad of 5
                for (let i = 0; i < 5; i++) {
                    const seed = `squad-${lastWaveF}-${i}`;
                    // Enemies stay in the right arena (1100-1800)
                    const basePath = generateEnemyPath(durationInFrames, f, ARENA_MIN_Y, ARENA_MAX_Y, ENEMY_SPEED, seed, worldObjects);

                    let deadF: number | null = null;
                    let shotIdx: number | null = null;
                    let headshot = false;

                    // Assignment: find next available shot
                    const si = commandoShots.findIndex((sf, idx) => sf >= f + 10 && !usedShotIndices.has(idx));
                    if (si !== -1) {
                        const isMiss = sr(`miss-${lastWaveF}-${i}`) < MISS_RATE;
                        if (!isMiss) {
                            usedShotIndices.add(si);
                            const sf = commandoShots[si];
                            const sx = 200 + 60; // Estimated muzzle X
                            const ex = basePath[sf].x;
                            // Physical travel time: dist / speed
                            const framesToHit = Math.floor(Math.max(1, (ex - sx) / BULLET_SPEED));
                            deadF = sf + framesToHit;
                            shotIdx = si;
                            headshot = sr(`hs-${seed}`) > 0.5;
                        } else {
                            // Shot is a miss, leave usedShotIndices alone so the bullet still spawns but hit nothing
                        }
                    }

                    const type: 'type_1' | 'type_2' | 'type_3' =
                        i === 0 ? 'type_1' :
                            (i === 1 ? 'type_2' :
                                (i === 2 ? 'type_3' :
                                    (sr(`type-${f}-${i}`) > 0.66 ? 'type_3' : (sr(`type-${f}-${i}`) > 0.33 ? 'type_2' : 'type_1'))));

                    enemies.push({
                        id: eId++, type, startF: f, basePath, finalPath: [...basePath],
                        deadF, headshot, assignedShotIdx: shotIdx
                    });
                }
                lastWaveF = f;
            }
        }

        const enemyBullets: Bullet[] = [];
        let bId = 0;

        // Pass 2: Enemy firing (stay in right)
        for (let f = 0; f < durationInFrames; f++) {
            for (const e of enemies) {
                if (f >= e.startF + fps && (e.deadF === null || f < e.deadF)) {
                    if (e.basePath[f].x > ENEMY_MIN_X && sr(`efire-${f}-${e.id}`) < 0.015) {
                        const sx = e.basePath[f].x - 60;
                        const sy = e.basePath[f].y - 70;
                        let hitF = null;
                        let objId = null;
                        // Enemy bullets fly left
                        for (let tf = f; tf < f + 80; tf++) {
                            const bx = sx - (tf - f) * BULLET_SPEED;
                            const col = checkCollision({ x: bx, y: sy }, worldObjects);
                            if (col) { hitF = tf; objId = col.id; break; }
                            if (bx < -200) break;
                        }
                        enemyBullets.push({ id: bId++, startF: f, startX: sx, startY: sy, hitF, isEnemy: true, absorbedByObjectId: objId });
                    }
                }
            }
        }

        // Pass 3: Commando movement & territory lock
        const cBasePath = generatePath(durationInFrames, ARENA_L_MIN_X, ARENA_L_MAX_X, ARENA_MIN_Y, ARENA_MAX_Y, COMMANDO_SPEED, "commando", worldObjects);
        const cFinal: Point[] = new Array(durationInFrames);
        let curD = 0;
        let velD = 0;
        for (let f = 0; f < durationInFrames; f++) {
            let force = 0;
            for (const b of enemyBullets) {
                if (f >= b.startF && (b.hitF === null || f < b.hitF)) {
                    const bx = b.startX - (f - b.startF) * BULLET_SPEED;
                    const bDistX = bx - cBasePath[f].x;
                    const bDistY = b.startY - (cBasePath[f].y - 70);
                    if (bDistX > -50 && bDistX < 300 && Math.abs(bDistY) < 80) force += bDistY > 0 ? -2.5 : 2.5;
                }
            }
            force += -0.15 * curD;
            velD = (velD + force) * 0.85;
            curD += velD;
            let cy = cBasePath[f].y + curD;
            if (cy < ARENA_MIN_Y) cy = ARENA_MIN_Y; if (cy > ARENA_MAX_Y) cy = ARENA_MAX_Y;
            let cx = cBasePath[f].x;
            if (cx > ARENA_L_MAX_X) cx = ARENA_L_MAX_X;
            cFinal[f] = { x: cx, y: cy };
        }

        // Pass 4: Strictly Horizontal Bullets & Shiver-Shatter
        const explosions: Explosion[] = [];
        const cBullets: Bullet[] = [];
        for (let si = 0; si < commandoShots.length; si++) {
            const sf = commandoShots[si];
            const sx = cFinal[sf].x + 60;
            const sy = cFinal[sf].y - 70;

            const target = enemies.find(e => e.assignedShotIdx === si);
            if (target && target.deadF !== null) {
                // Guaranteed Hit trajectory (locked Y)
                const hitF = target.deadF;
                const tx = target.basePath[hitF].x;
                // STRICTLY HORIZONTAL - sy is the locked muzzle height

                // Check for object block
                let blockF = null, blockId = null;
                for (let tf = sf; tf <= hitF; tf++) {
                    const t = (tf - sf) / (hitF - sf);
                    const bx = sx + (tx - sx) * t;
                    const by = sy;
                    const col = checkCollision({ x: bx, y: by }, worldObjects);
                    if (col) { blockF = tf; blockId = col.id; break; }
                }

                if (blockId) {
                    const t = (blockF! - sf) / (hitF - sf);
                    const bx = sx + (tx - sx) * t;
                    cBullets.push({ id: bId++, startF: sf, startX: sx, startY: sy, hitF: blockF, hitX: bx, hitY: sy, isEnemy: false, absorbedByObjectId: blockId });
                    explosions.push({ frame: blockF!, x: bx, y: sy, type: 'spark' });
                } else {
                    cBullets.push({ id: bId++, startF: sf, startX: sx, startY: sy, hitF, hitX: tx, hitY: sy, isEnemy: false, absorbedByObjectId: null });
                    // Explosion at target Y
                    explosions.push({ frame: hitF, x: tx, y: target.headshot ? target.basePath[hitF].y - 110 : target.basePath[hitF].y - 65, type: target.headshot ? 'head' : 'body' });
                }
            } else {
                // Miss or shoot at void
                let hF = null, oId = null;
                const maxF = Math.min(sf + 50, durationInFrames - 1);
                for (let tf = sf; tf <= maxF; tf++) {
                    const bx = sx + (tf - sf) * BULLET_SPEED;
                    const col = checkCollision({ x: bx, y: sy }, worldObjects);
                    if (col) { hF = tf; oId = col.id; break; }
                }
                const finF = hF ?? maxF;
                const finX = sx + (finF - sf) * BULLET_SPEED;
                cBullets.push({ id: bId++, startF: sf, startX: sx, startY: sy, hitF: finF, hitX: finX, hitY: sy, isEnemy: false, absorbedByObjectId: oId });
                if (hF && oId) explosions.push({ frame: hF, x: finX, y: sy, type: 'spark' });
            }
        }

        // Finalize visuals: dead enemies stop
        for (const e of enemies) {
            if (e.deadF !== null) {
                const fHit = e.deadF;
                for (let f = fHit + 1; f < durationInFrames; f++) {
                    e.finalPath[f] = { x: e.basePath[fHit].x, y: e.basePath[fHit].y };
                }
            }
        }

        return {
            commandoShots, enemies, enemyBullets, cTimeline: cFinal, cBullets, explosions, worldObjects
        };
    }, [audioData, fps, width, durationInFrames]);

    // --- Skinning System (Data-Driven) ---
    // Import configuration from settings/Commando.json
    // If field is empty, fallback to bot-generated SVGs
    // Note: We use a simple object for local simulation, in production this would be an import
    const settings = {
        hero: { skin: "" },
        enemies: { type_1: "", type_2: "", type_3: "" },
        objects: { crate: "", bush: "", tower: "", tree: "", stone: "" },
        bullets: { hero: "", enemy: "" },
        landscape: { background: "" }
    };

    const WorldObjectSprite = ({ obj }: { obj: WorldObject }) => {
        const skin = settings.objects[obj.type];
        if (skin) return <img src={skin} style={{ position: 'absolute', left: obj.x, top: obj.y - obj.h, width: obj.w, height: obj.h, zIndex: Math.floor(obj.y) }} alt={obj.type} />;

        return (
            <div style={{ position: 'absolute', left: obj.x, top: obj.y - obj.h, width: obj.w, height: obj.h, zIndex: Math.floor(obj.y) }}>
                {obj.type === 'crate' && <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}><rect width="100" height="100" fill="#5d4037" /><line x1="0" y1="0" x2="100" y2="100" stroke="#3e2723" strokeWidth="4" /><line x1="100" y1="0" x2="0" y2="100" stroke="#3e2723" strokeWidth="4" /></svg>}
                {obj.type === 'bush' && <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}><circle cx="50" cy="50" r="45" fill="#2e7d32" /><circle cx="30" cy="40" r="25" fill="#388e3c" /></svg>}
                {obj.type === 'tower' && <svg viewBox="0 0 100 250" style={{ width: '100%', height: '100%' }}><rect x="10" y="50" width="80" height="200" fill="#455a64" /><rect x="25" y="70" width="50" height="40" fill="#90a4ae" /></svg>}
                {obj.type === 'tree' && <svg viewBox="0 0 100 200" style={{ width: '100%', height: '100%' }}><rect x="40" y="140" width="20" height="60" fill="#4e342e" /><path d="M50 20 L10 150 L90 150 Z" fill="#1b5e20" /><path d="M50 50 L20 120 L80 120 Z" fill="#2e7d32" /></svg>}
                {obj.type === 'stone' && <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}><path d="M10 90 Q15 20 50 10 Q85 20 90 90 Z" fill="#616161" /><path d="M30 40 Q40 30 50 40" stroke="#424242" fill="none" /></svg>}
            </div>
        );
    };

    const CommandoSprite = ({ x, y, firing }: { x: number; y: number; firing: boolean }) => {
        if (settings.hero.skin) return <img src={settings.hero.skin} style={{ position: 'absolute', left: x - 60, top: y - 140, width: 120, height: 140, zIndex: Math.floor(y) }} alt="hero" />;

        return (
            <div style={{ position: 'absolute', left: x - 60, top: y - 140, width: 120, height: 140, zIndex: Math.floor(y) }}>
                <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%', filter: 'drop-shadow(8px 8px 0px rgba(0,0,0,0.4))' }}>
                    <path d="M35 70 L25 115 L45 115 L50 85 L55 115 L75 115 L65 70 Z" fill="#3d4c1d" />
                    <rect x="30" y="30" width="40" height="45" fill="#8b7355" />
                    <rect x="38" y="5" width="28" height="28" fill="#f4c2c2" rx="4" />
                    <path d="M45 40 L90 40 L90 55 L45 55 Z" fill="#f4c2c2" />
                    <rect x="70" y="32" width="45" height="15" fill="#222" />
                    {firing && <g transform="translate(115, 39)"><circle r="20" fill="yellow" opacity={0.6}><animate attributeName="r" values="15;25;15" dur="0.1s" repeatCount="indefinite" /></circle></g>}
                </svg>
            </div>
        );
    };

    const ContraSprite = ({ x, y, dead, type }: { x: number; y: number; dead: boolean; type: 'type_1' | 'type_2' | 'type_3' }) => {
        if (dead) return null; // Instant shatter
        if (settings.enemies[type]) return <img src={settings.enemies[type]} style={{ position: 'absolute', left: x - 50, top: y - 130, width: 100, height: 130, zIndex: Math.floor(y), transform: 'scaleX(-1)' }} alt={type} />;

        const uniform = type === 'type_3' ? '#ef6c00' : (type === 'type_2' ? '#1a237e' : '#800000');
        const helmet = type === 'type_3' ? '#4e342e' : (type === 'type_2' ? '#0d47a1' : '#222');
        return (
            <div style={{ position: 'absolute', left: x - 50, top: y - 130, width: 100, height: 130, zIndex: Math.floor(y) }}>
                <svg viewBox="0 0 100 130" style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}>
                    <path d="M40 80 L30 125 L48 125 L50 90 L52 125 L70 125 L60 80 Z" fill={helmet} />
                    <rect x="35" y="40" width="30" height="40" fill={uniform} rx="3" />
                    <rect x="38" y="15" width="26" height="26" fill="#e0ac69" rx="4" />
                    <path d="M45 50 L90 50 L90 65 L45 65 Z" fill="#e0ac69" />
                    <rect x="70" y="42" width="40" height="12" fill="#111" />
                </svg>
            </div>
        );
    };

    const CommandoBullet = ({ bx, by }: { bx: number, by: number }) => {
        if (settings.bullets.hero) return <img src={settings.bullets.hero} style={{ position: 'absolute', left: bx, top: by, width: 25, height: 6, zIndex: 1000 }} alt="bullet" />;
        return <div style={{ position: 'absolute', left: bx, top: by, width: 25, height: 6, background: 'yellow', boxShadow: '0 0 8px yellow', borderRadius: 2, zIndex: 1000 }} />;
    };

    const EnemyBullet = ({ bx, by }: { bx: number, by: number }) => {
        if (settings.bullets.enemy) return <img src={settings.bullets.enemy} style={{ position: 'absolute', left: bx, top: by, width: 20, height: 12, zIndex: 1001 }} alt="ebullet" />;
        return <div style={{ position: 'absolute', left: bx, top: by, width: 20, height: 12, background: '#ff3333', borderRadius: '50%', boxShadow: '0 0 10px #ff0000', zIndex: 1001 }} />;
    };

    if (!audioData || !engine) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
    const curF = Math.floor(frame);
    const { enemies, enemyBullets, cTimeline, cBullets, explosions, worldObjects, commandoShots } = engine;
    const cx = cTimeline[curF]?.x ?? ARENA_L_MIN_X;
    const cy = cTimeline[curF]?.y ?? ARENA_MIN_Y;
    const isFiring = commandoShots.includes(curF);

    const killsSoFar = explosions.filter(e => e.frame <= curF && e.type !== 'spark').length;
    const shotsSoFar = commandoShots.filter(s => s <= curF).length;
    const scoreValue = killsSoFar * 150;
    const accRate = shotsSoFar > 0 ? Math.floor((killsSoFar / shotsSoFar) * 100) : 0;

    return (
        <AbsoluteFill style={{ backgroundColor: '#1a1d1a', overflow: 'hidden' }}>
            <Audio src={audioUrl} />
            <AbsoluteFill style={settings.landscape.background ? { backgroundImage: `url(${settings.landscape.background})`, backgroundSize: 'cover' } : { background: 'linear-gradient(180deg, #0e121a 0%, #2a3b2a 100%)' }} />
            <div style={{ fontSize: 40, position: 'absolute', top: 40, left: 60, color: '#fff', ...pixelFont, zIndex: 3000 }}>
                SCORE: {String(scoreValue).padStart(6, '0')}
            </div>
            {worldObjects.map(o => <WorldObjectSprite key={o.id} obj={o} />)}
            <CommandoSprite x={cx} y={cy} firing={isFiring} />
            {enemies.map(e => <ContraSprite key={e.id} x={e.finalPath[curF].x} y={e.finalPath[curF].y} dead={e.deadF !== null && curF >= e.deadF} type={e.type} />)}
            {cBullets.map(b => {
                if (curF < b.startF || (b.hitF !== null && curF > b.hitF)) return null;
                const t = b.hitF ? (curF - b.startF) / (b.hitF - b.startF) : 0;
                const bx = b.startX + ((b.hitX ?? b.startX) - b.startX) * t;
                const by = b.startY + ((b.hitY ?? b.startY) - b.startY) * t;
                return <CommandoBullet key={b.id} bx={bx} by={by} />;
            })}
            {enemyBullets.map(b => (curF >= b.startF && (b.hitF === null || curF <= b.hitF)) && <EnemyBullet key={b.id} bx={b.startX - (curF - b.startF) * BULLET_SPEED} by={b.startY} />)}
            {engine.explosions.map((exp, idx) => {
                const age = curF - exp.frame;
                const isSpark = exp.type === 'spark';
                if (age < 0 || age > (isSpark ? 12 : 28)) return null;

                // Segmented Shatter Colors - CHUNKY ULTRA EDITION
                const color = exp.type === 'head' ? '#333' : (exp.type === 'body' ? '#d32f2f' : '#ffea00');
                const particleCount = exp.type === 'head' ? 20 : (exp.type === 'body' ? 45 : 8);

                return (
                    <React.Fragment key={`exp-${idx}`}>
                        {Array.from({ length: particleCount }).map((_, fi) => {
                            // High velocity surge
                            const speed = (isSpark ? 8 : 20) + sr(exp.frame + fi) * (isSpark ? 15 : 60);
                            const angle = sr(exp.frame + fi * 2) * Math.PI * 2;
                            const vx = Math.cos(angle) * speed;
                            const vy = Math.sin(angle) * speed - (isSpark ? 12 : 50);

                            // CHUNKY SIZE (18-30px blocks)
                            const size = isSpark ? 6 : (sr(fi) > 0.6 ? 30 : 20);
                            const rotation = sr(fi + age) * 360;

                            // Initial spread for frame 0
                            const spreadAge = age + 0.1;

                            return (
                                <div
                                    key={fi}
                                    style={{
                                        position: 'absolute',
                                        left: exp.x + vx * spreadAge,
                                        top: exp.y + vy * spreadAge + (isSpark ? 0.4 : 1.5) * spreadAge * spreadAge,
                                        width: size,
                                        height: size,
                                        background: color,
                                        opacity: 1 - age / (isSpark ? 12 : 28),
                                        zIndex: 4000,
                                        transform: `rotate(${rotation}deg)`,
                                        border: '1px solid rgba(0,0,0,0.4)',
                                        boxShadow: '4px 4px 0px rgba(0,0,0,0.3)'
                                    }}
                                />
                            );
                        })}
                    </React.Fragment>
                );
            })}

            <div style={{ position: 'absolute', top: 40, left: 60, color: '#fff', fontSize: 40, ...pixelFont, zIndex: 3000, textShadow: '4px 4px 1px #000' }}>
                SCORE: {String(scoreValue).padStart(6, '0')}<br /><span style={{ fontSize: 18, color: '#8bc34a', letterSpacing: 2 }}>ACCURACY: {accRate}%</span>
            </div>
            <div style={{ position: 'absolute', bottom: 40, right: 60, color: '#ff5252', fontSize: 24, ...pixelFont, zIndex: 3000, textShadow: '2px 2px 0px #000' }}>STAGE 1: JUNGLE TRENCH</div>
            <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 9999 }} />
        </AbsoluteFill>
    );
};
