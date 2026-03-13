// shared/index.ts — barrel export всех shared модулей
// Компоненты физически находятся в compositions/shared/
// Типы и утилиты — в shared/

// Utils
export { asset } from './utils/assets';

// Types
export type {
  RenderJob,
  ParticleConfig,
  EQConfig,
  PromoConfig,
  VCRConfig,
  GlitchConfig,
} from './types/pipeline';
