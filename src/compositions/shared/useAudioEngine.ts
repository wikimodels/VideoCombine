import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import { useAudioData } from '@remotion/media-utils';

export type HeartParams = {
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

export const useAudioEngine = (audioUrl: string, cfg: any) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const audioData = useAudioData(audioUrl);

    const engine = useMemo(() => {
        if (!audioData) return { hearts: [], eqData: null, eqBands: 0 };

        const hearts: HeartParams[] = [];
        let hId = 0;

        const frameSamples = Math.floor(audioData.sampleRate / fps);
        const totalFrames = durationInFrames;

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

        for (let f = 0; f < totalFrames; f += 3) {
            let sumHist = 0;
            let countHist = 0;
            for (let h = Math.max(0, f - HISTORY_FRAMES); h < f; h++) {
                sumHist += rawEnergy[h];
                countHist++;
            }
            const localAvg = countHist > 0 ? sumHist / countHist : 0;
            const currentEnergy = rawEnergy[f];
            const delta = Math.max(0, currentEnergy - localAvg);
            const normalizedDelta = delta / maxEnergy;

            let shouldSpawn = false;
            let spawnCount = 1;
            let scaleMultiplier = 1.0;
            let isMachineGun = false;
            let isPeak = false;

            if (normalizedDelta > 0.45) { // Absolute Peak
                shouldSpawn = true;
                spawnCount = 3;
                scaleMultiplier = 1.4;
                isPeak = true;
            } else if (normalizedDelta > 0.22) { // Solid Kick
                shouldSpawn = true;
                spawnCount = 2;
                scaleMultiplier = 1.1;
            } else if (normalizedDelta > 0.08) { // Regular Pulse
                shouldSpawn = true;
                spawnCount = 1;
                isMachineGun = true;
            }

            if (shouldSpawn) {
                for (let i = 0; i < spawnCount; i++) {
                    const staggerOffset = i * -1;
                    const flyDuration = isPeak ? 130 : 90;

                    hearts.push({
                        id: hId++,
                        startF: f + staggerOffset,
                        duration: (flyDuration + random(`df-${f}-${i}`) * 20) / ((cfg.overlay as any)?.particleSpeed ?? 1.0),
                        baseX: isMachineGun ? 0 : (random(`boff-${f}-${i}`) - 0.5) * (isPeak ? 15 : 5),
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

        // Equalizer Engine
        const eqCfg = cfg.equalizer;
        if (!eqCfg?.enabled) return { hearts, eqData: null, eqBands: 0 };

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
                for (let f = 0; f < totalFrames; f++) {
                    rawEq[f * eqBands + b] *= gain;
                }
            }
        }

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

        return { hearts, eqData: normEq, eqBands };
    }, [audioData, fps, durationInFrames, cfg]);

    return { engine, frame, audioData };
};
