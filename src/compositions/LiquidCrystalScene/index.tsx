import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, AbsoluteFill, random, staticFile } from 'remotion';
import { useAudioData } from '@remotion/media-utils';
import { interpolate, Easing, Img, spring } from 'remotion';

import type { RenderJob } from '../../shared/types/pipeline';

// Fallback built-in graphics (for legacy / manual usage)
import { DefaultVinyl as VinylSVG } from './assets/VinylGraphic';
import { CrosshairGraphic } from './assets/CrosshairGraphic';
import { PromoPopup } from './PromoPopup';
import { VCRPrompt } from '../shared/VCRPrompt';

export const VINYL_STREAM_FPS = 30;
export const VINYL_STREAM_DURATION = 30 * 15;
export const VINYL_STREAM_WIDTH = 1920;
export const VINYL_STREAM_HEIGHT = 1080;

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

/** Resolve asset from public/ via staticFile(), fallback to legacy local require */
const getAssetUrl = (path: string): string | null => {
    if (!path) return null;
    // If it's a bare filename (legacy), try local assets/ first
    if (!path.includes('/')) {
        try {
            const asset = require(`./assets/${path}`);
            return typeof asset === 'string' ? asset : asset.default;
        } catch {
            // not found locally — fall through to staticFile
        }
    }
    return staticFile(path);
};

interface LiquidCrystalSceneProps {
    job?: RenderJob; // Optional: Remotion defaultProps fills this at runtime
}

/** Fallback when no job is passed (e.g. Remotion instantiates with empty props) */
const NOOP_JOB: RenderJob = {
    id: 'noop',
    composition: 'LiquidCrystalScene',
    audio: '',
    particles: {},
};

