import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  interpolate,
  spring,
  Img,
  staticFile,
  random,
  Easing,
} from 'remotion';
import { useAudioData } from '@remotion/media-utils';
import type { RenderJob } from '../../shared/types/pipeline';
import { PromoPopup } from '../VinylStreamOverlay/PromoPopup';
import { VCRPrompt } from '../shared/VCRPrompt';
import { DefaultVinyl as VinylSVG } from '../VinylStreamOverlay/assets/VinylGraphic';
import { CrosshairGraphic } from '../VinylStreamOverlay/assets/CrosshairGraphic';

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

const PlasmaWaves: React.FC<{
    frame: number;
    bassE: number;
    highsE: number;
    maskUrl: string;
}> = ({ frame, bassE, highsE, maskUrl }) => {
    // Wave positions
    const x1 = 50 + Math.sin(frame * 0.031) * 25;
    const y1 = 50 + Math.cos(frame * 0.027) * 20;
    const x2 = 50 + Math.cos(frame * 0.021) * 35;
    const y2 = 50 + Math.sin(frame * 0.033) * 25;
    const x3 = 50 + Math.sin(frame * 0.045) * (15 + highsE * 30);
    const y3 = 50 + Math.cos(frame * 0.051) * (15 + highsE * 30);

    // Faster Spectrum Hues (cycled by frame)
    const baseHue = (frame * 5) % 360; // 5x faster speed
    const hue1 = baseHue;
    const hue2 = (baseHue + 120) % 360; // Wide 120 offset
    const hue3 = (baseHue + 240) % 360; // Wide 240 offset

     return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
        }}>
            {/* 
                We remove the internal mask from PlasmaWaves. 
                The masking will be handled by the parent container 
                to ensure we can control the body vs lines colors.
            */}
            {/* Wave Layer 1 (Brighter) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at ${x1}% ${y1}%, hsl(${hue1}, 100%, 50%), transparent 70%)`,
                opacity: 0.9 + bassE * 0.1,
                mixBlendMode: 'screen',
            }} />

            {/* Wave Layer 2 (Brighter) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at ${x2}% ${y2}%, hsl(${hue2}, 100%, 50%), transparent 70%)`,
                opacity: 0.8 + highsE * 0.2,
                mixBlendMode: 'screen',
            }} />

            {/* Wave Layer 3 (High Contrast Overlay) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at ${x3}% ${y3}%, hsl(${hue3}, 100%, 60%), transparent 40%)`,
                opacity: 0.6 + highsE * 0.4,
                mixBlendMode: 'overlay',
            }} />
        </div>
    );
};

export const ObjectParallaxScene: React.FC<{ job: RenderJob }> = ({ job }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  
  // Destructure config
  const promoCfg = job.promo;
  const vcrCfg = job.vcr;
  const eqCfg = job.eq;
  const particlesCfg = job.particles;
  const parallaxCfg = job.parallax || {};
  const particleGraphic = job.particleGraphic;

  const audioUrl = job.audio ? getAssetUrl(job.audio) : null;
  const audioData = useAudioData(audioUrl || '');
  
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
  } = particlesCfg || {};

  const vinylRotation = (frame * rotationSpeed) % 360;

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
      // Fallback duration
      const totalFrames = 3000;

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
  }, [audioData, fps, particleSpeed, particleSpreadAmplitude, particleColors, eqCfg]);

  const rawBassE = engine.bassEnergyArray[Math.min(frame, Math.max(0, engine.bassEnergyArray.length - 1))] || 0;
  const rawHighsE = engine.highsEnergyArray[Math.min(frame, Math.max(0, engine.highsEnergyArray.length - 1))] || 0;

  // 1. Calculate Bass Energy (Smoothed)
  const driftE = spring({
      frame, fps,
      config: { damping: 25, stiffness: 35, mass: 2.5 },
      durationInFrames: 25,
      from: 0, to: rawBassE,
  });

  const bassE = driftE;

  // Highs spring — fast, snappy
  const highsE = spring({
      frame, fps,
      config: { damping: 12, stiffness: 300, mass: 0.3 },
      durationInFrames: 4,
      from: 0, to: rawHighsE,
  });

  // 4. Parallax Parameters (LOCKED - ABSOLUTE STILLNESS)
  const scalePulse = 1.0; 
  const rotX = 0; 
  const driftY = 0;
  const transZ = 0;
  const aberrAmt = 0; 

  // 5. Colors & Ambient Background
  const baseColor = parallaxCfg.baseColor || '#ff00ff';
  const accentColor = parallaxCfg.accentColor || '#00ffff';
  
  // SVG Source (Defaults to main subject, falls back to originGraphic)
  const sourceGraphic = parallaxCfg.graphic || job.originGraphic;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* ── 0. FOUNDATION (Kills checkerboard/transparency) ── */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'black', zIndex: 0 }} />

      {/* ── Audio Layer ── */}
      {job.audio && <Audio src={staticFile(job.audio)} />}

      {/* ── 1. BACKGROUND ENVIRONMENT ── */}
      <AbsoluteFill className="pointer-events-none">
        {/* Atmospheric Glow */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 60% 40% at 50% 45%, ${baseColor}33 0%, transparent 70%)`,
            opacity: 0.4 + bassE * 0.4,
          }}
        />

        {/* Perspective Grid Floor */}
        <div style={{
          position: 'absolute',
          bottom: '0%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '50%',
          perspective: '1000px',
          overflow: 'hidden',
          zIndex: 1,
        }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '200%',
            top: 0,
            backgroundImage: `
              linear-gradient(to right, ${baseColor}22 1px, transparent 1px),
              linear-gradient(to bottom, ${baseColor}22 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: 'perspective(600px) rotateX(65deg) translateY(-100px) scale(3)',
            opacity: 0.1, // Much darker to avoid "checkerboard" look
          }} />
        </div>

        {/* Volumetric "Light Beam" behind subject */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40%',
          height: '80%',
          background: `linear-gradient(to top, ${baseColor}66, transparent)`,
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          filter: 'blur(60px)',
          opacity: 0.1 + highsE * 0.4,
          zIndex: 2,
        }} />
      </AbsoluteFill>

      {/* ── 2. FLOOR REFLECTION (Subject) ── */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        width: '100%',
        height: '40%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        opacity: 0.25,
        zIndex: 5,
        filter: 'blur(12px) brightness(0.5)',
        transform: `rotateX(180deg) scaleY(0.8) translateY(-50px)`,
        pointerEvents: 'none',
        maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
      }}>
        <Img 
          src={staticFile(sourceGraphic || '')} 
          style={{ width: '65%', height: '100%', objectFit: 'contain' }} 
        />
      </div>

      {/* ── 3. MAIN SUBJECT WITH PARALLAX ── */}
      <AbsoluteFill 
        className="z-20 flex items-center justify-center pointer-events-none"
        style={{ perspective: '1200px' }}
      >
         <div
            style={{
               position: 'relative',
               width: '85%',
               height: '85%',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               transformStyle: 'preserve-3d',
               transform: `
                  scale(${scalePulse})
                  rotateX(${rotX.toFixed(2)}deg)
                  rotateY(${driftY.toFixed(2)}deg)
                  translateZ(${transZ.toFixed(1)}px)
               `,
            }}
        >
            {/* Subject Glow (Dynamic) */}
            <div style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              background: `radial-gradient(circle, ${baseColor}aa 0%, transparent 70%)`,
              opacity: 0.1 + bassE * 0.4,
              filter: 'blur(80px)',
              zIndex: 1,
            }} />

            {/* RGB - Red Channel */}
            <Img
              src={staticFile(sourceGraphic || '')}
              style={{ 
                position: 'absolute',
                width: '100%', height: '100%', objectFit: 'contain',
                zIndex: 2, 
                transform: `translateX(${aberrAmt}px)`,
                filter: 'hue-rotate(-45deg) saturate(200%) brightness(0.8)',
                opacity: 0.5,
                mixBlendMode: 'screen',
              }}
            />

            {/* RGB - Blue Channel */}
            <Img
              src={staticFile(sourceGraphic || '')}
              style={{ 
                position: 'absolute',
                width: '100%', height: '100%', objectFit: 'contain',
                zIndex: 4, 
                transform: `translateX(${-aberrAmt}px)`,
                filter: 'hue-rotate(180deg) saturate(200%) brightness(0.8)',
                opacity: 0.5,
                mixBlendMode: 'screen',
              }}
            />

            {/* ─── NEW SUBJECT LAYERING: Rainbow Body, Black Lines ─── */}
            
            {/* LAYER 1: The Rainbow Shape (Body Fill) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              // This mask captures the WHOLE SOLDIER (Fills + Lines)
              maskImage: `url(${staticFile(sourceGraphic || '')})`,
              WebkitMaskImage: `url(${staticFile(sourceGraphic || '')})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              zIndex: 3,
            }}>
               <PlasmaWaves 
                  frame={frame}
                  bassE={bassE}
                  highsE={highsE}
                  maskUrl={staticFile(sourceGraphic || '')} 
               />
            </div>

            {/* LAYER 2: SHARP BLACK LINES (The detail preservation) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              // Must use the same mask to stay aligned
              maskImage: `url(${staticFile(sourceGraphic || '')})`,
              WebkitMaskImage: `url(${staticFile(sourceGraphic || '')})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              zIndex: 4,
              mixBlendMode: 'multiply', // Multiplies 'Black Lines on White' onto results below
            }}>
              {/* White base makes everything outside the black lines invisible during multiply */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Img
                  src={staticFile(sourceGraphic || '')}
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'contain',
                    // Filter: Turns original RED to WHITE, and BLACK lines stay BLACK
                    // grayscale(1) -> red becomes gray. contrast(5000%) -> gray becomes white.
                    filter: 'grayscale(1) contrast(5000%) brightness(1.1)',
                  }}
                />
              </div>
            </div>

            {/* LAYER 3: Subtle Lighting (Top Gleam) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              maskImage: `url(${staticFile(sourceGraphic || '')})`,
              WebkitMaskImage: `url(${staticFile(sourceGraphic || '')})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              zIndex: 5,
              opacity: 0.1 + highsE * 0.4,
              mixBlendMode: 'color-dodge',
            }}>
                <Img
                  src={staticFile(sourceGraphic || '')}
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: 'brightness(2) contrast(1.2)',
                  }}
                />
            </div>
        </div>
      </AbsoluteFill>

      {/* ── 4. FOREGROUND ELEMENTS (Overlay & Particles) ── */}
      <AbsoluteFill className="z-30 pointer-events-none">
        {/* Optimized Particles: Pre-filter by visibility window */}
        {engine.hearts
            .filter((h: HeartParams) => { 
                const age = frame - h.startF; 
                return age >= 0 && age <= h.duration; 
            })
            .slice(0, 40) // Limit active particles to 40 for performance
            .map((h: HeartParams) => {
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
                const scale = interpolate(progress, [0, 0.05, 1], [0.1, h.scalePeak * 2, h.scalePeak * 1.5], {
                    easing: Easing.out(Easing.back(1.5))
                });
                const vinylSize = 250 * (job.vinylSizePercent ? job.vinylSizePercent / 100 : 1);
                const vinylX = 50;
                const vinylY = height - vinylSize - 50;
                const particleGraphicActual = particleGraphic || job.originGraphic;
                return (
                    <div key={h.id} style={{
                        position: 'absolute',
                        left: vinylX + vinylSize / 2 - 20,
                        top: vinylY + vinylSize / 2 - 20,
                        width: 40, height: 40,
                        transform: `translate(${xOff}px, ${yOff}px) scale(${scale})`,
                        opacity, zIndex: Math.floor(1000 - age),
                    }}>
                        {particleGraphicActual ? (
                            <div style={{
                                width: '100%', height: '100%',
                                backgroundColor: h.color,
                                WebkitMaskImage: `url('${getAssetUrl(particleGraphicActual || '')}')`,
                                WebkitMaskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                maskImage: `url('${getAssetUrl(particleGraphicActual || '')}')`,
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

        {/* Scan Line Overlay */}
        {parallaxCfg.scanLine !== false && (
            <div 
              style={{
                position: 'absolute',
                width: '100%',
                height: '3px',
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                top: `${(frame * 2.5) % 110 - 5}%`,
                opacity: 0.3 + bassE * 0.4,
                boxShadow: `0 0 15px ${accentColor}`,
                zIndex: 100,
              }}
            />
        )}

        {/* Vinyl Player */}
        <div style={{ position: 'absolute', bottom: '5%', left: '5%', zIndex: 1000 }}>
           <div style={{
              width: 180 * (job.vinylSizePercent ? job.vinylSizePercent / 100 : 1),
              height: 180 * (job.vinylSizePercent ? job.vinylSizePercent / 100 : 1),
              transform: `rotate(${vinylRotation}deg)`,
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.8))',
           }}>
             <VinylSVG />
           </div>
        </div>

        {/* Equalizer */}
        {eqCfg?.enabled && (
           <div style={{
              position: 'absolute', bottom: '5%', right: '5%',
              display: 'flex', alignItems: 'flex-end', gap: '4px',
              height: '80px', width: '320px', zIndex: 1000
           }}>
             {(engine.eqData ? Array.from({length: eqCfg.bands || 32}, (_, i) => engine.eqData![frame * (eqCfg.bands || 32) + i] || 0) : []).map((v, i) => (
                <div key={i} style={{
                    backgroundColor: baseColor,
                    width: eqCfg.barWidth || 6,
                    height: `${v * 100}%`,
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.6 + v * 0.4,
                    boxShadow: `0 0 10px ${baseColor}66`
                }} />
             ))}
           </div>
        )}

        {/* Popups */}
        {promoCfg?.enabled && (
           <div style={{ position: 'absolute', top: 50, right: 50, zIndex: 9999 }}>
              <PromoPopup 
                text={promoCfg.text ?? 'LISTEN ON SPOTIFY'}
                iconSrc={promoCfg.icon ? (getAssetUrl(promoCfg.icon) ?? undefined) : undefined}
                cycleSeconds={promoCfg.cycleSeconds ?? 45}
                holdSeconds={promoCfg.holdSeconds ?? 4}
              />
           </div>
        )}

        {vcrCfg?.enabled && (
           <div style={{ position: 'absolute', bottom: 50, right: 50, zIndex: 9999 }}>
              <VCRPrompt 
                 text={vcrCfg.text ?? '> NEON_PARALLAX_v1'}
                 cycleSeconds={vcrCfg.cycleSeconds ?? 45}
                 holdSeconds={vcrCfg.holdSeconds ?? 5}
                 background={vcrCfg.background}
              />
           </div>
        )}
      </AbsoluteFill>
      
      {/* ── CRT Vignette & Grain ── */}
      <div 
        className="absolute inset-0 pointer-events-none z-[5000]"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
        }}
      />
    </AbsoluteFill>
  );
};
