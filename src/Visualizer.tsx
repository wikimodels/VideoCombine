import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, Img, random } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

// Выносим константы наружу, чтобы не грузить рендер
const FPS = 30;
const SLICES_COUNT = 12; // Больше полосок = больше хаоса

export const Visualizer: React.FC = () => {
  const frame = useCurrentFrame();
  const audioUrl = staticFile('track.mp3');
  const imgUrl = staticFile('forged.jpg');
  
  // 1. Сначала получаем данные (Хуки ВСЕГДА должны быть в самом верху)
  const audioData = useAudioData(audioUrl);

  // 2. Если данных нет — просто черный экран (защита от ошибки)
  if (!audioData) {
    return <AbsoluteFill style={{ backgroundColor: 'black' }} />;
  }

  // 3. Расчеты
  const visualization = visualizeAudio({
    fps: FPS,
    frame,
    audioData,
    numberOfSamples: 16,
  });

  const bass = visualization[0]; 
  const volume = bass * 2.2; // Ещё агрессивнее

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Audio src={audioUrl} />
      
      {/* Маппинг полосок */}
      {Array.from({ length: SLICES_COUNT }).map((_, i) => {
        const height = 100 / SLICES_COUNT;
        const top = i * height;
        
        // Рандомный глитч-сдвиг: каждая полоска прыгает по-своему
        const drift = (random(`drift-${i}-${frame}`) - 0.5) * 120 * volume;
        
        // Зум всей сцены, но с искажением для каждой полоски
        const individualScale = 1.1 + (volume * 0.15) + (random(i) * 0.05);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${top}%`,
              left: 0,
              width: '100%',
              height: `${height}%`,
              overflow: 'hidden',
              // Сдвигаем полоски влево-вправо на басах
              transform: `translateX(${drift}px) scale(${individualScale})`,
            }}
          >
            <Img
              src={imgUrl}
              style={{
                width: '100vw',
                height: '100vh',
                position: 'absolute',
                top: `-${top}vh`, 
                objectFit: 'cover',
                // Жесткий цветовой глитч: инверсия и смещение фазы
                filter: `
                  hue-rotate(${volume * 120}deg) 
                  contrast(${120 + volume * 100}%)
                  ${volume > 0.4 ? 'invert(10%)' : ''}
                `,
              }}
            />
          </div>
        );
      })}

      {/* Шум и Scanlines поверх всего */}
      <AbsoluteFill
        style={{
          opacity: 0.2 + volume * 0.3,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 1px, #000 2px)`,
          pointerEvents: 'none',
        }}
      />

      {/* Хроматическая аберрация (красно-синий контур на пиках) */}
      {volume > 0.5 && (
        <AbsoluteFill style={{
          border: `${volume * 20}px solid rgba(255, 0, 80, 0.3)`,
          filter: 'blur(10px)',
          mixBlendMode: 'screen'
        }} />
      )}
    </AbsoluteFill>
  );
};