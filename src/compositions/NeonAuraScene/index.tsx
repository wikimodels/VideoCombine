import React, { useMemo } from 'react';
import {
    useCurrentFrame, useVideoConfig, Audio, AbsoluteFill, random, staticFile,
    interpolate, Easing, Img, spring,
} from 'remotion';
import { useAudioData } from '@remotion/media-utils';

import type { RenderJob } from '../../shared/types/pipeline';

import { DefaultVinyl as VinylSVG } from '../VinylStreamOverlay/assets/VinylGraphic';
import { CrosshairGraphic } from '../VinylStreamOverlay/assets/CrosshairGraphic';
import { PromoPopup } from '../VinylStreamOverlay/PromoPopup';
import { VCRPrompt } from '../shared/VCRPrompt';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type HeartParams = {
    id: number;
    startF: number;
    duration: number;
    baseX: number;
    amp: number;
    freq: number;
    phase: number;
    scaleStart: number;
    scalePeak: number;
    color: string;
};

const getAssetUrl = (path: string): string | null => {
    if (!path) return null;
    return staticFile(path);
};

interface NeonAuraSceneProps {
    job?: RenderJob;
}

const NOOP_JOB: RenderJob = {
    id: 'noop',
    composition: 'NeonAuraScene',
    audio: '',
    particles: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const NeonAuraScene: React.FC<NeonAuraSceneProps> = ({ job = NOOP_JOB }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames, height, width: canvasWidth } = useVideoConfig();

    const {
        audio,
        image,
        originGraphic,
        originScale = 1.2,
        originBgColor = 'transparent',
        vinylSizePercent = 100,
        particleGraphic,
        particles = {},
        eq: eqCfg,
        promo: promoCfg,
        vcr: vcrCfg,
        glitch: glitchCfg,
        // neonAura config is read from job.neonAura (custom field via pipeline config)
    } = job;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const neonAuraCfg = (job as any).neonAura ?? {};

    const {
        colors: particleColors = ['#e91e63'],
        speed: particleSpeed = 1.0,
        maxHeight: particleMaxHeight = 1.0,
        fadeStart: particleFadeStart = 0.7,
        fadeRange: particleFadeRange = 0.15,
        spreadStart: particleSpreadStart = 0.0,
        spreadAmplitude: particleSpreadAmplitude = 1.0,
        decelerationStrength: particleDecelerationStrength = 0,
        rotationSpeed = 3,
    } = particles;

    const audioUrl = audio ? getAssetUrl(audio) : null;
    const audioData = useAudioData(audioUrl || '');

    // ── Physics Engine ────────────────────────────────────────────────────────
    const engine = useMemo(() => {
        if (!audioData) return {
            hearts: [], eqData: null, eqBands: 0, glitchFrames: null,
            bassEnergyArray: new Float32Array(0),
        };

        const hearts: HeartParams[] = [];
        let hId = 0;
        const frameSamples = Math.floor(audioData.sampleRate / fps);
        const totalFrames = durationInFrames;

        // Pass 1: Raw energy
        const rawEnergy = new Float32Array(totalFrames);
        let maxEnergy = 0.01;
        for (let f = 0; f < totalFrames; f++) {
            const index = f * frameSamples;
            if (index < audioData.channelWaveforms[0].length) {
                const s = Math.abs(audioData.channelWaveforms[0][index]);
                rawEnergy[f] = s;
                if (s > maxEnergy) maxEnergy = s;
            }
        }

        const HISTORY_FRAMES = Math.floor(fps * 0.5);

        // Pass 2: Particle spawning
        for (let f = 0; f < totalFrames; f += 3) {
            let sumHist = 0, countHist = 0;
            for (let h = Math.max(0, f - HISTORY_FRAMES); h < f; h++) {
                sumHist += rawEnergy[h]; countHist++;
            }
            const localAvg = countHist > 0 ? sumHist / countHist : 0;
            const currentEnergy = rawEnergy[f];
            const delta = Math.max(0, currentEnergy - localAvg);
            const normalizedDelta = delta / maxEnergy;

            let shouldSpawn = false;
            let scaleMultiplier = 1.0;
            let flyDuration = 90 + random(`dur-${f}`) * 60;
            let isPeak = false;
            let spawnCount = 0;
            let isMachineGun = false;

            if (normalizedDelta > 0.5) {
                shouldSpawn = true; spawnCount = 4 + Math.floor(random(`cnt-${f}`) * 3);
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4;
                flyDuration = 20 + random(`durp-${f}`) * 10; isPeak = true; isMachineGun = true;
            } else if (normalizedDelta > 0.25) {
                shouldSpawn = true; spawnCount = 2 + Math.floor(random(`cnt-${f}`) * 3);
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4;
                flyDuration = 25 + random(`durp-${f}`) * 20; isPeak = true;
            } else if (normalizedDelta > 0.1) {
                shouldSpawn = random(`prob-${f}`) > 0.3;
                spawnCount = 1 + Math.floor(random(`cnt2-${f}`) * 2);
                scaleMultiplier = 1.1 + random(`scm2-${f}`) * 0.3;
                flyDuration = 45 + random(`durm-${f}`) * 20; isPeak = true;
            } else if (currentEnergy > maxEnergy * 0.7) {
                shouldSpawn = random(`prob3-${f}`) > 0.6;
                spawnCount = 1; scaleMultiplier = 0.9 + random(`scm3-${f}`) * 0.2;
            } else {
                shouldSpawn = random(`prob4-${f}`) > 0.96;
                spawnCount = 1; scaleMultiplier = 0.6 + random(`scm4-${f}`) * 0.2;
            }

            if (shouldSpawn) {
                for (let i = 0; i < spawnCount; i++) {
                    const staggerOffset = isMachineGun ? (i * 3) : Math.floor(random(`stag-${f}-${i}`) * 2);
                    hearts.push({
                        id: hId++,
                        startF: f + staggerOffset,
                        duration: (flyDuration + random(`df-${f}-${i}`) * 20) / particleSpeed,
                        baseX: isMachineGun ? 0 : (random(`boff-${f}-${i}`) - 0.5) * (isPeak ? 15 : 5),
                        amp: (isMachineGun
                            ? 20 + random(`bamp-${f}-${i}`) * 30
                            : 35 + random(`bamp-${f}-${i}`) * (isPeak ? 90 : 35)
                        ) * particleSpreadAmplitude,
                        freq: 0.03 + random(`bfreq-${f}-${i}`) * 0.05,
                        phase: random(`bphase-${f}-${i}`) * Math.PI * 2,
                        scaleStart: 0.2 + random(`bsc1-${f}-${i}`) * 0.3,
                        scalePeak: (0.6 + random(`bsc2-${f}-${i}`) * 0.4) * scaleMultiplier,
                        color: particleColors[Math.floor(random(`bcol-${f}-${i}`) * particleColors.length)],
                    });
                }
            }
        }

        // Pass 3: Bass Energy Array (smoothed envelope)
        const bassEnergyArray = new Float32Array(totalFrames);
        const attack = 0.2, decay = 0.95;
        for (let f = 0; f < totalFrames; f++) {
            const normalized = maxEnergy > 0 ? rawEnergy[f] / maxEnergy : 0;
            const prev = f > 0 ? bassEnergyArray[f - 1] : 0;
            bassEnergyArray[f] = normalized > prev ? prev + (normalized - prev) * attack : prev * decay;
        }

        // ── Equalizer Engine ─────────────────────────────────────────────────
        if (!eqCfg?.enabled) return { hearts, eqData: null, eqBands: 0, glitchFrames: null, bassEnergyArray };

        const eqBands: number = eqCfg.bands ?? 64;
        const freqMin: number = eqCfg.freqMin ?? 60;
        const freqMax: number = eqCfg.freqMax ?? 16000;
        const waveform = audioData.channelWaveforms[0];
        const sr = audioData.sampleRate;

        const FFT_SIZE = 2048;
        const hann = new Float32Array(FFT_SIZE);
        for (let k = 0; k < FFT_SIZE; k++) hann[k] = 0.5 * (1 - Math.cos(2 * Math.PI * k / (FFT_SIZE - 1)));
        const fftRe = new Float32Array(FFT_SIZE);
        const fftIm = new Float32Array(FFT_SIZE);

        function fftInPlace(re: Float32Array, im: Float32Array): void {
            const n = re.length;
            for (let i = 1, j = 0; i < n; i++) {
                let bit = n >> 1;
                for (; j & bit; bit >>= 1) j ^= bit;
                j ^= bit;
                if (i < j) {
                    let t = re[i]; re[i] = re[j]; re[j] = t;
                    t = im[i]; im[i] = im[j]; im[j] = t;
                }
            }
            for (let len = 2; len <= n; len <<= 1) {
                const ang = (-2 * Math.PI) / len;
                const wRe = Math.cos(ang), wIm = Math.sin(ang);
                for (let i = 0; i < n; i += len) {
                    let cRe = 1, cIm = 0;
                    for (let k = 0; k < len >> 1; k++) {
                        const a = i + k, b = i + k + (len >> 1);
                        const vRe = re[b] * cRe - im[b] * cIm;
                        const vIm = re[b] * cIm + im[b] * cRe;
                        re[b] = re[a] - vRe; im[b] = im[a] - vIm;
                        re[a] += vRe; im[a] += vIm;
                        const nRe = cRe * wRe - cIm * wIm;
                        cIm = cRe * wIm + cIm * wRe; cRe = nRe;
                    }
                }
            }
        }

        const bandBinLo = new Int32Array(eqBands);
        const bandBinHi = new Int32Array(eqBands);
        for (let b = 0; b < eqBands; b++) {
            const fLo = freqMin * Math.pow(freqMax / freqMin, b / eqBands);
            const fHi = freqMin * Math.pow(freqMax / freqMin, (b + 1) / eqBands);
            bandBinLo[b] = Math.max(1, Math.round(fLo * FFT_SIZE / sr));
            bandBinHi[b] = Math.min(FFT_SIZE / 2 - 1, Math.round(fHi * FFT_SIZE / sr));
        }

        const rawEq = new Float32Array(totalFrames * eqBands);
        for (let f = 0; f < totalFrames; f++) {
            const center = f * frameSamples;
            const start = Math.max(0, center - FFT_SIZE / 2);
            for (let k = 0; k < FFT_SIZE; k++) {
                fftRe[k] = (waveform[start + k] ?? 0) * hann[k];
                fftIm[k] = 0;
            }
            fftInPlace(fftRe, fftIm);
            for (let b = 0; b < eqBands; b++) {
                let sum = 0, cnt = 0;
                for (let k = bandBinLo[b]; k <= bandBinHi[b]; k++) {
                    sum += Math.sqrt(fftRe[k] * fftRe[k] + fftIm[k] * fftIm[k]); cnt++;
                }
                rawEq[f * eqBands + b] = cnt > 0 ? sum / cnt / FFT_SIZE : 0;
            }
        }

        // A-weighting
        const aWeight = (f: number): number => {
            const f2 = f * f;
            const num = 1.562339 * 148840000 * f2 * f2;
            const d = (f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000);
            return d > 0 ? num / d : 0;
        };
        for (let b = 0; b < eqBands; b++) {
            const fLo = freqMin * Math.pow(freqMax / freqMin, b / eqBands);
            const fHi = freqMin * Math.pow(freqMax / freqMin, (b + 1) / eqBands);
            const fc = Math.sqrt(fLo * fHi);
            const gain = aWeight(fc);
            for (let f = 0; f < totalFrames; f++) rawEq[f * eqBands + b] *= gain;
        }

        const DB_FLOOR = -120;
        const logEq = new Float32Array(totalFrames * eqBands);
        for (let f = 0; f < totalFrames; f++)
            for (let b = 0; b < eqBands; b++) {
                const raw = rawEq[f * eqBands + b];
                const db = 20 * Math.log10(raw + 1e-9);
                logEq[f * eqBands + b] = Math.max(0, (db - DB_FLOOR) / (-DB_FLOOR));
            }

        const normEq = new Float32Array(totalFrames * eqBands);
        const bandSlice = new Float32Array(totalFrames);
        for (let b = 0; b < eqBands; b++) {
            for (let f = 0; f < totalFrames; f++) bandSlice[f] = logEq[f * eqBands + b];
            const sorted = Float32Array.from(bandSlice).sort();
            const p5 = sorted[Math.floor(totalFrames * 0.05)];
            const p95 = sorted[Math.floor(totalFrames * 0.95)];
            const range = p95 - p5;
            for (let f = 0; f < totalFrames; f++) {
                normEq[f * eqBands + b] = range > 0.01 ? Math.max(0, Math.min(1, (bandSlice[f] - p5) / range)) : 0;
            }
        }

        const decayBase = eqCfg.decayFactor ?? 0.96;
        const attackBase = eqCfg.attackFactor ?? 0.20;
        const smoothEq = new Float32Array(totalFrames * eqBands);
        for (let b = 0; b < eqBands; b++) {
            const t = b / Math.max(1, eqBands - 1);
            const dec = decayBase - t * 0.08;
            const att = attackBase + t * 0.18;
            for (let f = 0; f < totalFrames; f++) {
                const curr = normEq[f * eqBands + b];
                const prev = f > 0 ? smoothEq[(f - 1) * eqBands + b] : 0;
                smoothEq[f * eqBands + b] = curr > prev ? prev + (curr - prev) * att : prev * dec;
            }
        }

        // ── Glitch Engine ────────────────────────────────────────────────────
        type GlitchBlock = {
            id: number; x: number; y: number; w: number; h: number;
            type: 'color' | 'displace' | 'invert'; color?: string; offsetX?: number; offsetY?: number;
        };
        type GlitchFrameData = {
            tearBlocks: GlitchBlock[]; gridActive: boolean;
            gridJitterX: number; gridJitterY: number;
            trackingRollMode: boolean; trackingRollOffset: number;
        };
        let glitchFrames: GlitchFrameData[] | null = null;

        if (glitchCfg?.enabled) {
            glitchFrames = new Array(totalFrames);
            const intensity = glitchCfg.intensity ?? 1.0;
            const tearProb = glitchCfg.tearProbability ?? 0.005;
            const gridProb = glitchCfg.gridProbability ?? 0.002;
            const canTear = glitchCfg.enableDigitalTear !== false;
            const canGrid = glitchCfg.enableStaticGrid !== false;
            const canTrackingRoll = glitchCfg.enableTrackingRoll !== false;
            const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ff0033', '#00ff33'];
            let activeTearBlocks: GlitchBlock[] = [];
            let framesLeftTear = 0, gridActive = false, framesLeftGrid = 0;
            let trackingRollActive = false, framesLeftTrackingRoll = 0;
            let trackingRollPos = 0, blockIdCounter = 0;

            for (let f = 0; f < totalFrames; f++) {
                if (framesLeftTear <= 0) {
                    activeTearBlocks = [];
                    if (canTear && random(`g-start-tear-${f}`) < tearProb) {
                        framesLeftTear = Math.floor(random(`g-tlen-${f}`) * 3 * intensity) + 1;
                        const numBlocks = Math.floor(random(`g-num-${f}`) * 10 * intensity) + 5;
                        for (let i = 0; i < numBlocks; i++) {
                            const rtype = random(`g-type-${f}-${i}`);
                            const type = rtype > 0.4 ? 'displace' : (rtype > 0.2 ? 'color' : 'invert');
                            const isFullWidth = random(`g-fw-${f}-${i}`) > 0.3;
                            const w = isFullWidth ? 100 : random(`g-w-${f}-${i}`) * 60 + 40;
                            const x = isFullWidth ? 0 : random(`g-x-${f}-${i}`) * (100 - w);
                            activeTearBlocks.push({
                                id: blockIdCounter++,
                                x, y: random(`g-y-${f}-${i}`) * 100,
                                w, h: random(`g-h-${f}-${i}`) * 2 + 0.1, type,
                                color: type === 'color' ? colors[Math.floor(random(`g-c-${f}-${i}`) * colors.length)] : undefined,
                                offsetX: type === 'displace' ? (random(`g-ox-${f}-${i}`) - 0.5) * 200 * intensity : 0,
                                offsetY: 0,
                            });
                        }
                    }
                } else { framesLeftTear--; }
                if (framesLeftGrid <= 0) {
                    gridActive = false;
                    if (canGrid && random(`g-start-grid-${f}`) < gridProb) {
                        framesLeftGrid = Math.floor(random(`g-glen-${f}`) * 8 * intensity) + 4;
                        gridActive = true;
                    }
                } else { framesLeftGrid--; }
                if (framesLeftTrackingRoll <= 0) {
                    trackingRollActive = false;
                    if (canTrackingRoll && random(`g-start-roll-${f}`) < (gridProb * 0.4)) {
                        framesLeftTrackingRoll = Math.floor(random(`g-rlen-${f}`) * 30 * intensity) + 30;
                        trackingRollActive = true;
                        trackingRollPos = random(`g-rpos-${f}`) > 0.5 ? -20 : 120;
                    }
                } else {
                    framesLeftTrackingRoll--;
                    const speed = 2 * intensity;
                    trackingRollPos += (trackingRollPos < 50 ? speed : -speed);
                }
                glitchFrames[f] = {
                    tearBlocks: [...activeTearBlocks], gridActive,
                    gridJitterX: gridActive ? (random(`g-gox-${f}`) - 0.5) * 3 : 0,
                    gridJitterY: gridActive ? (random(`g-goy-${f}`) - 0.5) * 3 : 0,
                    trackingRollMode: trackingRollActive, trackingRollOffset: trackingRollPos,
                };
            }
        }

        return { hearts, eqData: smoothEq, eqBands, glitchFrames, bassEnergyArray };
    }, [audioData, fps, durationInFrames, particleSpeed, particleSpreadAmplitude, particleColors, eqCfg, glitchCfg]);

    // ── Layout ───────────────────────────────────────────────────────────────
    const baseSize = 250;
    const vinylSize = baseSize * (vinylSizePercent / 100);
    const vinylX = 50;
    const vinylY = height - vinylSize - 50;
    const vinylRotation = (frame * rotationSpeed) % 360;

    const eqEnabled = eqCfg?.enabled && engine.eqData;
    const eqHeight: number = eqCfg?.height ?? vinylSize;
    const eqBands: number = engine.eqBands ?? 0;
    const eqColor: string = eqCfg?.color ?? '#00ffff';
    const eqColor2: string = eqCfg?.secondaryColor ?? '#ff00ff';
    const eqBarWidth: number = eqCfg?.barWidth ?? 7;
    const eqRadius: number = eqCfg?.cornerRadius ?? 3;
    const eqLeft = vinylX + vinylSize + 10;
    const eqTotalWidth = canvasWidth - eqLeft - 20;
    const eqComputedGap = eqBands > 1 ? Math.max(1, (eqTotalWidth - eqBands * eqBarWidth) / (eqBands - 1)) : 0;

    const imgUrl = image ? getAssetUrl(image) : null;
    const originGraphicUrl = originGraphic ? getAssetUrl(originGraphic) : null;
    const particleGraphicUrl = particleGraphic ? getAssetUrl(particleGraphic) : null;

    // ── Neon Aura: aura SVG/PNG config ───────────────────────────────────────
    // Prefer neonAura.graphic, fallback to originGraphic
    const auraRaw = neonAuraCfg.graphic ?? originGraphic ?? null;
    // Auto-detect _neon variant (transparent-background version)
    const auraNeonFile = auraRaw
        ? auraRaw.replace(/\.svg$/i, '_neon.svg')
        : null;
    const auraGraphicUrl = auraNeonFile ? getAssetUrl(auraNeonFile) : (auraRaw ? getAssetUrl(auraRaw) : null);

    // Extract baseColor / accentColor hue from config (or fallback to cyan/magenta)
    const auraBaseColor   = neonAuraCfg.baseColor   ?? '#00ffff';
    const auraAccentColor = neonAuraCfg.accentColor ?? '#ff00ff';

    // Utility: hex '#rrggbb' → HSL hue 0-360
    const hexToHue = (hex: string): number => {
        const n = parseInt(hex.replace('#', ''), 16);
        const r = ((n >> 16) & 0xff) / 255;
        const g = ((n >> 8)  & 0xff) / 255;
        const b = (n         & 0xff) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (d === 0) return 0;
        let h = max === r ? ((g - b) / d + (g < b ? 6 : 0))
              : max === g ? ((b - r) / d + 2)
              :             ((r - g) / d + 4);
        return (h / 6) * 360;
    };

    const baseHue   = hexToHue(auraBaseColor);    // e.g. cyan → 180
    const accentHue = hexToHue(auraAccentColor);  // e.g. magenta → 300

    // Bass-reactive values
    const bassArr = engine.bassEnergyArray || [];
    const bassE = bassArr[Math.min(frame, Math.max(0, bassArr.length - 1))] || 0;

    // Fast punch spring (attack)
    const punchE = spring({
        frame, fps,
        config: { damping: 8, stiffness: 220, mass: 0.5 },
        durationInFrames: 5,
        from: 0, to: bassE,
    });
    // Slow drift spring (decay bloom)
    const driftE = spring({
        frame, fps,
        config: { damping: 25, stiffness: 35, mass: 2.5 },
        durationInFrames: 25,
        from: 0, to: bassE,
    });

    // Glow radii
    const innerBlur   = interpolate(punchE, [0, 1], [8,  50],  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const midBlur     = interpolate(punchE, [0, 1], [20, 90],  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const outerBlur   = interpolate(driftE, [0, 1], [35, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Glow opacities — 0.7 at rest, 1.0 on beat
    const innerAlpha  = interpolate(punchE, [0, 1], [0.7, 1.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const outerAlpha  = interpolate(driftE, [0, 1], [0.15, 0.85], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Scale pulse on kick
    const scalePulse  = interpolate(punchE, [0, 1], [1.0, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Brightness boost on kick
    const brightBoost = interpolate(punchE, [0, 0.5, 1], [110, 190, 280], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Hue values: baseHue ↔ accentHue driven by punchE / driftE
    // h1 = tight inner glow — snaps from base to accent on kick
    const h1Raw = interpolate(punchE, [0, 1], [baseHue, accentHue], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    // h2 = mid bloom — follows drift (slower)
    const h2Raw = interpolate(driftE, [0, 1], [accentHue, baseHue], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    // h3 = outer soft bloom — midpoint between the two
    const h3Raw = ((baseHue + accentHue) / 2 + interpolate(driftE, [0, 1], [0, 30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) % 360;

    const h1 = h1Raw.toFixed(0);
    const h2 = h2Raw.toFixed(0);
    const h3 = h3Raw.toFixed(0);


    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
            {audioUrl && <Audio src={audioUrl} />}

            {/* ── Background image (hidden when neon aura SVG is the subject) ─ */}
            {imgUrl && !auraGraphicUrl && (
                <Img src={imgUrl} style={{
                    position: 'absolute', width: '100%', height: '100%',
                    objectFit: 'cover', zIndex: 0, opacity: 0.55,
                }} />
            )}

            {/* ── Glitch overlay on background ─────────────────────────────── */}
            {glitchCfg?.enabled && engine.glitchFrames && imgUrl && !auraGraphicUrl && (() => {
                const enableRGBBreathing = glitchCfg.enableRGBBreathing !== false;
                const rgbBreathSplit = enableRGBBreathing ? Math.sin(frame * 0.05) * 2 : 0;
                const frameData = engine.glitchFrames[frame] || {
                    tearBlocks: [], gridActive: false, gridJitterX: 0, gridJitterY: 0,
                    trackingRollMode: false, trackingRollOffset: 0,
                };
                const blocks = frameData.tearBlocks;
                const isGridActive = frameData.gridActive;
                const isTrackingRoll = frameData.trackingRollMode;
                const baseStyle: React.CSSProperties = {
                    position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
                };
                const isTearing = blocks.length > 0;
                const baseYShift = (isTearing || isGridActive)
                    ? (random(`g-yshift-global-${frame}`) - 0.5) * 30 : 0;
                const baseFilter = (isTearing || isGridActive)
                    ? `contrast(${isGridActive ? 150 : 120}%) saturate(${isTearing ? 150 : 80}%) ${isTearing ? `hue-rotate(${(random(`hue-${frame}`) * 90 - 45).toFixed(0)}deg)` : ''}`
                    : 'none';
                return (
                    <AbsoluteFill style={{ zIndex: 1 }}>
                        <div style={{ ...baseStyle, filter: baseFilter, transform: `translateY(${baseYShift}px)` }}>
                            <Img src={imgUrl} style={{ ...baseStyle, transform: isGridActive ? `translate(0px, ${(random(`g-yshift-${frame}`) - 0.5) * 10}px)` : 'none' }} />
                            {(isTearing || enableRGBBreathing) && (
                                <>
                                    <Img src={imgUrl} style={{ ...baseStyle, mixBlendMode: 'screen', transform: isTearing ? `translateX(${(random(`rx-${frame}`) * 10 + 5).toFixed(0)}px)` : `translateX(${rgbBreathSplit}px)`, opacity: isTearing ? 0.5 : 0.4, filter: 'drop-shadow(0 0 0 red)' }} />
                                    <Img src={imgUrl} style={{ ...baseStyle, mixBlendMode: 'screen', transform: isTearing ? `translateX(${-(random(`rx2-${frame}`) * 10 + 5).toFixed(0)}px)` : `translateX(${-rgbBreathSplit}px)`, opacity: isTearing ? 0.5 : 0.4, filter: 'drop-shadow(0 0 0 cyan)' }} />
                                </>
                            )}
                        </div>
                        {blocks.map(b => {
                            const clipPath = `polygon(${b.x}% ${b.y}%, ${b.x + b.w}% ${b.y}%, ${b.x + b.w}% ${b.y + b.h}%, ${b.x}% ${b.y + b.h}%)`;
                            if (b.type === 'color') return <div key={b.id} style={{ position: 'absolute', width: '100%', height: '100%', clipPath, backgroundColor: b.color, mixBlendMode: 'difference', opacity: 0.8 }} />;
                            if (b.type === 'invert') return <Img key={b.id} src={imgUrl} style={{ ...baseStyle, clipPath, filter: 'invert(100%) hue-rotate(90deg)' }} />;
                            if (b.type === 'displace') return (
                                <div key={b.id} style={{ position: 'absolute', width: '100%', height: '100%', clipPath, overflow: 'hidden' }}>
                                    <Img src={imgUrl} style={{ ...baseStyle, transform: `translate(${b.offsetX}px, ${b.offsetY}px) scale(1.1)`, filter: 'saturate(200%) contrast(150%)' }} />
                                </div>
                            );
                            return null;
                        })}
                        {isTrackingRoll && (
                            <div style={{ position: 'absolute', left: 0, top: `${frameData.trackingRollOffset}%`, width: '100%', height: '25%', backdropFilter: 'blur(4px) hue-rotate(90deg) contrast(150%)', opacity: 0.8, transform: `translateX(${(random(`g-tr-${frame}`) - 0.5) * 15}px)`, backgroundColor: 'rgba(255,255,255,0.05)', mixBlendMode: 'hard-light', borderTop: '2px solid rgba(255,255,255,0.2)', borderBottom: '2px solid rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 10 }} />
                        )}
                    </AbsoluteFill>
                );
            })()}

            {/* ── ✦ NEON AURA — feColorMatrix BG removal + contour glow ──── */}
            {auraGraphicUrl && (<>

                {/* Hidden SVG filter defs — referenced via CSS filter:url(#id) */}
                <svg xmlns="http://www.w3.org/2000/svg"
                    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                    <defs>
                        <filter id="neon-contour-filter"
                            x="-50%" y="-50%" width="200%" height="200%"
                            colorInterpolationFilters="sRGB">

                            {/* Step 1 — Cleanly remove white background but keep smooth anti-aliased alpha */}
                            <feColorMatrix
                                type="matrix"
                                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -3.5 -0.5 2.5 0"
                                result="masked_alpha"
                            />
                            {/* Step 1.5 — Smooth clamp (no hard threshold) to keep anti-aliasing soft */}
                            <feComponentTransfer in="masked_alpha" result="masked">
                                <feFuncA type="linear" slope="1.5" intercept="0"/>
                            </feComponentTransfer>

                            {/* Step 2 — INNER glow: feFlood pure neon color, clipped to blurred character */}
                            <feGaussianBlur in="masked"
                                stdDeviation={innerBlur.toFixed(1)}
                                result="b1"/>
                            <feFlood
                                floodColor={`hsl(${h1}, 100%, 80%)`}
                                floodOpacity={innerAlpha.toFixed(3)}
                                result="fc1"/>
                            <feComposite in="fc1" in2="b1" operator="in" result="innerGlow"/>

                            {/* Step 3 — MID glow: different hue */}
                            <feGaussianBlur in="masked"
                                stdDeviation={midBlur.toFixed(1)}
                                result="b2"/>
                            <feFlood
                                floodColor={`hsl(${h2}, 100%, 75%)`}
                                floodOpacity={(innerAlpha * 0.85).toFixed(3)}
                                result="fc2"/>
                            <feComposite in="fc2" in2="b2" operator="in" result="midGlow"/>

                            {/* Step 4 — OUTER soft bloom: third hue */}
                            <feGaussianBlur in="masked"
                                stdDeviation={outerBlur.toFixed(1)}
                                result="b3"/>
                            <feFlood
                                floodColor={`hsl(${h3}, 100%, 70%)`}
                                floodOpacity={(outerAlpha * 0.9).toFixed(3)}
                                result="fc3"/>
                            <feComposite in="fc3" in2="b3" operator="in" result="outerGlow"/>

                            {/* Step 4.5 — Erode the mask specifically for the bright layer to hide white SVG fringes. 
                                We permanently erode by 2 pixels to completely eliminate anti-aliasing artifacts on the original SVG edges. */}
                            <feMorphology in="masked" operator="erode" radius="2" result="eroded_masked"/>

                            {/* Step 5 — brightness boost on the character (from eroded to avoid white jagged edges) */}
                            <feComponentTransfer in="eroded_masked" result="bright">
                                <feFuncR type="linear" slope={(brightBoost / 100).toFixed(2)}/>
                                <feFuncG type="linear" slope={(brightBoost / 100).toFixed(2)}/>
                                <feFuncB type="linear" slope={(brightBoost / 100).toFixed(2)}/>
                            </feComponentTransfer>

                            {/* Step 6 — merge: outer → mid → inner → character on top */}
                            <feMerge>
                                <feMergeNode in="outerGlow"/>
                                <feMergeNode in="midGlow"/>
                                <feMergeNode in="innerGlow"/>
                                <feMergeNode in="bright"/>
                            </feMerge>
                        </filter>
                    </defs>
                </svg>

                {/* Image with filter — opacity handled via floodOpacity above */}
                <Img src={auraGraphicUrl}
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'contain', zIndex: 500,
                        transform: `scale(${scalePulse * 1.005})`,
                        transformOrigin: 'center',
                        filter: `url(#neon-contour-filter)`,
                        willChange: 'filter, transform',
                    }}
                />

            </>)}

            {/* ── Particles (fly from vinyl) ───────────────────────────────── */}
            {engine.hearts
                .filter(h => { const age = frame - h.startF; return age >= 0 && age <= h.duration; })
                .map(h => {
                    const age = frame - h.startF;
                    const progress = age / h.duration;
                    const fullTravel = -(height - 100);
                    let yOff: number;
                    if (particleDecelerationStrength <= 0) {
                        yOff = fullTravel * progress;
                    } else {
                        const power = 1 + particleDecelerationStrength * 6;
                        const eased = 1 - Math.pow(1 - Math.min(progress, 1), power);
                        yOff = fullTravel * eased;
                    }
                    const timeOpacity = interpolate(progress, [0, 0.1, particleFadeStart, 1], [0, 1, 1, 0]);
                    const travelRatio = Math.abs(yOff) / Math.abs(fullTravel);
                    const heightOpacity = interpolate(travelRatio,
                        [Math.max(0, particleMaxHeight - particleFadeRange), particleMaxHeight],
                        [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );
                    const opacity = Math.min(timeOpacity, heightOpacity);
                    const spreadProgress = Math.max(0, (progress - particleSpreadStart) / (1 - particleSpreadStart));
                    const spreadCurve = Math.pow(spreadProgress, 1.2);
                    const sineSway = Math.sin(age * h.freq + h.phase) * h.amp * spreadCurve;
                    const xOff = h.baseX * spreadCurve + sineSway;
                    const scale = interpolate(progress, [0, 0.05, 1], [0.01, h.scalePeak, h.scalePeak * 0.8], {
                        easing: Easing.out(Easing.back(1.5))
                    });
                    return (
                        <div key={h.id} style={{
                            position: 'absolute',
                            left: vinylX + vinylSize / 2 - 20,
                            top: vinylY + vinylSize / 2 - 20,
                            width: 40, height: 40,
                            transform: `translate(${xOff}px, ${yOff}px) scale(${scale})`,
                            opacity, zIndex: Math.floor(1000 - age),
                        }}>
                            {particleGraphicUrl ? (
                                <div style={{
                                    width: '100%', height: '100%',
                                    backgroundColor: h.color,
                                    WebkitMaskImage: `url('${particleGraphicUrl}')`,
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskImage: `url('${particleGraphicUrl}')`,
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                }} />
                            ) : (
                                <CrosshairGraphic color={h.color} />
                            )}
                        </div>
                    );
                })}

            {/* ── Equalizer ───────────────────────────────────────────────── */}
            {eqEnabled && (
                <div style={{
                    position: 'absolute',
                    top: vinylY, height: eqHeight, left: eqLeft, right: 20,
                    display: 'flex', flexDirection: 'row', alignItems: 'flex-end',
                    zIndex: 1500,
                    WebkitBoxReflect: (eqCfg?.reflex ?? true)
                        ? `below 0px linear-gradient(transparent 40%, rgba(0,0,0,${eqCfg?.reflexAlpha ?? 0.25}))`
                        : undefined,
                }}>
                    {Array.from({ length: eqBands }, (_, b) => {
                        const val = engine.eqData![frame * eqBands + b] ?? 0;
                        const curve = eqCfg?.heightCurve ?? 1.4;
                        const barH = Math.max(1, Math.pow(val, curve) * (eqHeight - 6));
                        const gap = b < eqBands - 1 ? eqComputedGap : 0;
                        return (
                            <div key={b} style={{ position: 'relative', width: eqBarWidth, flexShrink: 0, height: eqHeight, marginRight: gap, alignSelf: 'flex-end' }}>
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: barH,
                                    background: `linear-gradient(to top, ${eqColor}, ${eqColor2})`,
                                    borderRadius: (eqCfg?.roundBars ?? true)
                                        ? `${eqBarWidth / 2}px ${eqBarWidth / 2}px 0 0`
                                        : `${eqRadius}px ${eqRadius}px 0 0`,
                                }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Vinyl disc (bottom-left) ─────────────────────────────────── */}
            <div style={{
                position: 'absolute', left: vinylX, top: vinylY,
                width: vinylSize, height: vinylSize,
                backgroundColor: originBgColor,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                borderRadius: '50%', overflow: 'hidden', zIndex: 2000,
            }}>
                <div style={{ width: '100%', height: '100%', transform: `rotate(${vinylRotation}deg) scale(${originScale})`, clipPath: 'inset(1px)' }}>
                    {originGraphicUrl ? (
                        <Img src={originGraphicUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <VinylSVG />
                    )}
                </div>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%)',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* ── CRT Vignette + Scanlines ─────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 4000,
                background: `
                    radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.65) 100%),
                    linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.15) 50%)
                `,
                backgroundSize: '100% 100%, 100% 4px',
                backgroundPosition: `center, 0 ${(frame * 0.4) % 4}px`,
            }} />

            {/* ── Popups (Must be ABOVE Vignette) ──────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
                {promoCfg?.enabled && (
                    <PromoPopup
                        text={promoCfg.text || 'Listen on Spotify'}
                        iconSrc={promoCfg.icon ? (getAssetUrl(promoCfg.icon) ?? '') : ''}
                        cycleSeconds={promoCfg.cycleSeconds || 45}
                        offsetSeconds={promoCfg.offsetSeconds || 0}
                        holdSeconds={promoCfg.holdSeconds || 4}
                    />
                )}

                {vcrCfg?.enabled && (
                    <VCRPrompt
                        text={vcrCfg.text || '> FOLLOW US_'}
                        cycleSeconds={vcrCfg.cycleSeconds || 45}
                        offsetSeconds={vcrCfg.offsetSeconds || 22.5}
                        holdSeconds={vcrCfg.holdSeconds || 5}
                        background={vcrCfg.background}
                    />
                )}
            </div>
        </AbsoluteFill>
    );
};

export default NeonAuraScene;
