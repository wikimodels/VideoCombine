import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData } from '@remotion/media-utils';
import { random } from 'remotion';
import cfg from '../../../public/CommandoScene/CommandoScene.json';

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
const BULLET_SPEED = 30; // Reduced bullet flight speed
const ENEMY_SPEED = 6;

// ─── Derived from config ────────────────────────────────────────────────────
// EnemyType: add type_N in JSON → automatically available everywhere
type EnemyType = Exclude<keyof typeof cfg.enemies, 'count' | 'width' | 'height'>;
const ENEMY_TYPES = (Object.keys(cfg.enemies) as Array<keyof typeof cfg.enemies>)
    .filter((k): k is EnemyType => !['count', 'width', 'height'].includes(k));

// ObjType: position in array = SVG index (crate → object_1.svg, etc.)
const OBJ_TYPES = ['crate', 'bush', 'tower', 'tree', 'stone'] as const;
type ObjType = typeof OBJ_TYPES[number];

type Point = { x: number; y: number };

type WorldObject = {
    id: number; x: number; y: number; w: number; h: number;
    type: ObjType;
};

type Enemy = {
    id: number;
    type: EnemyType;
    startF: number;
    basePath: Point[];
    finalPath: Point[];
    deadF: number | null;
    headshot: boolean;
    assignedShotIdx: number | null;
    shotIndices: number[]; // All shots aimed at this enemy
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

type Particle = { angle: number; speed: number; prng: number; rotSpeed: number; baseRot: number; };
type Explosion = { frame: number; x: number; y: number; type: 'head' | 'body' | 'spark'; particles: Particle[] };

const createExplosion = (frame: number, x: number, y: number, type: 'head' | 'body' | 'spark'): Explosion => {
    const particleCount = type === 'head' ? 40 : (type === 'body' ? 80 : 8);
    const particles = Array.from({ length: particleCount }).map((_, fi) => {
        const seed = frame * 1000 + fi + x;
        return {
            angle: random(seed) * Math.PI * 2,
            speed: 2 + random(seed + 0.1) * 10,
            prng: random(seed + 0.2),
            rotSpeed: (random(seed + 0.3) - 0.5) * 60,
            baseRot: random(seed + 0.4) * 360
        };
    });
    return { frame, x, y, type, particles };
};

// Helpers

const checkCollision = (p: Point, objs: WorldObject[]): WorldObject | null => {
    for (const o of objs) {
        if (p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y - o.h && p.y <= o.y) {
            return o;
        }
    }
    return null;
};

// ─── Muzzle Helpers ─────────────────────────────────────────────────────────
// Derive world-space muzzle position from sprite anchor (cx,cy = feet center)
const getHeroMuzzle = (cx: number, cy: number) => ({
    x: (cx - cfg.hero.width / 2) + cfg.hero.muzzleOffsetX,
    y: (cy - cfg.hero.height) + cfg.hero.muzzleOffsetY,
});
const getEnemyMuzzle = (ex: number, ey: number, type: EnemyType) => ({
    x: (ex - cfg.enemies.width / 2) + cfg.enemies[type].muzzleOffsetX,
    y: (ey - cfg.enemies.height) + cfg.enemies[type].muzzleOffsetY,
});

// Convention: type_N → enemy_N.svg | OBJ_TYPES[i] → object_(i+1).svg
const enemySvgIndex = (type: EnemyType): number => parseInt(type.split('_')[1]);
const objSvgIndex = (type: ObjType): number => OBJ_TYPES.indexOf(type) + 1;

const generateEnemyPath = (dur: number, spawnF: number, arenaMinY: number, arenaMaxY: number, speed: number, seedStr: string, objs: WorldObject[]): Point[] => {
    const path = new Array<Point>(dur);
    const inactivePos = { x: 3000, y: 1500 };

    const ENEMY_MIN_X = 1100;
    const ENEMY_MAX_X = 1800;

    // We will generate a list of exact Waypoints on the timeline
    // 1. Initial Position Off-screen Right
    const startX = 2000 + sr(`${seedStr}-spx`) * 200;
    const startY = arenaMinY + sr(`${seedStr}-spy`) * (arenaMaxY - arenaMinY);

    const waypoints: { frame: number, x: number, y: number }[] = [];
    waypoints.push({ frame: spawnF, x: startX, y: startY });

    let curTargetF = spawnF;

    // Generate waypoints until end of video
    let wIdx = 0;
    while (curTargetF < dur) {
        // Interpolate over a smooth 40-100 frame interval
        const travelFrames = 40 + Math.floor(sr(`${seedStr}-tf-${wIdx}`) * 60);
        curTargetF += travelFrames;

        let nextX = ENEMY_MIN_X + sr(`${seedStr}-tx-${wIdx}`) * (ENEMY_MAX_X - ENEMY_MIN_X);
        let nextY = arenaMinY + sr(`${seedStr}-ty-${wIdx}`) * (arenaMaxY - arenaMinY);

        // Soft obstacle repulsion (waypoints strictly avoid crates/objects)
        let blocked = true;
        let attempts = 0;
        while (blocked && attempts < 5) {
            blocked = false;
            for (const o of objs) {
                // If next waypoint is too close to an object (cushion of 50px)
                if (nextX > o.x - 50 && nextX < o.x + o.w + 50 && nextY > o.y - o.h - 50 && nextY < o.y + 50) {
                    blocked = true;
                    nextY += (sr(`eb-${attempts}`) > 0.5 ? 100 : -100);
                    nextX += (sr(`ebx-${attempts}`) > 0.5 ? 50 : -50);
                    break;
                }
            }
            attempts++;

            // Re-clamp
            if (nextY < arenaMinY) nextY = arenaMinY;
            if (nextY > arenaMaxY) nextY = arenaMaxY;
            if (nextX < ENEMY_MIN_X) nextX = ENEMY_MIN_X;
        }

        waypoints.push({ frame: curTargetF, x: nextX, y: nextY });
        wIdx++;
    }

    // Fill the actual frame-by-frame path using Cubic interpolation between waypoints
    for (let f = 0; f < dur; f++) {
        if (f < spawnF) {
            path[f] = { ...inactivePos };
            continue;
        }

        // Find which waypoints we are between
        let wp1 = waypoints[0];
        let wp2 = waypoints[1];
        for (let i = 0; i < waypoints.length - 1; i++) {
            if (f >= waypoints[i].frame && f <= waypoints[i + 1].frame) {
                wp1 = waypoints[i];
                wp2 = waypoints[i + 1];
                break;
            }
        }

        // At the very end, just hold last position
        if (f > waypoints[waypoints.length - 1].frame) {
            path[f] = { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y };
            continue;
        }

        const durWp = wp2.frame - wp1.frame;
        const p = (f - wp1.frame) / durWp;
        // Cubic Ease In-Out for organic human-like movement
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        path[f] = {
            x: wp1.x + (wp2.x - wp1.x) * ease,
            y: wp1.y + (wp2.y - wp1.y) * ease
        };
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

        // Territory limits
        const ENEMY_MIN_X = 1100;
        const MISS_RATE = 0.3; // 30% chance for a shot to be a dud

        // Pass 1: Timeline Analysis & Spawning (Generate all waves upfront deterministically 3-5-3-5)
        const enemies: Enemy[] = [];
        let eId = 0;

        // Final screen needs about 3 seconds
        const winScreenFrames = 180;
        const playableDuration = durationInFrames - winScreenFrames;

        // Target 4 waves (3, 5, 3, 5) -> 16 enemies total
        const waveCounts = [3, 5, 3, 5];
        const framesPerWave = Math.floor((playableDuration - 60) / waveCounts.length); // 60 frames initial delay

        for (let w = 0; w < waveCounts.length; w++) {
            const waveStartF = 60 + w * framesPerWave;
            const count = waveCounts[w];

            for (let i = 0; i < count; i++) {
                // Stagger enemy spawns by 45 frames within the wave to create a continuous stream
                const spawnF = waveStartF + i * 45;
                const seed = `squad-${spawnF}-${i}`;
                const basePath = generateEnemyPath(durationInFrames, spawnF, ARENA_MIN_Y, ARENA_MAX_Y, ENEMY_SPEED, seed, worldObjects);
                const type: EnemyType = ENEMY_TYPES[i % ENEMY_TYPES.length] ?? ENEMY_TYPES[Math.floor(sr(`type-${spawnF}-${i}`) * ENEMY_TYPES.length)];
                enemies.push({
                    id: eId++, type, startF: spawnF, basePath, finalPath: [...basePath],
                    deadF: null, headshot: sr(`hs-${seed}`) > 0.5, assignedShotIdx: null, shotIndices: []
                });
            }
        }

        // Generate Commando Shots via Forward Simulation (Guarantees ALL enemies die)
        const commandoShots: number[] = [];
        const shotData = new Map<number, { requiredHeroCY: number, targetEnemyId: number | null }>();
        const explosions: Explosion[] = [];
        const cBullets: Bullet[] = [];
        let bId = 0;

        // Pass 2: Dynamic Raycast Physics Engine (Forward Timeline Simulation)
        let lastHeroShotF = 0;

        for (let f = 0; f < playableDuration; f++) {
            const aliveEnemies = enemies.filter(e => e.startF <= f && e.deadF === null);

            // Should hero shoot? (Shoot if enemies are alive, roughly every 15 frames)
            if (aliveEnemies.length > 0 && f > lastHeroShotF + 15) {
                // Target the closest enemy horizontally available on the timeline at frame `f`
                const target = aliveEnemies.reduce((prev, curr) => curr.basePath[f].x < prev.basePath[f].x ? curr : prev);

                const sx = ARENA_L_MIN_X + 100 + Math.sin(f * 0.02) * 80 + cfg.hero.muzzleOffsetX;

                const distToEnemy = target.basePath[f].x - sx;
                const approxFramesToHit = Math.floor(distToEnemy / BULLET_SPEED);
                const hitF_approx = Math.min(f + approxFramesToHit, durationInFrames - 1);

                const interceptY = target.basePath[hitF_approx].y;
                const sy = interceptY - (cfg.enemies.height / 2); // Center of the enemy body

                // Can we miss intentionally for realism?
                const isMiss = sr(`miss-${f}`) < MISS_RATE;
                const finalSy = isMiss ? sy - 150 : sy;

                let hitF = null;
                let hitType: 'enemy' | 'object' | null = null;
                let hitObjectId = null;
                let hitEnemyId = null;

                const maxBulletF = Math.min(f + 60, durationInFrames - 1);
                for (let tf = f; tf <= maxBulletF; tf++) {
                    const bx = sx + (tf - f) * BULLET_SPEED;

                    // 1. Box check against objects
                    const col = checkCollision({ x: bx, y: finalSy }, worldObjects);
                    if (col) { hitF = tf; hitType = 'object'; hitObjectId = col.id; break; }

                    // 2. Box check against ALL alive enemies perfectly inside their box
                    for (const e of aliveEnemies) {
                        if (e.deadF === null) {
                            const ex = e.basePath[tf].x;
                            const ey = e.basePath[tf].y;
                            if (bx > ex - cfg.enemies.width / 2 && bx < ex + cfg.enemies.width / 2 && finalSy > ey - cfg.enemies.height && finalSy < ey) {
                                hitF = tf; hitType = 'enemy'; hitEnemyId = e.id;
                                e.deadF = tf; // INSANT KILL registered on timeline! Thus next frames won't double-tap
                                break;
                            }
                        }
                    }
                    if (hitF !== null) break;
                }

                commandoShots.push(f);
                lastHeroShotF = f + (isMiss ? 0 : 5); // delay next shot slightly on hit

                const finF = hitF ?? maxBulletF;
                const hitX = sx + (finF - f) * BULLET_SPEED;

                if (hitType === 'object') {
                    cBullets.push({ id: bId++, startF: f, startX: sx, startY: finalSy, hitF, hitX, hitY: finalSy, isEnemy: false, absorbedByObjectId: hitObjectId });
                    explosions.push(createExplosion(hitF!, hitX, finalSy, 'spark'));
                } else if (hitType === 'enemy') {
                    cBullets.push({ id: bId++, startF: f, startX: sx, startY: finalSy, hitF, hitX, hitY: finalSy, isEnemy: false, absorbedByObjectId: null });
                    const e = enemies.find(e => e.id === hitEnemyId)!;
                    const eType = e.headshot ? 'head' : 'body';
                    const ey = e.headshot ? e.basePath[hitF!].y - cfg.enemies.height * 0.85 : e.basePath[hitF!].y - cfg.enemies.height * 0.5;
                    explosions.push(createExplosion(hitF!, hitX, ey, eType));
                } else {
                    cBullets.push({ id: bId++, startF: f, startX: sx, startY: finalSy, hitF: null, hitX, hitY: finalSy, isEnemy: false, absorbedByObjectId: null });
                }

                const requiredHeroCY = finalSy + cfg.hero.height - cfg.hero.muzzleOffsetY;
                shotData.set(f, { requiredHeroCY, targetEnemyId: hitEnemyId });
            }
        }

        // Pass 3: Hero Smooth Trajectory
        // Build waypoints containing the EXACT REQUIRED Y coordinate for every single shot
        const hWaypoints: { frame: number, y: number }[] = [];
        hWaypoints.push({ frame: 0, y: ARENA_MIN_Y + (ARENA_MAX_Y - ARENA_MIN_Y) / 2 });

        let lastSf = 0;
        let lastY = ARENA_MIN_Y + (ARENA_MAX_Y - ARENA_MIN_Y) / 2;
        for (const sf of commandoShots) {
            const y = shotData.get(sf)!.requiredHeroCY;
            let gap = sf - lastSf;
            if (gap > 60) {
                // Add multiple patrol points if the gap is large to keep the hero dynamically moving
                const numPatrols = Math.floor(gap / 60);
                for (let i = 1; i <= numPatrols; i++) {
                    const patrolF = lastSf + i * (gap / (numPatrols + 1));
                    const patrolY = lastY + (i % 2 === 0 ? 150 : -150);
                    let pClamp = patrolY;
                    if (pClamp < ARENA_MIN_Y + 50) pClamp = ARENA_MIN_Y + 50;
                    if (pClamp > ARENA_MAX_Y - 50) pClamp = ARENA_MAX_Y - 50;
                    hWaypoints.push({ frame: patrolF, y: pClamp });
                }
            }
            hWaypoints.push({ frame: sf, y: y });
            lastSf = sf;
            lastY = y;
        }

        // Add smooth end patrol points for after all waves are defeated to keep the hero dynamically moving
        while (lastSf < durationInFrames) {
            lastSf += 60;
            if (lastSf < durationInFrames) {
                const patrolY = lastY + (Math.floor(lastSf / 60) % 2 === 0 ? 150 : -150);
                let pClamp = patrolY;
                if (pClamp < ARENA_MIN_Y + 50) pClamp = ARENA_MIN_Y + 50;
                if (pClamp > ARENA_MAX_Y - 50) pClamp = ARENA_MAX_Y - 50;
                hWaypoints.push({ frame: lastSf, y: pClamp });
                lastY = pClamp;
            }
        }
        if (hWaypoints[hWaypoints.length - 1].frame < durationInFrames) {
            hWaypoints.push({ frame: durationInFrames, y: lastY });
        }

        const cBasePath: Point[] = new Array(durationInFrames);
        // Interpolate waypoints dynamically to guarantee perfect aim but organic smooth rest movement
        for (let f = 0; f < durationInFrames; f++) {
            let wp1 = hWaypoints[0];
            let wp2 = hWaypoints[1];
            for (let i = 0; i < hWaypoints.length - 1; i++) {
                if (f >= hWaypoints[i].frame && f <= hWaypoints[i + 1].frame) {
                    wp1 = hWaypoints[i];
                    wp2 = hWaypoints[i + 1];
                    break;
                }
            }
            const durWp = Math.max(1, wp2.frame - wp1.frame);
            const p = (f - wp1.frame) / durWp;
            // Cubic Easy curve for hyper-smooth human running motion
            const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

            cBasePath[f] = {
                x: ARENA_L_MIN_X + 100 + Math.sin(f * 0.015) * 40,
                y: wp1.y + (wp2.y - wp1.y) * ease + Math.sin(f * 0.1) * 3
            };
        }

        // Pass 4: Enemy Return Fire & Hero Hit Collision (Fixes Piercing)
        const enemyBullets: Bullet[] = [];
        let lastEnemyShotF = -100;

        for (let f = 0; f < durationInFrames; f++) {
            for (const e of enemies) {
                if (f >= e.startF + fps && (e.deadF === null || f < e.deadF)) {
                    // Squad firing cooldown
                    if (f > lastEnemyShotF + 40 && e.basePath[f].x >= ENEMY_MIN_X && sr(`efire-${f}-${e.id}`) < 0.03) {
                        lastEnemyShotF = f;
                        const m = getEnemyMuzzle(e.basePath[f].x, e.basePath[f].y, e.type);
                        const sx = m.x; const sy = m.y;
                        let hitF = null; let objId = null;

                        for (let tf = f; tf < f + 80; tf++) {
                            const bx = sx - (tf - f) * BULLET_SPEED;

                            // Check Objects Collision
                            const col = checkCollision({ x: bx, y: sy }, worldObjects);
                            if (col) { hitF = tf; objId = col.id; break; }

                            // Check Hero Collision (Bullet absolutely stops if it touches the hero)
                            if (cBasePath[tf]) {
                                const heroX = cBasePath[tf].x;
                                const heroY = cBasePath[tf].y;
                                if (bx > heroX - 60 && bx < heroX + 60 && sy > heroY - 140 && sy < heroY) {
                                    hitF = tf;
                                    explosions.push(createExplosion(tf, bx, sy, 'body')); // Red blood spill when hero is hit
                                    break;
                                }
                            }

                            if (bx < -200) break;
                        }
                        enemyBullets.push({ id: bId++, startF: f, startX: sx, startY: sy, hitF, isEnemy: true, absorbedByObjectId: objId });
                    }
                }
            }
        }

        // Pass 5: Render finalizations (Freeze dead enemies safely and calculate Evasion Physics)
        const cFinal: Point[] = new Array(durationInFrames);
        let curD = 0; let velD = 0;

        for (let f = 0; f < durationInFrames; f++) {
            let force = 0;
            // Physics collision detection for evasion
            for (const b of enemyBullets) {
                if (f >= b.startF && (b.hitF === null || f < b.hitF)) {
                    const bx = b.startX - (f - b.startF) * BULLET_SPEED;
                    if (bx > cBasePath[f].x && bx < cBasePath[f].x + 250) {
                        if (Math.abs(b.startY - cBasePath[f].y) < 60) {
                            force += (b.startY > cBasePath[f].y ? -30 : 30); // Gentle evasion push
                        }
                    }
                }
            }
            // Spring friction to dampen jitters heavily for natural feel
            force += -0.15 * curD; // stronger damper
            velD = (velD + force) * 0.6; // less slippery velocity
            curD += velD;

            // Clamp violent evasions strictly
            if (curD > 50) curD = 50;
            if (curD < -50) curD = -50;

            let cy = cBasePath[f].y + curD;
            if (cy < ARENA_MIN_Y) cy = ARENA_MIN_Y; if (cy > ARENA_MAX_Y) cy = ARENA_MAX_Y;
            let cx = cBasePath[f].x;
            if (cx > ARENA_L_MAX_X) cx = ARENA_L_MAX_X;
            cFinal[f] = { x: cx, y: cy };
        }

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

    // ─── Asset URL Helper ────────────────────────────────────────────────────
    // Returns Remotion-compatible staticFile URL if asset is within count limit.
    // Empty string triggers built-in SVG fallback in every sprite component.
    const assetUrl = (name: string, index?: number, count?: number): string => {
        if (!cfg.game) return '';
        if (index !== undefined && count !== undefined && index > count) return '';
        return staticFile(`${cfg.game}/${name}`);
    };


    const WorldObjectSprite = ({ obj }: { obj: WorldObject }) => {
        const idx = objSvgIndex(obj.type);
        const skin = assetUrl(`object_${idx}.svg`, idx, cfg.objects.count);
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
        const skin = assetUrl('hero.svg');
        const spriteL = x - cfg.hero.width / 2;
        const spriteT = y - cfg.hero.height;
        if (skin) return <img src={skin} style={{ position: 'absolute', left: spriteL, top: spriteT, width: cfg.hero.width, height: cfg.hero.height, zIndex: Math.floor(y) }} alt="hero" />;
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

    const ContraSprite = ({ x, y, dead, type }: { x: number; y: number; dead: boolean; type: EnemyType }) => {
        if (dead) return null;
        const idx = enemySvgIndex(type);
        const skin = assetUrl(`enemy_${idx}.svg`, idx, cfg.enemies.count);
        if (skin) return <img src={skin} style={{ position: 'absolute', left: x - cfg.enemies.width / 2, top: y - cfg.enemies.height, width: cfg.enemies.width, height: cfg.enemies.height, zIndex: Math.floor(y) }} alt={type} />;
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

    const CommandoBullet = ({ bx, by }: { bx: number; by: number }) => {
        const skin = assetUrl('hero_bullet.svg');
        if (skin) return <img src={skin} style={{ position: 'absolute', left: bx, top: by, width: 25, height: 6, zIndex: 1000 }} alt="bullet" />;
        return <div style={{ position: 'absolute', left: bx, top: by, width: 25, height: 6, background: 'yellow', boxShadow: '0 0 8px yellow', borderRadius: 2, zIndex: 1000 }} />;
    };

    const EnemyBullet = ({ bx, by }: { bx: number; by: number }) => {
        const skin = assetUrl('enemy_bullet.svg');
        if (skin) return <img src={skin} style={{ position: 'absolute', left: bx, top: by, width: 20, height: 12, zIndex: 1001 }} alt="ebullet" />;
        return <div style={{ position: 'absolute', left: bx, top: by, width: 20, height: 12, background: '#ff3333', borderRadius: '50%', boxShadow: '0 0 10px #ff0000', zIndex: 1001 }} />;
    };

    // Muzzle Flash: visible for 3 frames after each hero shot, at the exact muzzle point
    const FLASH_DURATION = 3;
    const MuzzleFlash = ({ x, y, age }: { x: number; y: number; age: number }) => {
        const scale = 1 - age / FLASH_DURATION;
        const opacity = scale;
        return (
            <div style={{ position: 'absolute', left: x - 18, top: y - 18, width: 36, height: 36, zIndex: 2000, pointerEvents: 'none', opacity }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    {/* Star-burst rays */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                        const rad = (deg * Math.PI) / 180;
                        const x1 = 18 + Math.cos(rad) * 4;
                        const y1 = 18 + Math.sin(rad) * 4;
                        const x2 = 18 + Math.cos(rad) * (i % 2 === 0 ? 16 : 10);
                        const y2 = 18 + Math.sin(rad) * (i % 2 === 0 ? 16 : 10);
                        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 2 === 0 ? '#fff59d' : '#ffca28'} strokeWidth={i % 2 === 0 ? 3 : 2} strokeLinecap="round" />;
                    })}
                    {/* Bright core */}
                    <circle cx="18" cy="18" r="5" fill="white" />
                    <circle cx="18" cy="18" r="9" fill="#ffee58" opacity={0.5} />
                </svg>
            </div>
        );
    };

    if (!audioData || !engine) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
    const curF = Math.floor(frame);
    const { enemies, enemyBullets, cTimeline, cBullets, explosions, worldObjects, commandoShots } = engine;
    const cx = cTimeline[curF]?.x ?? ARENA_L_MIN_X;
    const cy = cTimeline[curF]?.y ?? ARENA_MIN_Y;
    // Muzzle derived from helper — consistent with engine calculations
    const { x: muzzleX, y: muzzleY } = getHeroMuzzle(cx, cy);
    const isFiring = commandoShots.includes(curF);

    const killsSoFar = explosions.filter(e => e.frame <= curF && e.type !== 'spark').length;
    const shotsSoFar = commandoShots.filter(s => s <= curF).length;
    const scoreValue = killsSoFar * 150;
    const accRate = shotsSoFar > 0 ? Math.floor((killsSoFar / shotsSoFar) * 100) : 0;

    return (
        <AbsoluteFill style={{ backgroundColor: '#1a1d1a', overflow: 'hidden' }}>
            <Audio src={audioUrl} />
            <AbsoluteFill style={cfg.game && cfg.background
                ? { backgroundImage: `url(${staticFile(`${cfg.game}/${cfg.background}`)})`, backgroundSize: 'cover' }
                : { background: 'linear-gradient(180deg, #0e121a 0%, #2a3b2a 100%)' }} />
            <div style={{ fontSize: 40, position: 'absolute', top: 40, left: 60, color: '#fff', ...pixelFont, zIndex: 3000 }}>
                SCORE: {String(scoreValue).padStart(6, '0')}
            </div>
            {worldObjects.map(o => <WorldObjectSprite key={o.id} obj={o} />)}
            <CommandoSprite x={cx} y={cy} firing={isFiring} />
            {/* Muzzle Flash: for each shot fired in the last FLASH_DURATION frames */}
            {engine.commandoShots
                .filter(sf => curF >= sf && curF < sf + FLASH_DURATION)
                .map(sf => <MuzzleFlash key={sf} x={muzzleX} y={muzzleY} age={curF - sf} />)
            }
            {enemies.map(e => <ContraSprite key={e.id} x={e.finalPath[curF].x} y={e.finalPath[curF].y} dead={e.deadF !== null && curF >= e.deadF} type={e.type} />)}
            {cBullets.map(b => {
                const maxF = b.hitF ?? (b.startF + 60);
                if (curF < b.startF || curF > maxF) return null;
                const t = (curF - b.startF) / Math.max(1, maxF - b.startF);
                const bx = b.startX + ((b.hitX ?? b.startX) - b.startX) * t;
                const by = b.startY + ((b.hitY ?? b.startY) - b.startY) * t;
                return <CommandoBullet key={b.id} bx={bx} by={by} />;
            })}
            {/* Enemy Muzzle Flash: same visual as hero, at enemy bullet spawn point */}
            {enemyBullets
                .filter(b => curF >= b.startF && curF < b.startF + FLASH_DURATION)
                .map(b => <MuzzleFlash key={`ef-${b.id}`} x={b.startX} y={b.startY} age={curF - b.startF} />)
            }
            {enemyBullets.map(b => {
                const maxF = b.hitF ?? (b.startF + 80);
                if (curF < b.startF || curF > maxF) return null;
                return <EnemyBullet key={b.id} bx={b.startX - (curF - b.startF) * BULLET_SPEED} by={b.startY} />;
            })}
            {engine.explosions.map((exp, idx) => {
                const age = curF - exp.frame;
                const isSpark = exp.type === 'spark';
                if (age < 0 || age > (isSpark ? 12 : 28)) return null;

                // Segmented Shatter Colors - COMPACT DETAILED PIXEL BURST
                const color = exp.type === 'head' ? '#b71c1c' : (exp.type === 'body' ? '#e53935' : '#ffea00');

                return (
                    <React.Fragment key={`exp-${idx}`}>
                        {exp.particles.map((p, fi) => {
                            // Ultra Shatter physics: wide spread, chunky fragments
                            const px = Math.cos(p.angle) * p.speed * age;
                            const py = Math.sin(p.angle) * p.speed * age + (0.8 * age * age);
                            const size = isSpark ? (2 + p.prng * 3) : (15 + p.prng * 15); // Large chunky fragments (15-30px) for enemies, small sparks for crates/hero

                            // Spark fades, meat chunks stay solid then vanish rapidly
                            let opacity = isSpark ? 1 - (age / 12) : (age > 20 ? 1 - ((age - 20) / 8) : 1);
                            opacity = Math.max(0, Math.min(1, opacity));
                            const rotation = p.baseRot + p.rotSpeed * age;

                            return (
                                <div
                                    key={fi}
                                    style={{
                                        position: 'absolute',
                                        left: exp.x + px,
                                        top: exp.y + py,
                                        width: size,
                                        height: size,
                                        background: color,
                                        opacity: opacity,
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

            {enemies.length > 0 && enemies.every(e => e.deadF !== null && curF >= e.deadF + 30) && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    color: '#ffeb3b', fontSize: 120, ...pixelFont, zIndex: 5000,
                    textShadow: '8px 8px 0px #d32f2f, 0 0 40px rgba(255,235,59,0.5)',
                    opacity: Math.min(1, (curF - Math.max(...enemies.map(e => e.deadF!)) - 30) / 30)
                }}>
                    YOU WIN!
                </div>
            )}

            <div style={{ position: 'absolute', bottom: 40, right: 60, color: '#ff5252', fontSize: 24, ...pixelFont, zIndex: 3000, textShadow: '2px 2px 0px #000' }}>STAGE 1: JUNGLE TRENCH</div>
            <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 4px)', pointerEvents: 'none', zIndex: 9999 }} />
        </AbsoluteFill>
    );
};
