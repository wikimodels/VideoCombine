import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, AbsoluteFill, random } from 'remotion';
import { useAudioData } from '@remotion/media-utils';
import { interpolate, Easing, Img } from 'remotion';

// Local encapsulated config
import cfg from './config.json';
import { DefaultVinyl as VinylSVG } from './assets/VinylGraphic';
import { SkullGraphic } from './assets/SkullGraphic';
import { CrosshairGraphic } from './assets/CrosshairGraphic';
import { PromoPopup } from './PromoPopup';
import { VCRPrompt } from './VCRPrompt';

export const VINYL_STREAM_FPS = 30;
export const VINYL_STREAM_DURATION = 30 * 15; // default 15 sec if not bounded
export const VINYL_STREAM_WIDTH = 1920;
export const VINYL_STREAM_HEIGHT = 1080;

type HeartParams = {
    id: number;
    startF: number;
    duration: number; // How many frames it lives
    baseX: number;
    // Physics constants
    amp: number;
    freq: number;
    phase: number;
    scaleStart: number;
    scalePeak: number;
    color: string;
};

// Helper to resolve encapsulated assets
export const getAssetUrl = (filename: string) => {
    try {
        const asset = require(`./assets/${filename}`);
        return typeof asset === 'string' ? asset : asset.default;
    } catch (e) {
        console.warn(`Asset ${filename} not found in encapsulated assets.`);
        return null; // fallback gracefully if missing
    }
};


