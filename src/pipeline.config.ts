import type { RenderJob } from './shared/types/pipeline';

/**
 * PIPELINE CONFIG — добавляй сюда новые ролики.
 *
 * Каждый объект = одна Composition в Remotion Studio + один выходной файл.
 * Все пути к файлам — относительно public/
 *
 * Preview: npm run dev  → открыть http://localhost:3000
 * Рендер одного: npx remotion render <id> build/<id>.mp4
 * Рендер всех:   npm run render:all
 */
export const renders: RenderJob[] = [
  // ─── Phonk / Forged By Phonk ────────────────────────────────────────────
  {
    id: 'phonk-grisha',
    composition: 'VinylStreamOverlay',
    audio: 'audio/grisha.mp3',
    image: 'images/boy_1.jpg',
    originGraphic: 'icons/soldier_4.svg',
    originScale: 1.5,
    originBgColor: 'red',
    vinylSizePercent: 50,
    particleGraphic: 'icons/skull.svg',
    particles: {
      colors: ['#4caf50', '#ff9800', '#e91e63', '#f44336', '#2196f3'],
      speed: 0.2,
      maxHeight: 0.95,
      fadeStart: 0.65,
      fadeRange: 0.4,
      spreadStart: 0.02,
      spreadAmplitude: 4,
      decelerationStrength: 0.5,
      rotationSpeed: 2,
    },
    eq: {
      enabled: true,
      bands: 120,
      freqMin: 60,
      freqMax: 16000,
      color: '#e91e63',
      secondaryColor: '#ff9800',
      barWidth: 8,
      // height и bottom авто-вычисляются из размера и позиции vinyl диска
    },
    promo: {
      enabled: true,
      text: 'LISTEN US ON SPOTIFY',
      icon: 'icons/spotify.svg',
      cycleSeconds: 120,
      offsetSeconds: 0,
      holdSeconds: 4,
    },
    vcr: {
      enabled: true,
      text: '> FORGED_BY_PHONK ',
      cycleSeconds: 120,
      offsetSeconds: 60,
      holdSeconds: 5,
    },
    glitch: {
      enabled: true,
      image: 'images/boy_1.jpg',
      intensity: 1.0,
      tearProbability: 0.005,
      enableDigitalTear: true,
      gridProbability: 0.005,
      enableStaticGrid: true,
      enableTrackingRoll: true,
      enableRGBBreathing: true,
      enableCRTVignette: true,
      scanlines: true,
    },
  },

  // ─── Medieval ──────────────────────────────────────────────────────────
  {
    id: 'medieval-ep1',
    composition: 'VinylStreamOverlay',
    audio: 'audio/medieval.mp3',
    image: 'images/boy_3.jpeg',
    originGraphic: 'icons/soldier_4.svg',
    originScale: 1.5,
    originBgColor: '#d3092bff',
    vinylSizePercent: 50,
    particleGraphic: 'icons/crosshair.svg',
    particles: {
      colors: ['#ffd700', '#ff6600', '#cc4400'],
      speed: 0.3,
      maxHeight: 0.9,
      fadeStart: 0.6,
      spreadStart: 0.05,
      spreadAmplitude: 3,
      decelerationStrength: 0.4,
      rotationSpeed: 1.5,
    },
    eq: {
      enabled: true,
      bands: 100,
      color: '#ffd700',
      secondaryColor: '#ff6600',
      barWidth: 8,
      // height и bottom авто-вычисляются из размера и позиции vinyl диска
    },
    promo: {
      enabled: true,
      text: 'LISTEN ON SPOTIFY',
      icon: 'icons/spotify.svg',
      cycleSeconds: 120,
      offsetSeconds: 0,
      holdSeconds: 4,
    },
    vcr: {
      enabled: true,
      text: '> MEDIEVAL_VIBES ',
      cycleSeconds: 120,
      offsetSeconds: 60,
      holdSeconds: 5,
    },
    glitch: {
      enabled: true,
      image: 'images/earth.jpg',
      intensity: 0.7,
      tearProbability: 0.003,
      enableDigitalTear: true,
      gridProbability: 0.003,
      enableStaticGrid: true,
      enableTrackingRoll: true,
      enableRGBBreathing: true,
      enableCRTVignette: true,
    },
  },

  // ─── Afrobeat ──────────────────────────────────────────────────────────
  {
    id: 'afrobeat-ep1',
    composition: 'VinylStreamOverlay',
    audio: 'audio/afrobeat.mp3',
    image: 'images/boy_2.jpeg',
    originGraphic: 'icons/soldier_4.svg',
    originScale: 1.5,
    originBgColor: '#c9520dff',
    vinylSizePercent: 50,
    particleGraphic: 'icons/crosshair.svg',
    particles: {
      colors: ['#00e676', '#69f0ae', '#ffeb3b', '#ff5722'],
      speed: 0.25,
      maxHeight: 0.92,
      fadeStart: 0.65,
      spreadStart: 0.03,
      spreadAmplitude: 5,
      decelerationStrength: 0.35,
      rotationSpeed: 3,
    },
    eq: {
      enabled: true,
      bands: 120,
      color: '#00e676',
      secondaryColor: '#ffeb3b',
      barWidth: 7,
      // height и bottom авто-вычисляются из размера и позиции vinyl диска
    },
    promo: {
      enabled: true,
      text: 'LISTEN ON SPOTIFY',
      icon: 'icons/spotify.svg',
      cycleSeconds: 120,
      offsetSeconds: 0,
      holdSeconds: 4,
    },
    vcr: {
      enabled: true,
      text: '> AFROBEAT_SESSION ',
      cycleSeconds: 120,
      offsetSeconds: 60,
      holdSeconds: 5,
    },
    glitch: {
      enabled: true,
      image: 'images/forged.jpg',
      intensity: 0.8,
      tearProbability: 0.004,
      enableDigitalTear: true,
      enableStaticGrid: true,
      enableTrackingRoll: true,
      enableRGBBreathing: true,
      enableCRTVignette: true,
    },
  },
];