const LiquidCrystalScene: React.FC<LiquidCrystalSceneProps> = ({ job = NOOP_JOB }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames, height, width: canvasWidth } = useVideoConfig();

    // ── Destructure job config ────────────────────────────────────────────
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
    } = job;

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

    // ── Physics Engine: Pre-calculate all particle spawns & color shfits (Deterministic O(1)) ──
    const engine = useMemo(() => {
        if (!audioData) return { hearts: [], eqData: null, eqBands: 0, glitchFrames: null, bassEnergyArray: new Float32Array(0), trebleEnergyArray: new Float32Array(0) };

        const hearts: HeartParams[] = [];
        let hId = 0;

        const frameSamples = Math.floor(audioData.sampleRate / fps);
        const totalFrames = durationInFrames;

        // Pass 1: Energy history
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

        // Pass 2: Delta-based spawning
        for (let f = 0; f < totalFrames; f += 3) {
            let sumHist = 0, countHist = 0;
            for (let h = Math.max(0, f - HISTORY_FRAMES); h < f; h++) {
                sumHist += rawEnergy[h];
                countHist++;
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
                shouldSpawn = true;
                spawnCount = 4 + Math.floor(random(`cnt-${f}`) * 3);
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4;
                flyDuration = 20 + random(`durp-${f}`) * 10;
                isPeak = true;
                isMachineGun = true;
            } else if (normalizedDelta > 0.25) {
                shouldSpawn = true;
                spawnCount = 2 + Math.floor(random(`cnt-${f}`) * 3);
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4;
                flyDuration = 25 + random(`durp-${f}`) * 20;
                isPeak = true;
            } else if (normalizedDelta > 0.1) {
                shouldSpawn = random(`prob-${f}`) > 0.3;
                spawnCount = 1 + Math.floor(random(`cnt2-${f}`) * 2);
                scaleMultiplier = 1.1 + random(`scm2-${f}`) * 0.3;
                flyDuration = 45 + random(`durm-${f}`) * 20;
                isPeak = true;
            } else if (currentEnergy > maxEnergy * 0.7) {
                shouldSpawn = random(`prob3-${f}`) > 0.6;
                spawnCount = 1;
                scaleMultiplier = 0.9 + random(`scm3-${f}`) * 0.2;
            } else {
                shouldSpawn = random(`prob4-${f}`) > 0.96;
                spawnCount = 1;
                scaleMultiplier = 0.6 + random(`scm4-${f}`) * 0.2;
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

        // Pass 3: Liquid Color Shifting (Smoothed Bass Envelope)
        const bassEnergyArray = new Float32Array(totalFrames);
        const attack = 0.2;
        const decay = 0.95;
        for (let f = 0; f < totalFrames; f++) {
            const raw = rawEnergy[f];
            const prev = f > 0 ? bassEnergyArray[f - 1] : 0;
            // Normalize raw energy based on global maxEnergy
            const normalized = maxEnergy > 0 ? (raw / maxEnergy) : 0;
            // Heavy attack for punchiness, smooth decay for liquid feel
            bassEnergyArray[f] = normalized > prev
                 ? prev + (normalized - prev) * attack
                 : prev * decay;
        }

        // Pass 4: Treble Energy (4kHz – 16kHz) for distortion effect
        // NOTE: Must be computed BEFORE the EQ early-return so it’s always available.
        const trebleEnergyArray = new Float32Array(totalFrames);
        {
            const trebleMinHz = 4000;
            const trebleMaxHz = 16000;
            const sr2 = audioData.sampleRate;
            const FFT2 = 2048;
            const hann2 = new Float32Array(FFT2);
            for (let k = 0; k < FFT2; k++) hann2[k] = 0.5 * (1 - Math.cos(2 * Math.PI * k / (FFT2 - 1)));
            const re2 = new Float32Array(FFT2); const im2 = new Float32Array(FFT2);
            const wv2 = audioData.channelWaveforms[0];
            const binLo2 = Math.max(1, Math.round(trebleMinHz * FFT2 / sr2));
            const binHi2 = Math.min(FFT2 / 2 - 1, Math.round(trebleMaxHz * FFT2 / sr2));
            let maxT2 = 0.0001;
            const rawT2 = new Float32Array(totalFrames);
            for (let f = 0; f < totalFrames; f++) {
                const start = Math.max(0, f * frameSamples - FFT2 / 2);
                for (let k = 0; k < FFT2; k++) { re2[k] = (wv2[start + k] ?? 0) * hann2[k]; im2[k] = 0; }
                // Cooley-Tukey in-place
                const n = FFT2;
                for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re2[i]; re2[i] = re2[j]; re2[j] = t; t = im2[i]; im2[i] = im2[j]; im2[j] = t; } }
                for (let len = 2; len <= n; len <<= 1) { const ang = (-2 * Math.PI) / len; const wRe = Math.cos(ang), wIm = Math.sin(ang); for (let i = 0; i < n; i += len) { let cRe = 1, cIm = 0; for (let k = 0; k < len >> 1; k++) { const a = i+k, b = i+k+(len>>1); const vRe = re2[b]*cRe - im2[b]*cIm; const vIm = re2[b]*cIm + im2[b]*cRe; re2[b] = re2[a]-vRe; im2[b] = im2[a]-vIm; re2[a] += vRe; im2[a] += vIm; const nRe = cRe*wRe - cIm*wIm; cIm = cRe*wIm+cIm*wRe; cRe = nRe; } } }
                let sum = 0, cnt = 0;
                for (let k = binLo2; k <= binHi2; k++) { sum += Math.sqrt(re2[k]*re2[k] + im2[k]*im2[k]); cnt++; }
                rawT2[f] = cnt > 0 ? sum / cnt / FFT2 : 0;
                if (rawT2[f] > maxT2) maxT2 = rawT2[f];
            }
            const tAtt = 0.4, tDec = 0.88;
            for (let f = 0; f < totalFrames; f++) {
                const norm = rawT2[f] / maxT2;
                const prev = f > 0 ? trebleEnergyArray[f - 1] : 0;
                trebleEnergyArray[f] = norm > prev ? prev + (norm - prev) * tAtt : prev * tDec;
            }
        }

        // ── Equalizer Engine ─────────────────────────────────────────────────────
        if (!eqCfg?.enabled) return { hearts, eqData: null, eqBands: 0, glitchFrames: null, bassEnergyArray, trebleEnergyArray };

        const eqBands: number = eqCfg.bands ?? 64;
        const freqMin: number = eqCfg.freqMin ?? 60;
        const freqMax: number = eqCfg.freqMax ?? 16000;
        const waveform = audioData.channelWaveforms[0];
        const sr = audioData.sampleRate;

        const FFT_SIZE = 2048;
        const hann = new Float32Array(FFT_SIZE);
        for (let k = 0; k < FFT_SIZE; k++)
            hann[k] = 0.5 * (1 - Math.cos(2 * Math.PI * k / (FFT_SIZE - 1)));

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
                    sum += Math.sqrt(fftRe[k] * fftRe[k] + fftIm[k] * fftIm[k]);
                    cnt++;
                }
                rawEq[f * eqBands + b] = cnt > 0 ? sum / cnt / FFT_SIZE : 0;
            }
        }

        const weightingFilter = eqCfg.weightingFilter ?? 'A';
        if (weightingFilter === 'A') {
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
                normEq[f * eqBands + b] = range > 0.01
                    ? Math.max(0, Math.min(1, (bandSlice[f] - p5) / range))
                    : 0;
            }
        }

        const decayBase: number = eqCfg.decayFactor ?? 0.96;
        const attackBase: number = eqCfg.attackFactor ?? 0.20;
        const smoothEq = new Float32Array(totalFrames * eqBands);
        for (let b = 0; b < eqBands; b++) {
            const t = b / Math.max(1, eqBands - 1);
            const decay = decayBase - t * 0.08;
            const attack = attackBase + t * 0.18;
            for (let f = 0; f < totalFrames; f++) {
                const curr = normEq[f * eqBands + b];
                const prev = f > 0 ? smoothEq[(f - 1) * eqBands + b] : 0;
                smoothEq[f * eqBands + b] = curr > prev
                    ? prev + (curr - prev) * attack
                    : prev * decay;
            }
        }

        // ── Glitch Engine ────────────────────────────────────────────────────────
        type GlitchBlock = {
            id: number;
            x: number; y: number; w: number; h: number;
            type: 'color' | 'displace' | 'invert';
            color?: string;
            offsetX?: number; offsetY?: number;
        };
        type GlitchFrameData = {
            tearBlocks: GlitchBlock[];
            gridActive: boolean;
            gridJitterX: number;
            gridJitterY: number;
            trackingRollMode: boolean;
            trackingRollOffset: number;
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
            let framesLeftTear = 0;
            let gridActive = false;
            let framesLeftGrid = 0;
            let trackingRollActive = false;
            let framesLeftTrackingRoll = 0;
            let trackingRollPos = 0;
            let blockIdCounter = 0;

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
                                w, h: random(`g-h-${f}-${i}`) * 2 + 0.1,
                                type,
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
                    tearBlocks: [...activeTearBlocks],
                    gridActive,
                    gridJitterX: gridActive ? (random(`g-gox-${f}`) - 0.5) * 3 : 0,
                    gridJitterY: gridActive ? (random(`g-goy-${f}`) - 0.5) * 3 : 0,
                    trackingRollMode: trackingRollActive,
                    trackingRollOffset: trackingRollPos,
                };
            }
        }

        return { hearts, eqData: smoothEq, eqBands, glitchFrames, bassEnergyArray, trebleEnergyArray };
    }, [audioData, fps, durationInFrames, particleSpeed, particleSpreadAmplitude, particleColors, eqCfg, glitchCfg]);

    // ── Layout ───────────────────────────────────────────────────────────────────
    const baseSize = 250;
    const vinylSize = baseSize * (vinylSizePercent / 100);
    const vinylX = 50;
    const vinylY = height - vinylSize - 50;
    const vinylRotation = (frame * rotationSpeed) % 360;

    // EQ layout
    // ─ Pin EQ top & height directly to vinyl disc geometry ─────────────────
    const eqEnabled = eqCfg?.enabled && engine.eqData;
    const eqHeight: number = eqCfg?.height ?? vinylSize;   // default = disc diameter
    const eqBands: number = engine.eqBands ?? 0;
    const eqColor: string = eqCfg?.color ?? '#e91e63';
    const eqColor2: string = eqCfg?.secondaryColor ?? '#ff9800';
    const eqBarWidth: number = eqCfg?.barWidth ?? 7;
    const eqRadius: number = eqCfg?.cornerRadius ?? 3;
    const eqLeft = vinylX + vinylSize + 10;
    const eqTotalWidth = canvasWidth - eqLeft - 20;
    const eqComputedGap = eqBands > 1
        ? Math.max(1, (eqTotalWidth - eqBands * eqBarWidth) / (eqBands - 1))
        : 0;

    // Image url
    const imgUrl = image ? getAssetUrl(image) : null;
    const originGraphicUrl = originGraphic ? getAssetUrl(originGraphic) : null;
    const particleGraphicUrl = particleGraphic ? getAssetUrl(particleGraphic) : null;

    return (
        <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
            {audioUrl && <Audio src={audioUrl} />}

            {/* ── Background Glitch Layer ─────────────────────────────────────────── */}
            {(() => {
                if (!imgUrl) return null;
                if (!glitchCfg?.enabled || !engine.glitchFrames) {
                    // ── Liquid Color Shifting (bass) + Treble Distortion ───────────────
                    const bassArr2 = engine.bassEnergyArray || [];
                    const bassE = bassArr2[Math.min(frame, Math.max(0, bassArr2.length - 1))] || 0;
                    const trebleArr = engine.trebleEnergyArray || [];
                    const trebleE = trebleArr[Math.min(frame, Math.max(0, trebleArr.length - 1))] || 0;

                    // Bass springs
                    const punchE = spring({ frame, fps, config: { damping: 8, stiffness: 200, mass: 0.6 }, durationInFrames: 6, from: 0, to: bassE });
                    const driftE  = spring({ frame, fps, config: { damping: 30, stiffness: 40,  mass: 2.0 }, durationInFrames: 20, from: 0, to: bassE });
                    // Treble spring — fast and nervous
                    const trebleSpring = spring({ frame, fps, config: { damping: 6, stiffness: 300, mass: 0.4 }, durationInFrames: 4, from: 0, to: trebleE });

                    // Color shifting (bass)
                    const bgHue = interpolate(driftE,  [0, 1], [0, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const bgSat = interpolate(punchE,  [0, 1], [120, 260], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const bgBri = interpolate(punchE,  [0, 0.6, 1], [95, 115, 135], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const bgGlowH = (bgHue + 30) % 360;
                    const bgGlowA = interpolate(punchE, [0, 1], [0, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

                    // Treble distortion params
                    const rgbShift = interpolate(trebleSpring, [0, 1], [0, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const contrastBoost = interpolate(trebleSpring, [0, 1], [100, 180], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const vignetteA = interpolate(trebleSpring, [0, 1], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const baseImgStyle: React.CSSProperties = {
                        position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
                    };

                    return (
                        <AbsoluteFill style={{ zIndex: 0 }}>
                            {/* Base image with Liquid Color Shifting */}
                            <Img src={imgUrl} style={{
                                ...baseImgStyle,
                                filter: `hue-rotate(${bgHue}deg) saturate(${bgSat}%) brightness(${bgBri}%) contrast(${contrastBoost}%)`,
                            }} />

                            {/* RGB channel split — RED shifted right on treble */}
                            {trebleSpring > 0.05 && (
                                <Img src={imgUrl} style={{
                                    ...baseImgStyle,
                                    transform: `translateX(${rgbShift}px)`,
                                    mixBlendMode: 'screen',
                                    opacity: interpolate(trebleSpring, [0.05, 1], [0, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                                    filter: `hue-rotate(${bgHue}deg) saturate(400%) brightness(120%) sepia(1) hue-rotate(330deg)`,
                                }} />
                            )}

                            {/* RGB channel split — CYAN shifted left on treble */}
                            {trebleSpring > 0.05 && (
                                <Img src={imgUrl} style={{
                                    ...baseImgStyle,
                                    transform: `translateX(${-rgbShift}px)`,
                                    mixBlendMode: 'screen',
                                    opacity: interpolate(trebleSpring, [0.05, 1], [0, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                                    filter: `hue-rotate(${bgHue + 180}deg) saturate(300%) brightness(120%)`,
                                }} />
                            )}

                            {/* Vignette that tightens on treble hits */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteA}) 100%)`,
                                pointerEvents: 'none',
                            }} />

                            {/* Bass glow overlay */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `radial-gradient(ellipse at center, hsla(${bgGlowH}, 100%, 60%, ${bgGlowA}) 0%, transparent 70%)`,
                                mixBlendMode: 'screen',
                                pointerEvents: 'none',
                            }} />
                        </AbsoluteFill>
                    );
                }
                const enableRGBBreathing = glitchCfg.enableRGBBreathing !== false;
                const rgbBreathSplit = enableRGBBreathing ? Math.sin(frame * 0.05) * 2 : 0;

                // Liquid Color Shifting — bass drives hue drift
                const bassArrG = engine.bassEnergyArray || [];
                const bassEG = bassArrG[Math.min(frame, Math.max(0, bassArrG.length - 1))] || 0;
                const driftEG = spring({ frame, fps, config: { damping: 30, stiffness: 40, mass: 2.0 }, durationInFrames: 20, from: 0, to: bassEG });
                const glitchHue = interpolate(driftEG, [0, 1], [0, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const glitchSat = interpolate(bassEG, [0, 1], [110, 220], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
                    ? (random(`g-yshift-global-${frame}`) - 0.5) * 30
                    : 0;
                // Always apply Liquid hue-rotate; amplify on glitch events
                const baseFilter = `hue-rotate(${glitchHue}deg) saturate(${glitchSat}%) contrast(${isGridActive ? 150 : 120}%) ${isTearing ? `brightness(130%)` : ''}`;

                return (
                    <AbsoluteFill style={{ zIndex: 0 }}>
                        <div style={{ ...baseStyle, filter: baseFilter, transform: `translateY(${baseYShift}px)` }}>
                            <Img src={imgUrl} style={{
                                ...baseStyle,
                                transform: isGridActive ? `translate(0px, ${(random(`g-yshift-${frame}`) - 0.5) * 10}px)` : 'none'
                            }} />
                            {(isTearing || enableRGBBreathing) && (
                                <>
                                    <Img src={imgUrl} style={{
                                        ...baseStyle, mixBlendMode: 'screen',
                                        transform: isTearing ? `translateX(${Math.random() * 10 + 5}px)` : `translateX(${rgbBreathSplit}px)`,
                                        opacity: isTearing ? 0.5 : 0.4,
                                        filter: 'drop-shadow(0 0 0 red)'
                                    }} />
                                    <Img src={imgUrl} style={{
                                        ...baseStyle, mixBlendMode: 'screen',
                                        transform: isTearing ? `translateX(${-(Math.random() * 10 + 5)}px)` : `translateX(${-rgbBreathSplit}px)`,
                                        opacity: isTearing ? 0.5 : 0.4,
                                        filter: 'drop-shadow(0 0 0 cyan)'
                                    }} />
                                </>
                            )}
                        </div>

                        {blocks.map(b => {
                            const clipPath = `polygon(${b.x}% ${b.y}%, ${b.x + b.w}% ${b.y}%, ${b.x + b.w}% ${b.y + b.h}%, ${b.x}% ${b.y + b.h}%)`;
                            if (b.type === 'color') return (
                                <div key={b.id} style={{
                                    position: 'absolute', width: '100%', height: '100%',
                                    clipPath, backgroundColor: b.color,
                                    mixBlendMode: 'difference', opacity: 0.8,
                                }} />
                            );
                            if (b.type === 'invert') return (
                                <Img key={b.id} src={imgUrl} style={{ ...baseStyle, clipPath, filter: 'invert(100%) hue-rotate(90deg)' }} />
                            );
                            if (b.type === 'displace') return (
                                <div key={b.id} style={{ position: 'absolute', width: '100%', height: '100%', clipPath, overflow: 'hidden' }}>
                                    <Img src={imgUrl} style={{
                                        ...baseStyle,
                                        transform: `translate(${b.offsetX}px, ${b.offsetY}px) scale(1.1)`,
                                        filter: 'saturate(200%) contrast(150%)'
                                    }} />
                                </div>
                            );
                            return null;
                        })}

                        {isGridActive && (
                            <AbsoluteFill style={{
                                mixBlendMode: 'screen', opacity: 0.45,
                                transform: `translate(${frameData.gridJitterX}px, ${frameData.gridJitterY}px)`,
                                pointerEvents: 'none',
                                filter: 'contrast(350%) grayscale(100%) blur(0.8px)',
                                backgroundImage: `
                                    repeating-radial-gradient(ellipse at center, rgba(0,0,0,0.8), rgba(255,255,255,0.4) 1px, rgba(0,0,0,0.8) 3px),
                                    repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, transparent 2px, transparent 6px)
                                `,
                                backgroundSize: '14px 14px, 100% 6px',
                            }}>
                                <svg width="100%" height="100%">
                                    <filter id="staticNoiseGrid">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves={2} stitchTiles="stitch" result="noise" />
                                        <feColorMatrix type="matrix" values="1 0 0 0 0, 1 0 0 0 0, 1 0 0 0 0, 0 0 0 1.2 0" in="noise" result="coloredNoise" />
                                        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" />
                                    </filter>
                                    <rect width="100%" height="100%" fill="#fff" filter="url(#staticNoiseGrid)" />
                                </svg>
                            </AbsoluteFill>
                        )}

                        {isTrackingRoll && (
                            <div style={{
                                position: 'absolute', left: 0,
                                top: `${frameData.trackingRollOffset}%`,
                                width: '100%', height: '25%',
                                backdropFilter: 'blur(4px) hue-rotate(90deg) contrast(150%)',
                                opacity: 0.8,
                                transform: `translateX(${(random(`g-tr-${frame}`) - 0.5) * 15}px)`,
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                mixBlendMode: 'hard-light',
                                borderTop: '2px solid rgba(255, 255, 255, 0.2)',
                                borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                                pointerEvents: 'none', zIndex: 10,
                            }} />
                        )}

                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                            opacity: 0.08, pointerEvents: 'none', mixBlendMode: 'overlay', zIndex: 11,
                        }} />
                    </AbsoluteFill>
                );
            })()}

            {/* ── Particles ───────────────────────────────────────────────────────── */}
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
                        [1, 0],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );
                    const opacity = Math.min(timeOpacity, heightOpacity);

                    const spreadProgress = Math.max(0, (progress - particleSpreadStart) / (1 - particleSpreadStart));
                    const spreadCurve = Math.pow(spreadProgress, 1.2);
                    const sprayWideness = h.baseX * spreadCurve;
                    const currentAmp = h.amp * spreadCurve;
                    const sineSway = Math.sin(age * h.freq + h.phase) * currentAmp;
                    const xOff = sprayWideness + sineSway;

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
                            opacity,
                            zIndex: Math.floor(1000 - age),
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

            {/* ── Equalizer ───────────────────────────────────────────────────────── */}
            {eqEnabled && (
                <div style={{
                    position: 'absolute',
                    top: vinylY,           // ← pins top to disc top
                    height: eqHeight,      // ← matches disc diameter by default
                    left: eqLeft,
                    right: 20,
                    display: 'flex', flexDirection: 'row',
                    alignItems: 'flex-end', zIndex: 1500,
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
                            <div key={b} style={{
                                position: 'relative', width: eqBarWidth, flexShrink: 0,
                                height: eqHeight, marginRight: gap, alignSelf: 'flex-end',
                            }}>
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    height: barH,
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

            {/* ── Vinyl / Origin disc ─────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', left: vinylX, top: vinylY,
                width: vinylSize, height: vinylSize,
                backgroundColor: originBgColor,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                borderRadius: '50%', overflow: 'hidden', zIndex: 2000,
            }}>
                <div style={{ width: '100%', height: '100%', transform: `rotate(${vinylRotation}deg) scale(${originScale})` }}>
                    {originGraphicUrl ? (
                        <Img src={originGraphicUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <VinylSVG />
                    )}
                </div>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* ── Promo Popup ─────────────────────────────────────────────────────── */}
            {promoCfg?.enabled && (
                <PromoPopup
                    text={promoCfg.text || 'Listen on Spotify'}
                    iconSrc={promoCfg.icon ? (getAssetUrl(promoCfg.icon) ?? '') : ''}
                    cycleSeconds={promoCfg.cycleSeconds || 40}
                    offsetSeconds={promoCfg.offsetSeconds || 0}
                    holdSeconds={promoCfg.holdSeconds || 4}
                />
            )}

            {/* ── VCR Prompt ──────────────────────────────────────────────────────── */}
            {vcrCfg?.enabled && (
                <VCRPrompt
                    text={vcrCfg.text || '> FOLLOW US_'}
                    cycleSeconds={vcrCfg.cycleSeconds || 40}
                    offsetSeconds={vcrCfg.offsetSeconds || 20}
                    holdSeconds={vcrCfg.holdSeconds || 5}
                />
            )}

            {/* ── CRT Vignette + Scanlines ────────────────────────────────────────── */}
            {glitchCfg?.enableCRTVignette !== false && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: 15,
                    background: `
                        radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%),
                        linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.18) 50%)
                    `,
                    backgroundSize: '100% 100%, 100% 4px',
                    backgroundPosition: `center, 0 ${(frame * 0.4) % 4}px`,
                }} />
            )}
        </AbsoluteFill>
    );
};

export default LiquidCrystalScene;