const VinylStreamOverlay: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames, height, width: canvasWidth } = useVideoConfig();

    const audioUrl = cfg.audioTrack ? getAssetUrl(cfg.audioTrack.src) : null;
    const audioData = useAudioData(audioUrl || '');

    // Physics Engine: Precalculate all heart spawns (Deterministic O(1))
    const engine = useMemo(() => {
        if (!audioData) return { hearts: [], eqData: null, eqBands: 0, glitchParams: null };

        const hearts: HeartParams[] = [];
        let hId = 0;

        // --- Track-Agnostic Drop Analysis (The "Artery Blood" effect) ---
        // We calculate instantaneous rhythm spikes (Drops) by comparing the exact 
        // current instant against the average energy of the last 0.5 seconds (Context).
        const frameSamples = Math.floor(audioData.sampleRate / fps);
        const totalFrames = durationInFrames;

        // Pass 1: Build Energy History and find absolute Max
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

        const HISTORY_FRAMES = Math.floor(fps * 0.5); // 0.5 seconds context window

        // Pass 2: Calculate Delta (Contrast) and Spawn
        for (let f = 0; f < totalFrames; f += 3) { // check every 3 frames → ~33% less dense

            // 1. Calculate the recent local average (the "za-tish'-e" context)
            let sumHist = 0;
            let countHist = 0;
            for (let h = Math.max(0, f - HISTORY_FRAMES); h < f; h++) {
                sumHist += rawEnergy[h];
                countHist++;
            }
            const localAvg = countHist > 0 ? sumHist / countHist : 0;

            // 2. Calculate the Delta Drop (Contrast)
            const currentEnergy = rawEnergy[f];
            // Delta is the sharp spike above the rolling average
            const delta = Math.max(0, currentEnergy - localAvg);

            // Normalize delta against the absolute track peak to standardize sensitivity
            const normalizedDelta = delta / maxEnergy;

            let shouldSpawn = false;
            let scaleMultiplier = 1.0;
            let flyDuration = 90 + random(`dur-${f}`) * 60; // default 3-5 sec
            let isPeak = false;
            let spawnCount = 0; // How many to spawn this tick
            let isMachineGun = false;

            if (normalizedDelta > 0.5) {
                // ABSOLUTE PEAK (The "Machine Gun" Burst)
                // Straight rapid-fire line, no side-to-side sway.
                shouldSpawn = true;
                spawnCount = 4 + Math.floor(random(`cnt-${f}`) * 3); // 4 to 6 hearts
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4; // Large, but capped (20% smaller than previous 1.8 max)
                flyDuration = 20 + random(`durp-${f}`) * 10; // Extremely fast
                isPeak = true;
                isMachineGun = true;
            } else if (normalizedDelta > 0.25) {
                // MASSIVE DROP / EXPLOSION 
                shouldSpawn = true;
                spawnCount = 2 + Math.floor(random(`cnt-${f}`) * 3); // 2 to 4 hearts
                scaleMultiplier = 1.4 + random(`scm-${f}`) * 0.4; // Capped max size (-20%)
                flyDuration = 25 + random(`durp-${f}`) * 20; // Very fast blast
                isPeak = true;
            } else if (normalizedDelta > 0.1) {
                // Strong regular beat / build up
                shouldSpawn = random(`prob-${f}`) > 0.3; // 70% chance 
                spawnCount = 1 + Math.floor(random(`cnt2-${f}`) * 2); // 1-2
                scaleMultiplier = 1.1 + random(`scm2-${f}`) * 0.3;
                flyDuration = 45 + random(`durm-${f}`) * 20; // Faster
                isPeak = true;
            } else if (currentEnergy > maxEnergy * 0.7) {
                // Loud sustained section
                shouldSpawn = random(`prob3-${f}`) > 0.6; // 40% chance
                spawnCount = 1;
                scaleMultiplier = 0.9 + random(`scm3-${f}`) * 0.2;
            } else {
                // Quiet / Regular flow / Silence
                shouldSpawn = random(`prob4-${f}`) > 0.96; // Only 4% chance
                spawnCount = 1;
                scaleMultiplier = 0.6 + random(`scm4-${f}`) * 0.2; // Small base stream
            }

            if (shouldSpawn) {
                for (let i = 0; i < spawnCount; i++) {

                    // Machine gun = perfect linear stagger. Normal = random scatter stagger.
                    const staggerOffset = isMachineGun ? (i * 3) : Math.floor(random(`stag-${f}-${i}`) * 2);

                    hearts.push({
                        id: hId++,
                        startF: f + staggerOffset,
                        duration: (flyDuration + random(`df-${f}-${i}`) * 20) / ((cfg.overlay as any)?.particleSpeed ?? 1.0),

                        // NARROW the hole constraint: starts almost from a single point!
                        // Machine Gun has 0 spread, perfect straight line.
                        baseX: isMachineGun ? 0 : (random(`boff-${f}-${i}`) - 0.5) * (isPeak ? 15 : 5),

                        // Machine Gun gets a small spread so particles fan after spreadStart
                        // particleSpreadAmplitude scales lateral spread (default 1.0)
                        amp: (isMachineGun ? 20 + random(`bamp-${f}-${i}`) * 30 : 35 + random(`bamp-${f}-${i}`) * (isPeak ? 90 : 35)) * ((cfg.overlay as any)?.particleSpreadAmplitude ?? 1.0),

                        freq: 0.03 + random(`bfreq-${f}-${i}`) * 0.05,
                        phase: random(`bphase-${f}-${i}`) * Math.PI * 2,
                        scaleStart: 0.2 + random(`bsc1-${f}-${i}`) * 0.3,
                        scalePeak: (0.6 + random(`bsc2-${f}-${i}`) * 0.4) * scaleMultiplier,
                        color: cfg.overlay?.colors ? cfg.overlay.colors[Math.floor(random(`bcol-${f}-${i}`) * cfg.overlay.colors.length)] : '#e91e63'
                    });
                }
            }
        }

        // ── Equalizer Engine ──────────────────────────────────────────────────────
        // Runs only when equalizer is enabled. All computation is pre-calculated
        // here — O(1) per rendered frame.
        const eqCfg = (cfg as any).equalizer;
        if (!eqCfg?.enabled) return { hearts, eqData: null, eqPeaks: null, eqBands: 0 };

        const eqBands: number = eqCfg.bands ?? 64;
        const freqMin: number = eqCfg.freqMin ?? 60;
        const freqMax: number = eqCfg.freqMax ?? 16000;
        const waveform = audioData.channelWaveforms[0];
        const sr = audioData.sampleRate;

        // ── Step 1: FFT setup — Hanning window + Cooley-Tukey radix-2 FFT ──────────
        // FFT replaces naive DFT: O(N log N) vs O(N²), better isolation per band.
        // Hanning window eliminates spectral leakage — bands no longer "bleed" into
        // neighbors, fixing the "wall" effect on high frequencies.
        const FFT_SIZE = 2048; // power of 2; 44100/2048 ≈ 21.5 Hz/bin
        const hann = new Float32Array(FFT_SIZE);
        for (let k = 0; k < FFT_SIZE; k++)
            hann[k] = 0.5 * (1 - Math.cos(2 * Math.PI * k / (FFT_SIZE - 1)));

        // Cooley-Tukey in-place radix-2 FFT
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

        // ── Step 2: Pre-compute log-spaced bin boundaries ───────────────────────────
        // Each EQ band maps to a RANGE of FFT bins (not one frequency point).
        // Averaging multiple bins per band = much stabler, smoother measurement.
        const bandBinLo = new Int32Array(eqBands);
        const bandBinHi = new Int32Array(eqBands);
        for (let b = 0; b < eqBands; b++) {
            const fLo = freqMin * Math.pow(freqMax / freqMin, b / eqBands);
            const fHi = freqMin * Math.pow(freqMax / freqMin, (b + 1) / eqBands);
            bandBinLo[b] = Math.max(1, Math.round(fLo * FFT_SIZE / sr));
            bandBinHi[b] = Math.min(FFT_SIZE / 2 - 1, Math.round(fHi * FFT_SIZE / sr));
        }

        // ── Step 3 (was 2): Compute FFT per frame → RMS per log-band ───────────────
        const rawEq = new Float32Array(totalFrames * eqBands);
        for (let f = 0; f < totalFrames; f++) {
            const center = f * frameSamples;
            const start = Math.max(0, center - FFT_SIZE / 2);
            for (let k = 0; k < FFT_SIZE; k++) {
                fftRe[k] = (waveform[start + k] ?? 0) * hann[k]; // Hanning window
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

        // Step 3b: A-weighting filter (optional, weightingFilter: "A").
        // Models human ear perception: boosts ~4kHz, attenuates lows and extremes.
        // Makes the visualizer respond to what you HEAR, not just raw amplitude.
        const weightingFilter = eqCfg.weightingFilter ?? 'A'; // default to A-weighting for better visual balance
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
                const fc = Math.sqrt(fLo * fHi); // geometric center
                const gain = aWeight(fc);
                for (let f = 0; f < totalFrames; f++) {
                    rawEq[f * eqBands + b] *= gain;
                }
            }
        }

        // Step 4: Log-scale + percentile auto-gain (style-agnostic).
        // Each band's actual [p5..p95] dynamic range is stretched to 0-1.
        // Result: every band dances to its own variation — phonk, medieval, afrobeat, anything.
        const DB_FLOOR = -120;
        const logEq = new Float32Array(totalFrames * eqBands);
        for (let f = 0; f < totalFrames; f++) {
            for (let b = 0; b < eqBands; b++) {
                const raw = rawEq[f * eqBands + b];
                const db = 20 * Math.log10(raw + 1e-9);
                logEq[f * eqBands + b] = Math.max(0, (db - DB_FLOOR) / (-DB_FLOOR));
            }
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

        // Step 5: Frequency-dependent Attack + Decay smoothing.
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

        // ── Glitch Engine (Digital Block Aesthetic) ────────────────────────────────
        // Generates random digital artifacts (blocks, slices, pixelation) 
        // completely independent of the audio rhythm, "living its own life".
        const glitchCfg = (cfg as any).glitch;

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
            trackingRollMode: boolean; // Is the VCR tracking slipping?
            trackingRollOffset: number; // Current Y offset of the slip
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
            const enableRGBBreathing = glitchCfg.enableRGBBreathing !== false;
            const enableCRTVignette = glitchCfg.enableCRTVignette !== false;

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
                // --- TEAR STREAM (Independent) ---
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
                } else {
                    framesLeftTear--;
                }

                // --- GRID STREAM (Independent) ---
                if (framesLeftGrid <= 0) {
                    gridActive = false;
                    if (canGrid && random(`g-start-grid-${f}`) < gridProb) {
                        // Grid is "signal loss", hold it much longer now (4 to 12 frames instead of 2 to 8)
                        framesLeftGrid = Math.floor(random(`g-glen-${f}`) * 8 * intensity) + 4;
                        gridActive = true;
                    }
                } else {
                    framesLeftGrid--;
                }

                // --- TRACKING ROLL STREAM (Independent) ---
                if (framesLeftTrackingRoll <= 0) {
                    trackingRollActive = false;
                    // Tracking roll happens very rarely, much less than normal grid
                    if (canTrackingRoll && random(`g-start-roll-${f}`) < (gridProb * 0.4)) {
                        // Takes about 1-2 seconds (30-60 frames) to roll across screen
                        framesLeftTrackingRoll = Math.floor(random(`g-rlen-${f}`) * 30 * intensity) + 30;
                        trackingRollActive = true;
                        trackingRollPos = random(`g-rpos-${f}`) > 0.5 ? -20 : 120; // Start top or bottom
                    }
                } else {
                    framesLeftTrackingRoll--;
                    // Move the roll band up/down slowly based on remaining frames
                    const speed = 2 * intensity;
                    trackingRollPos += (trackingRollPos < 50 ? speed : -speed); // Move towards center-ish or just sweep
                }

                glitchFrames[f] = {
                    tearBlocks: [...activeTearBlocks],
                    gridActive,
                    gridJitterX: gridActive ? (random(`g-gox-${f}`) - 0.5) * 3 : 0,
                    gridJitterY: gridActive ? (random(`g-goy-${f}`) - 0.5) * 3 : 0,
                    trackingRollMode: trackingRollActive,
                    trackingRollOffset: trackingRollPos
                };
            }
        }

        return { hearts, eqData: smoothEq, eqBands, glitchFrames };
    }, [audioData, fps, durationInFrames]);

    // Position of the Graphic Record (Bottom Left, configurable percent)
    const baseSize = 250;
    const vinylSize = baseSize * ((cfg.overlay?.vinylSizePercent || 100) / 100);
    const vinylX = 50;  // Padding from Left
    const vinylY = height - vinylSize - 50; // Padding from Bottom

    // Spinning logic - dynamically configured
    const rotationSpeed = cfg.overlay?.rotationSpeed !== undefined ? cfg.overlay.rotationSpeed : 3;
    const vinylRotation = (frame * rotationSpeed) % 360;
    const originScale = cfg.overlay?.originScale ?? 1.2;
    const originBgColor = cfg.overlay?.originBackgroundColor ?? 'transparent';

    // Equalizer config
    const eqCfg = (cfg as any).equalizer;
    const eqEnabled = eqCfg?.enabled && engine.eqData;
    const eqHeight: number = eqCfg?.height ?? 100;
    const eqBands: number = engine.eqBands ?? 0;
    const eqRadius: number = eqCfg?.cornerRadius ?? 3;
    const eqColor: string = eqCfg?.color ?? '#e91e63';
    const eqColor2: string = eqCfg?.secondaryColor ?? '#ff9800';
    const eqBottom: number = eqCfg?.bottom ?? 0;
    const eqBarWidth: number = eqCfg?.barWidth ?? 7;
    // EQ starts right after the vinyl circle + small breathing gap
    const eqLeft = vinylX + vinylSize + 10;
    // Auto-compute gap so bars fill the full available width at fixed barWidth
    const eqTotalWidth = canvasWidth - eqLeft - 20;
    const eqComputedGap = eqBands > 1
        ? Math.max(1, (eqTotalWidth - eqBands * eqBarWidth) / (eqBands - 1))
        : 0;

    return (
        <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
            {audioUrl && <Audio src={audioUrl} />}

            {/* ── Background Glitch Layer (Digital Block / Datamosh / Analog Static) ── */}
            {(() => {
                const glitchCfg = (cfg as any).glitch;
                if (!glitchCfg?.enabled || !engine.glitchFrames) return null;

                // Analog VHS Toggles
                const enableRGBBreathing = glitchCfg.enableRGBBreathing !== false;
                const rgbBreathSplit = enableRGBBreathing ? Math.sin(frame * 0.05) * 2 : 0;

                const frameData = engine.glitchFrames[frame] || {
                    tearBlocks: [], gridActive: false, gridJitterX: 0, gridJitterY: 0,
                    trackingRollMode: false, trackingRollOffset: 0
                };
                const blocks = frameData.tearBlocks;
                const isGridActive = frameData.gridActive;
                const isTrackingRoll = frameData.trackingRollMode;

                const imgUrl = getAssetUrl(glitchCfg.image || 'boy_1.jpg');
                if (!imgUrl) return null;

                const baseStyle: React.CSSProperties = {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                };

                const isTearing = blocks.length > 0;

                // Shake amplitude calculation: random shift between -15px and +15px when ANY glitch is happening
                const baseYShift = (isTearing || isGridActive)
                    ? (random(`g-yshift-global-${frame}`) - 0.5) * 30
                    : 0;

                // Base filter applied to the whole image when a tear glitch happens
                const baseFilter = (isTearing || isGridActive)
                    ? `contrast(${isGridActive ? 150 : 120}%) saturate(${isTearing ? 150 : 80}%) ${isTearing ? `hue-rotate(${Math.random() * 90 - 45}deg)` : ''}`
                    : 'none';

                return (
                    <AbsoluteFill style={{ zIndex: 0 }}>
                        {/* Static Base Image with optional global glitch filter AND Vertical Shake */}
                        <div style={{
                            ...baseStyle,
                            filter: baseFilter,
                            transform: `translateY(${baseYShift}px)` // Global shake!
                        }}>
                            <Img src={imgUrl} style={{
                                ...baseStyle,
                                transform: isGridActive ? `translate(0px, ${(random(`g-yshift-${frame}`) - 0.5) * 10}px)` : 'none'
                            }} />

                            {/* Global RGB Split (Chromatic Aberration) - either tearing or persistent breathing */}
                            {(isTearing || enableRGBBreathing) && (
                                <>
                                    <Img src={imgUrl} style={{
                                        ...baseStyle, mixBlendMode: 'screen',
                                        transform: isTearing
                                            ? `translateX(${Math.random() * 10 + 5}px)`
                                            : `translateX(${rgbBreathSplit}px)`,
                                        opacity: isTearing ? 0.5 : 0.4,
                                        filter: 'drop-shadow(0 0 0 red)'
                                    }} />
                                    <Img src={imgUrl} style={{
                                        ...baseStyle, mixBlendMode: 'screen',
                                        transform: isTearing
                                            ? `translateX(${-(Math.random() * 10 + 5)}px)`
                                            : `translateX(${-rgbBreathSplit}px)`,
                                        opacity: isTearing ? 0.5 : 0.4,
                                        filter: 'drop-shadow(0 0 0 cyan)'
                                    }} />
                                </>
                            )}
                        </div>

                        {/* Render Active Glitch Effects (Horizontal Tearing) */}
                        {blocks.map(b => {
                            const clipPath = `polygon(${b.x}% ${b.y}%, ${b.x + b.w}% ${b.y}%, ${b.x + b.w}% ${b.y + b.h}%, ${b.x}% ${b.y + b.h}%)`;

                            if (b.type === 'color') {
                                return (
                                    <div key={b.id} style={{
                                        position: 'absolute',
                                        width: '100%', height: '100%',
                                        clipPath,
                                        backgroundColor: b.color,
                                        mixBlendMode: 'difference', // Gives neon glitch coloring
                                        opacity: 0.8
                                    }} />
                                );
                            } else if (b.type === 'invert') {
                                return (
                                    <Img key={b.id} src={imgUrl} style={{
                                        ...baseStyle,
                                        clipPath,
                                        filter: 'invert(100%) hue-rotate(90deg)'
                                    }} />
                                );
                            } else if (b.type === 'displace') {
                                return (
                                    <div key={b.id} style={{
                                        position: 'absolute',
                                        width: '100%', height: '100%',
                                        clipPath,
                                        overflow: 'hidden'
                                    }}>
                                        <Img src={imgUrl} style={{
                                            ...baseStyle,
                                            transform: `translate(${b.offsetX}px, ${b.offsetY}px) scale(1.1)`,
                                            filter: 'saturate(200%) contrast(150%)'
                                        }} />
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* Render Analog Static Mesh (Grid) */}
                        {isGridActive && (
                            <AbsoluteFill style={{
                                mixBlendMode: 'screen', // Blends nicely to create 'static' vibe
                                opacity: 0.45, // Slightly higher opacity to be more visible
                                transform: `translate(${frameData.gridJitterX}px, ${frameData.gridJitterY}px)`,
                                pointerEvents: 'none',
                                filter: 'contrast(350%) grayscale(100%) blur(0.8px)', // More contrast, slightly blurrier
                                // Creates a LARGER, chunkier television raster checkboard/mesh
                                backgroundImage: `
                                    repeating-radial-gradient(ellipse at center, rgba(0,0,0,0.8), rgba(255,255,255,0.4) 1px, rgba(0,0,0,0.8) 3px),
                                    repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, transparent 2px, transparent 6px)
                                `,
                                backgroundSize: '14px 14px, 100% 6px',
                            }}>
                                {/* Subtle micro-scanline noise on top using SVG standard filter.
                                    baseFrequency="0.4" makes the noise clumps larger/chunkier than 0.9 */}
                                <svg width="100%" height="100%">
                                    <filter id="staticNoiseGrid">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" stitchTiles="stitch" result="noise" />
                                        <feColorMatrix type="matrix" values="1 0 0 0 0, 1 0 0 0 0, 1 0 0 0 0, 0 0 0 1.2 0" in="noise" result="coloredNoise" />
                                        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" />
                                    </filter>
                                    <rect width="100%" height="100%" fill="#fff" filter="url(#staticNoiseGrid)" />
                                </svg>
                            </AbsoluteFill>
                        )}

                        {/* VCR Tracking Roll (Horizontal distorted band moving vertically) */}
                        {isTrackingRoll && (
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: `${frameData.trackingRollOffset}%`, // Moves up/down over time
                                width: '100%',
                                height: '25%', // A thick band
                                backdropFilter: 'blur(4px) hue-rotate(90deg) contrast(150%)',
                                opacity: 0.8,
                                transform: `translateX(${(random(`g-tr-${frame}`) - 0.5) * 15}px)`, // Jiggles horizontally as it goes
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                mixBlendMode: 'hard-light',
                                borderTop: '2px solid rgba(255, 255, 255, 0.2)',
                                borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                                pointerEvents: 'none',
                                zIndex: 10
                            }} />
                        )}

                        {/* Film Grain / Noise Overlay (optional, subtle texture) */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                            opacity: 0.08, // Very subtle, just adds organic feel to the digital blocks
                            pointerEvents: 'none',
                            mixBlendMode: 'overlay',
                            zIndex: 11
                        }} />
                    </AbsoluteFill>
                );
            })()}

            {/* Render Hearts */}
            {engine.hearts
                .filter(h => {
                    const age = frame - h.startF;
                    return age >= 0 && age <= h.duration;
                })
                .map(h => {
                    const age = frame - h.startF;

                    const progress = age / h.duration; // 0 to 1

                    // O(1) Physics Math:
                    // The HOSE Effect: xOff starts precisely at 0 (center hole) and expands outward as it rises
                    const fullTravel = -(height - 100); // always full screen height — no positional cap
                    const decStrength = (cfg.overlay as any)?.particleDecelerationStrength ?? 0;
                    const fadeStart = (cfg.overlay as any)?.particleFadeStart ?? 0.7;
                    const maxHeightRatio = (cfg.overlay as any)?.particleMaxHeight ?? 1.0;

                    let yOff: number;
                    if (decStrength <= 0) {
                        yOff = fullTravel * progress;
                    } else {
                        // Spark physics: ease-out — particle decelerates as it rises
                        const power = 1 + decStrength * 6;
                        const eased = 1 - Math.pow(1 - Math.min(progress, 1), power);
                        yOff = fullTravel * eased;
                    }

                    // Time-based opacity: fade out after particleFadeStart
                    const timeOpacity = interpolate(progress, [0, 0.1, fadeStart, 1], [0, 1, 1, 0]);

                    // Position-based opacity: particle fades OUT as it crosses particleMaxHeight threshold.
                    // Particles fly freely — only their transparency changes, no positional capping.
                    const travelRatio = Math.abs(yOff) / Math.abs(fullTravel); // 0=bottom, 1=top
                    const fadeRange = (cfg.overlay as any)?.particleFadeRange ?? 0.15;
                    const heightOpacity = interpolate(travelRatio,
                        [Math.max(0, maxHeightRatio - fadeRange), maxHeightRatio],
                        [1, 0],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );

                    // Final opacity: whichever constraint is more transparent wins
                    const opacity = Math.min(timeOpacity, heightOpacity);
                    // spreadCurve: 0 until particleSpreadStart, then grows 0→1 after it
                    // This gives a clean "straight up → fan out" transition
                    const spreadStart = (cfg.overlay as any)?.particleSpreadStart ?? 0.0;
                    const spreadProgress = Math.max(0, (progress - spreadStart) / (1 - spreadStart));
                    const spreadCurve = Math.pow(spreadProgress, 1.2);

                    // BaseX represents the *final destination* width. Multiply by spread curve.
                    const sprayWideness = h.baseX * spreadCurve;

                    // Sine sway also scales with spread curve so the initial X velocity exists strictly inside the center line
                    const currentAmp = h.amp * spreadCurve;
                    const sineSway = Math.sin(age * h.freq + h.phase) * currentAmp;

                    const xOff = sprayWideness + sineSway;


                    // Pop scale: start from 0 (tiny hole), explode to peak, slowly shrink
                    const scale = interpolate(progress, [0, 0.05, 1], [0.01, h.scalePeak, h.scalePeak * 0.8], {
                        easing: Easing.out(Easing.back(1.5))
                    });

                    return (
                        <div
                            key={h.id}
                            style={{
                                position: 'absolute',
                                left: vinylX + vinylSize / 2 - 20, // Strict center of vinyl
                                top: vinylY + vinylSize / 2 - 20,
                                width: 40,
                                height: 40,
                                transform: `translate(${xOff}px, ${yOff}px) scale(${scale})`,
                                opacity,
                                zIndex: Math.floor(1000 - age) // Newest on top
                            }}
                        >
                            {cfg.overlay?.particleSrc ? (
                                <div style={{
                                    width: '100%', height: '100%',
                                    backgroundColor: h.color,
                                    WebkitMaskImage: `url('${getAssetUrl(cfg.overlay.particleSrc)}')`,
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskImage: `url('${getAssetUrl(cfg.overlay.particleSrc)}')`,
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    maskPosition: 'center'
                                }} />
                            ) : (
                                <CrosshairGraphic color={h.color} />
                            )}
                        </div>
                    );
                })}

            {/* ── Equalizer Strip ── Positioned right of vinyl circle, responsive width */}
            {eqEnabled && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: eqBottom,
                        left: eqLeft,
                        right: 20,
                        height: eqHeight,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        zIndex: 1500,
                        WebkitBoxReflect: (eqCfg?.reflex ?? true)
                            ? `below 0px linear-gradient(transparent 30%, rgba(0,0,0,${eqCfg?.reflexAlpha ?? 0.3}))`
                            : undefined,
                    }}
                >
                    {Array.from({ length: eqBands }, (_, b) => {
                        const val = engine.eqData![frame * eqBands + b] ?? 0;
                        const curve = eqCfg?.heightCurve ?? 1.4;
                        const barH = Math.max(1, Math.pow(val, curve) * (eqHeight - 6));
                        const gap = b < eqBands - 1 ? eqComputedGap : 0;
                        return (
                            <div key={b} style={{
                                position: 'relative',
                                width: eqBarWidth,
                                flexShrink: 0,
                                height: eqHeight,
                                marginRight: gap,
                                alignSelf: 'flex-end',
                            }}>
                                {/* Main bar */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0, right: 0,
                                    height: barH,
                                    background: `linear-gradient(to top, ${eqColor}, ${eqColor2})`,
                                    borderRadius: (eqCfg?.roundBars ?? true) ? `${eqBarWidth / 2}px ${eqBarWidth / 2}px 0 0` : `${eqRadius}px ${eqRadius}px 0 0`,
                                }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Render Graphic Origin Setup for specific positioning with Inner rotation wrapper */}
            <div
                style={{
                    position: 'absolute',
                    left: vinylX,
                    top: vinylY,
                    width: vinylSize,
                    height: vinylSize,
                    backgroundColor: originBgColor,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    zIndex: 2000 // Always above bottom hearts
                }}
            >
                {/* Rotator */}
                <div style={{ width: '100%', height: '100%', transform: `rotate(${vinylRotation}deg) scale(${originScale})` }}>
                    {(!cfg.overlay?.vinylSrc || cfg.overlay.vinylSrc === 'default') ? (
                        <VinylSVG />
                    ) : cfg.overlay.vinylSrc === 'skull' ? (
                        <SkullGraphic />
                    ) : (
                        <Img src={getAssetUrl(cfg.overlay.vinylSrc)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                </div>
                {/* Highlight/Reflection Layer (Static over rotating body) */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* Promo Popup (Always rendered, manages its own internal timing based on config) */}
            {(cfg as any).promo?.enabled && (
                <PromoPopup
                    text={(cfg as any).promo.text || 'Listen on Spotify'}
                    iconSrc={(cfg as any).promo.icon || 'spotify.svg'}
                    cycleSeconds={(cfg as any).promo.cycleSeconds || 40}
                    offsetSeconds={(cfg as any).promo.offsetSeconds || 0}
                    holdSeconds={(cfg as any).promo.holdSeconds || 4}
                />
            )}

            {/* VCR Prompt (Terminal style text popup) */}
            {(cfg as any).vcrPrompt?.enabled && (
                <VCRPrompt
                    text={(cfg as any).vcrPrompt.text || '> FOLLOW US ON SPOTIFY_'}
                    cycleSeconds={(cfg as any).vcrPrompt.cycleSeconds || 40}
                    offsetSeconds={(cfg as any).vcrPrompt.offsetSeconds || 20}
                    holdSeconds={(cfg as any).vcrPrompt.holdSeconds || 5}
                />
            )}

            {/* Global CRT Vignette and Scanlines (over top of background, but BELOW ui/vinyl) */}
            {(cfg as any).glitch?.enableCRTVignette !== false && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    zIndex: 15, // Above glitch and backgrounds (0-11), but below particles (1000) and UI (1500)
                    // Soft vignette at the edges, bright in the center
                    background: `
                        radial-gradient(circle at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%),
                        linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.18) 50%)
                    `,
                    backgroundSize: '100% 100%, 100% 4px', // Vignette stretches, scanlines repeat
                    // Slowly drift the scanlines vertically to make it feel "alive"
                    backgroundPosition: `center, 0 ${(frame * 0.4) % 4}px`,
                }} />
            )}
        </AbsoluteFill>
    );
};

export default VinylStreamOverlay;
