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

interface HolographicParallaxSceneProps {
    job?: RenderJob;
}

const NOOP_JOB: RenderJob = {
    id: 'noop',
    composition: 'HolographicParallaxScene',
    audio: '',
    particles: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const HolographicParallaxScene: React.FC<HolographicParallaxSceneProps> = ({ job = NOOP_JOB }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames, height, width: canvasWidth } = useVideoConfig();

    const {
        audio,
        originGraphic,
        originScale = 1.2,
        originBgColor = 'transparent',
        vinylSizePercent = 100,
        particleGraphic,
        particles = {},
        eq: eqCfg,
        promo: promoCfg,
        vcr: vcrCfg,
    parallax: parallaxCfg = {},
    } = job;

    const {
        colors: particleColors = ['#00ffff'],
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
            hearts: [],
            eqData: null,
            eqBands: 0,
            bassEnergyArray: new Float32Array(0),
            highsEnergyArray: new Float32Array(0),
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

        // Pass 3: Bass Energy Array (smoothed envelope) - low freq
        const bassEnergyArray = new Float32Array(totalFrames);
        const attack = 0.2, decay = 0.95;
        for (let f = 0; f < totalFrames; f++) {
            const normalized = maxEnergy > 0 ? rawEnergy[f] / maxEnergy : 0;
            const prev = f > 0 ? bassEnergyArray[f - 1] : 0;
            bassEnergyArray[f] = normalized > prev
                ? prev + (normalized - prev) * attack
                : prev * decay;
        }

        // Pass 4: Highs Energy Array - high frequency envelope (faster attack, faster decay)
        // We approximate highs by looking at rapid frame-to-frame changes (high derivative)
        const highsEnergyArray = new Float32Array(totalFrames);
        const highAttack = 0.7, highDecay = 0.75;
        for (let f = 1; f < totalFrames; f++) {
            const curr = maxEnergy > 0 ? rawEnergy[f] / maxEnergy : 0;
            const prev_raw = maxEnergy > 0 ? rawEnergy[f - 1] / maxEnergy : 0;
            // Highs = rapid amplitude changes (derivative-like measure)
            const delta = Math.abs(curr - prev_raw) * 3.0;
            const clampedDelta = Math.min(1, delta);
            const prevH = f > 0 ? highsEnergyArray[f - 1] : 0;
            highsEnergyArray[f] = clampedDelta > prevH
                ? prevH + (clampedDelta - prevH) * highAttack
                : prevH * highDecay;
        }

        // ── Equalizer Engine ─────────────────────────────────────────────────
        if (!eqCfg?.enabled) return {
            hearts, eqData: null, eqBands: 0, bassEnergyArray, highsEnergyArray,
        };

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

        return { hearts, eqData: smoothEq, eqBands, bassEnergyArray, highsEnergyArray };
    }, [audioData, fps, durationInFrames, particleSpeed, particleSpreadAmplitude, particleColors, eqCfg]);

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
    const eqLeft = vinylX + vinylSize + 10;
    const eqTotalWidth = canvasWidth - eqLeft - 20;
    const eqComputedGap = eqBands > 1 ? Math.max(1, (eqTotalWidth - eqBands * eqBarWidth) / (eqBands - 1)) : 0;

    const originGraphicUrl = originGraphic ? getAssetUrl(originGraphic) : null;
    const particleGraphicUrl = particleGraphic ? getAssetUrl(particleGraphic) : null;

    // ── Parallax Config ───────────────────────────────────────────────────────
    const parallaxGraphicRaw = parallaxCfg.graphic ?? null;
    const parallaxGraphicUrl = parallaxGraphicRaw ? getAssetUrl(parallaxGraphicRaw) : null;
    const rotateXMax: number = parallaxCfg.rotateXMax ?? 12;     // °, tilt back on bass
    const rotateYAmplitude: number = parallaxCfg.rotateYAmplitude ?? 6;  // °, passive drift
    const translateZMax: number = parallaxCfg.translateZMax ?? 60; // px, zoom in on highs
    const aberrationMax: number = parallaxCfg.aberrationMax ?? 6;  // px, RGB split
    const scanLine: boolean = parallaxCfg.scanLine !== false;
    const glowColor: string = parallaxCfg.baseColor ?? '#00ffff';
    const glowAccent: string = parallaxCfg.accentColor ?? '#ff00ff';
    const frameCfg = parallaxCfg.frame || {};
    const frameEnabled = frameCfg.enabled !== false;
    const frameColor = frameCfg.color ?? glowColor;
    const frameRotMult = frameCfg.rotationMultiplier ?? 2.5;

    // ── Audio-reactive values ─────────────────────────────────────────────────
    const bassArr = engine.bassEnergyArray || [];
    const highsArr = engine.highsEnergyArray || [];

    const rawBassE = bassArr[Math.min(frame, Math.max(0, bassArr.length - 1))] || 0;
    const rawHighsE = highsArr[Math.min(frame, Math.max(0, highsArr.length - 1))] || 0;

    // Fast punch spring — kick-reactive
    const punchE = spring({
        frame, fps,
        config: { damping: 8, stiffness: 220, mass: 0.5 },
        durationInFrames: 5,
        from: 0, to: rawBassE,
    });

    // Slow drift spring — low-frequency envelope
    const driftE = spring({
        frame, fps,
        config: { damping: 25, stiffness: 35, mass: 2.5 },
        durationInFrames: 25,
        from: 0, to: rawBassE,
    });

    // Highs spring — fast, snappy
    const highsE = spring({
        frame, fps,
        config: { damping: 12, stiffness: 300, mass: 0.3 },
        durationInFrames: 4,
        from: 0, to: rawHighsE,
    });

    // ── 3D Parallax values ────────────────────────────────────────────────────
    // Bass → tilt BACK (negative rotateX) and slight scale DOWN
    const rotateX = interpolate(driftE, [0, 1], [0, -rotateXMax], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Passive Y drift from slow sine — hologram floating effect
    const passiveDriftY = Math.sin(frame * 0.012) * rotateYAmplitude;
    // On kick: snap Y toward 0 briefly for a "shock" look
    const rotateY = passiveDriftY * (1 - punchE * 0.6);

    // Highs → translateZ TOWARD viewer (closer)
    const translateZ = interpolate(highsE, [0, 1], [0, translateZMax], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Scale micro-pulse on kick
    const scalePulse = interpolate(punchE, [0, 1], [1.0, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // RGB chromatic aberration — on kick
    const aberration = interpolate(punchE, [0, 1], [0, aberrationMax], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Ambient glow radius and opacity — pulses with bass
    const glowRadius = interpolate(driftE, [0, 1], [60, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const glowOpacity = interpolate(driftE, [0, 1], [0.25, 0.75], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Scan line Y position: slow downward movement + oscillation
    const scanLineY = ((frame * 1.8) % 120); // 0-120% so it loops off screen

    // Scan line opacity: rhythmic flash on mid energy
    const scanLineOpacity = interpolate(
        Math.sin(frame * 0.04),
        [-1, 1], [0.15, 0.45],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    ) + punchE * 0.3;

    // Holographic color: base hue shifts between glowColor and glowAccent on beat
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

    const baseHue = hexToHue(glowColor);
    const accentHue = hexToHue(glowAccent);
    const currentHue = interpolate(punchE, [0, 1], [baseHue, accentHue], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const scanHue = (currentHue + 30) % 360;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
            {audioUrl && <Audio src={audioUrl} />}

            {/* ── Ambient background glow (behind everything) ─────────────── */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse ${glowRadius * 1.5}% ${glowRadius}% at 50% 48%,
                    hsla(${currentHue}, 100%, 30%, ${glowOpacity * 0.6}) 0%,
                    hsla(${(currentHue + 60) % 360}, 100%, 15%, ${glowOpacity * 0.3}) 40%,
                    transparent 70%)`,
                zIndex: 1,
                pointerEvents: 'none',
            }} />

            {/* ── Subtle grid lines — holographic backdrop ─────────────────── */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    linear-gradient(hsla(${baseHue}, 100%, 60%, 0.04) 1px, transparent 1px),
                    linear-gradient(90deg, hsla(${baseHue}, 100%, 60%, 0.04) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                zIndex: 2,
                pointerEvents: 'none',
            }} />

            {/* ── Central 3D Parallax Subject ──────────────────────────────── */}
            {parallaxGraphicUrl && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 500,
                    perspective: '800px',
                    perspectiveOrigin: '50% 50%',
                }}>
                    {/* RGB Chromatic Aberration — Red channel */}
                    {aberration > 0.5 && (
                        <Img
                            src={parallaxGraphicUrl}
                            style={{
                                position: 'absolute',
                                width: '75%',
                                height: '75%',
                                objectFit: 'contain',
                                transform: `
                                    rotateX(${rotateX.toFixed(2)}deg)
                                    rotateY(${rotateY.toFixed(2)}deg)
                                    translateZ(${translateZ.toFixed(1)}px)
                                    scale(${scalePulse.toFixed(3)})
                                    translateX(${aberration.toFixed(1)}px)
                                `,
                                transformStyle: 'preserve-3d',
                                filter: `hue-rotate(0deg) saturate(300%) brightness(0.4)
                                         drop-shadow(0 0 0 #ff0000)`,
                                mixBlendMode: 'screen',
                                opacity: 0.55,
                            }}
                        />
                    )}

                    {/* RGB Chromatic Aberration — Blue channel */}
                    {aberration > 0.5 && (
                        <Img
                            src={parallaxGraphicUrl}
                            style={{
                                position: 'absolute',
                                width: '75%',
                                height: '75%',
                                objectFit: 'contain',
                                transform: `
                                    rotateX(${rotateX.toFixed(2)}deg)
                                    rotateY(${rotateY.toFixed(2)}deg)
                                    translateZ(${translateZ.toFixed(1)}px)
                                    scale(${scalePulse.toFixed(3)})
                                    translateX(${(-aberration).toFixed(1)}px)
                                `,
                                transformStyle: 'preserve-3d',
                                filter: `hue-rotate(240deg) saturate(300%) brightness(0.4)
                                         drop-shadow(0 0 0 #0000ff)`,
                                mixBlendMode: 'screen',
                                opacity: 0.55,
                            }}
                        />
                    )}

                    {/* Main subject — full color + glow */}
                    <Img
                        src={parallaxGraphicUrl}
                        style={{
                            position: 'relative',
                            width: '75%',
                            height: '75%',
                            objectFit: 'contain',
                            transform: `
                                rotateX(${rotateX.toFixed(2)}deg)
                                rotateY(${rotateY.toFixed(2)}deg)
                                translateZ(${translateZ.toFixed(1)}px)
                                scale(${scalePulse.toFixed(3)})
                            `,
                            transformStyle: 'preserve-3d',
                            filter: `
                                brightness(${interpolate(punchE, [0, 1], [1.0, 1.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).toFixed(2)})
                                drop-shadow(0 0 ${interpolate(driftE, [0, 1], [8, 40], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).toFixed(0)}px hsla(${currentHue.toFixed(0)}, 100%, 70%, 0.9))
                                drop-shadow(0 0 ${interpolate(driftE, [0, 1], [20, 80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).toFixed(0)}px hsla(${accentHue.toFixed(0)}, 100%, 60%, 0.5))
                            `,
                            willChange: 'transform, filter',
                        }}
                    />

                    {/* ── Holographic Scan Line ─────────────────────────────── */}
                    {scanLine && (
                        <div style={{
                            position: 'absolute',
                            left: '10%',
                            width: '80%',
                            height: '2px',
                            top: `${scanLineY}%`,
                            background: `linear-gradient(90deg,
                                transparent 0%,
                                hsla(${scanHue.toFixed(0)}, 100%, 80%, ${(scanLineOpacity * 0.8).toFixed(2)}) 20%,
                                hsla(${((scanHue + 30) % 360).toFixed(0)}, 100%, 95%, ${scanLineOpacity.toFixed(2)}) 50%,
                                hsla(${scanHue.toFixed(0)}, 100%, 80%, ${(scanLineOpacity * 0.8).toFixed(2)}) 80%,
                                transparent 100%
                            )`,
                            boxShadow: `0 0 8px 2px hsla(${scanHue.toFixed(0)}, 100%, 70%, ${(scanLineOpacity * 0.6).toFixed(2)})`,
                            borderRadius: '1px',
                            mixBlendMode: 'screen',
                            pointerEvents: 'none',
                            transform: `
                                rotateX(${rotateX.toFixed(2)}deg)
                                rotateY(${rotateY.toFixed(2)}deg)
                                translateZ(${(translateZ + 2).toFixed(1)}px)
                            `,
                        }} />
                    )}
                </div>
            )}

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
                                        : `3px 3px 0 0`,
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

            {/* ── CRT Vignette ─────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 4000,
                background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.72) 100%)',
            }} />

            {/* ── Popups ───────────────────────────────────────────────────── */}
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
                        text={vcrCfg.text || '> HOLOGRAM_DRIFT_'}
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

export default HolographicParallaxScene;
