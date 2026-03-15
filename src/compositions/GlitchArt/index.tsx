import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  Audio,
  staticFile,
  Img,
  useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const SLICES = 20;
const NUM_BARS = 32;

export const GlitchArt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const audioUrl = staticFile('audio/track.mp3');
  const imgUrl = staticFile('images/forged.jpg');

  const audioData = useAudioData(audioUrl);

  if (!audioData) {
    return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  }

  const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });

  // Frequency bands
  const bass = (viz[0] + viz[1] + viz[2]) / 3;
  const volume = Math.min(bass * 2.5, 1);
  const isBeat = bass > 0.45;

  // Bars = first NUM_BARS samples (log-mapped would be ideal but linear is fine)
  const bars = Array.from({ length: NUM_BARS }, (_, i) => viz[i] ?? 0);

  const sliceHeightPx = height / SLICES;
  const maxBarHeight = Math.round(height * 0.18); // 18% of frame height

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Audio src={audioUrl} />

      {/* ── IMAGE GLITCH SLICES ── */}
      {Array.from({ length: SLICES }).map((_, i) => {
        // Each slice drifts independently on beats
        const sign = i % 2 === 0 ? 1 : -1;
        const drift = isBeat
          ? Math.sin(i * 2.3 + frame * 0.05) * bass * 140 * sign
          : Math.sin(i * 1.7 + frame * 0.02) * 5;

        const scaleX = 1 + volume * 0.06;

        // Color shift per slice
        const hue = (frame * 0.6 + i * 18 + volume * 180) % 360;
        const saturation = 130 + volume * 130;
        const contrast = 110 + volume * 70;
        const invertFilter = isBeat && i % 5 === 0 ? 'invert(25%)' : '';

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * sliceHeightPx,
              left: 0,
              width: '100%',
              height: sliceHeightPx + 1, // +1 to avoid hairline gaps
              overflow: 'hidden',
              transform: `translateX(${drift}px) scaleX(${scaleX})`,
            }}
          >
            {/* Full image offset so each slice reveals its correct portion */}
            <Img
              src={imgUrl}
              style={{
                width: '100%',
                height: height,
                position: 'absolute',
                top: -(i * sliceHeightPx),
                objectFit: 'cover',
                filter: `
                  hue-rotate(${hue}deg)
                  saturate(${saturation}%)
                  contrast(${contrast}%)
                  ${invertFilter}
                `,
              }}
            />
          </div>
        );
      })}

      {/* ── RGB CHROMATIC ABERRATION on beats ── */}
      {isBeat && (
        <>
          {/* Red channel shifted right */}
          <AbsoluteFill
            style={{
              mixBlendMode: 'screen',
              transform: `translateX(${bass * 25}px)`,
              opacity: Math.min(bass * 0.8, 0.5),
              background:
                'linear-gradient(135deg, rgba(255,0,80,0.6) 0%, transparent 60%)',
              filter: 'blur(2px)',
            }}
          />
          {/* Cyan channel shifted left */}
          <AbsoluteFill
            style={{
              mixBlendMode: 'screen',
              transform: `translateX(${-bass * 25}px)`,
              opacity: Math.min(bass * 0.6, 0.4),
              background:
                'linear-gradient(315deg, rgba(0,255,220,0.5) 0%, transparent 60%)',
              filter: 'blur(2px)',
            }}
          />
        </>
      )}

      {/* ── SCANLINES ── */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 3px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── WAVEFORM BARS at bottom ── */}
      <div
        style={{
          position: 'absolute',
          bottom: Math.round(height * 0.04),
          left: 30,
          right: 30,
          height: maxBarHeight,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 5,
        }}
      >
        {bars.map((amp, i) => {
          const barH = Math.max(4, amp * maxBarHeight);
          const hue = (i / NUM_BARS) * 140 + volume * 80; // green→yellow→red
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: barH,
                borderRadius: '4px 4px 0 0',
                background: `hsl(${hue}deg, 100%, 58%)`,
                boxShadow: `0 0 ${amp * 30}px hsl(${hue}deg, 100%, 58%), 0 0 ${amp * 10}px #fff`,
              }}
            />
          );
        })}
      </div>

      {/* ── BEAT FLASH BORDER ── */}
      {isBeat && (
        <AbsoluteFill
          style={{
            border: `${Math.min(bass * 70, 50)}px solid rgba(255, 30, 130, ${Math.min(bass * 0.9, 0.75)})`,
            boxSizing: 'border-box',
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── DARK VIGNETTE ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${0.45 + volume * 0.3}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
