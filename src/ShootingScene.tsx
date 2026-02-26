import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, staticFile, Series } from 'remotion';
import { spring, useVideoConfig } from 'remotion';

export const ShootingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- АНИМАЦИЯ ПЕРСОНАЖА (квадратика) ---
  const characterX = interpolate(frame, [0, fps * 5], [-200, 1920 + 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }); // Движется слева направо 5 секунд

  // --- ВЫСТРЕЛЫ ---
  // Определяем кадры, на которых происходят выстрелы
  const shootFrames = [fps * 1, fps * 2, fps * 3, fps * 4]; // 4 выстрела
  
  // Анимация тряски камеры при выстреле
  const cameraShake = shootFrames.reduce((acc, shootFrame) => {
    const startShake = shootFrame;
    const endShake = shootFrame + fps * 0.1; // Трясемся 0.1 секунды
    
    // Спринг для плавного входа/выхода из тряски
    const shakeProgress = spring({
      frame: frame - startShake,
      fps,
      config: {
        stiffness: 150,
        damping: 15,
      },
    });

    // Смещаем камеру
    const translateX = interpolate(shakeProgress, [0, 1], [0, (Math.random() - 0.5) * 50]);
    const translateY = interpolate(shakeProgress, [0, 1], [0, (Math.random() - 0.5) * 50]);

    return {
      translateX: acc.translateX + (frame >= startShake && frame < endShake ? translateX : 0),
      translateY: acc.translateY + (frame >= startShake && frame < endShake ? translateY : 0),
    };
  }, { translateX: 0, translateY: 0 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#222', transform: `translate(${cameraShake.translateX}px, ${cameraShake.translateY}px)` }}>
      {/* ФОН (для контраста) */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundImage: 'linear-gradient(to bottom right, #333, #000)',
      }} />

      {/* ПЕРСОНАЖ */}
      <div style={{
        position: 'absolute',
        bottom: 100, // Высота над полом
        left: characterX,
        width: 100,
        height: 150,
        backgroundColor: 'blue',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'skewY(-5deg)', // Небольшой наклон
      }}>
        <div style={{ color: 'white', fontWeight: 'bold' }}>🏃</div>
      </div>

      {/* СТВОЛ */}
      <div style={{
        position: 'absolute',
        bottom: 150,
        left: characterX + 80, // Относительно персонажа
        width: 40,
        height: 10,
        backgroundColor: 'gray',
        transform: 'rotate(5deg)',
      }} />

      {/* ЭФФЕКТ ВЫСТРЕЛА */}
      <Series>
        {shootFrames.map((shootFrame, index) => (
          <Series.Sequence durationInFrames={fps * 0.2} name={`shot-${index}`} key={index} from={shootFrame}>
            <div style={{
              position: 'absolute',
              bottom: 150,
              left: characterX + 120, // Относительно ствола
              width: 30,
              height: 15,
              backgroundColor: 'orange',
              borderRadius: '50%',
              opacity: interpolate(frame - shootFrame, [0, fps * 0.2], [1, 0], { extrapolateLeft: 'clamp' }),
              transform: 'scale(1.2)',
              boxShadow: '0 0 15px orange',
            }} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};