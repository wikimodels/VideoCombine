import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

import { GlitchArt } from "./compositions/GlitchArt";
import { SynthwaveRacer } from "./compositions/SynthwaveRacer";
import { WarpTunnel } from "./compositions/WarpTunnel";
import { NeonGeometric } from "./compositions/NeonGeometric";
import { BeatBulletHell } from "./compositions/BeatBulletHell";
import { LissajousScope } from "./compositions/LissajousScope";
import { DNAHelix } from "./compositions/DNAHelix";
import { RetroGameScene } from "./compositions/RetroGameScene";
import { ProceduralSnake } from "./compositions/ProceduralSnake";
import { AlienParty } from "./compositions/AlienParty";
import { KineticText } from "./compositions/KineticText";
import { DevilDancer } from "./compositions/DevilDancer";
import { AlienDJ } from './compositions/AlienDJ';
import { CyberDrummer } from './compositions/CyberDrummer';
import { VoodooShaman } from './compositions/VoodooShaman';
import { PepeStormFlyer } from './compositions/PepeStormFlyer';
import { CybercoreBreach } from './compositions/CybercoreBreach';
import { UfoAttacksScene } from './components/3D/UfoAttacksScene';
import { UfoCityAttack } from './compositions/UfoCityAttack';
import { RobotApocalypse } from './compositions/RobotApocalypse';
import { NinjaFighting } from './compositions/NinjaFighting';
import { RobotBoxing } from './compositions/RobotBoxing';
import VinylStreamOverlay from './compositions/VinylStreamOverlay';
import { EtherAmbient } from './compositions/EtherAmbient';
import LucidDriftOS from './compositions/LucidDriftOS';
import LucidConfig from './compositions/LucidDriftOS/config.json';
import LiquidCrystalScene from './compositions/LiquidCrystalScene';
import NeonAuraScene from './compositions/NeonAuraScene';
import HolographicParallaxScene from './compositions/HolographicParallaxScene';
import { ObjectParallaxScene } from './compositions/ObjectParallaxScene';

// ── Pipeline ─────────────────────────────────────────────────────────────────
import { renders } from './pipeline.config';
import type { RenderJob } from './shared/types/pipeline';

const FPS = 30;

const calculateLucidDuration = async () => {
  try {
    // Attempting to resolve via staticFile to avoid Webpack module resolution crash on missing ./assets directory
    const url = staticFile(`audio/${LucidConfig.audioTrack.src}`);
    const durationSec = await getAudioDurationInSeconds(url);
    return { durationInFrames: Math.ceil(durationSec * FPS) };
  } catch (err) {
    return { durationInFrames: 300 };
  }
};

/** Auto-detect duration from audio track in public/ */
const makeCalculateMetadata = (job: RenderJob) => async () => {
  const isPortrait = job.format === 'portrait';
  const width = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;

  if (job.durationSec) return { durationInFrames: Math.ceil(job.durationSec * FPS), width, height };
  
  try {
    const url = staticFile(job.audio);
    const durationSec = await getAudioDurationInSeconds(url);
    return { durationInFrames: Math.ceil(durationSec * FPS), width, height };
  } catch (err) {
    // fallback
    return { durationInFrames: 300, width, height };
  }
};

/** Calculate duration for legacy scenes using audio/track.mp3 */
const calculateLegacyDuration = async () => {
  const url = staticFile('audio/track.mp3');
  try {
    const durationSec = await getAudioDurationInSeconds(url);
    return { durationInFrames: Math.ceil(durationSec * FPS) };
  } catch (e) {
    return { durationInFrames: 300 }; // fallback if track is missing
  }
};

// All TikTok/Shorts scenes: 1080×1920 (9:16), 30fps
const S = {
  durationInFrames: 1, // overridden by calculateMetadata
  fps: FPS,
  width: 1080,
  height: 1920,
} as const;

// 16:9 Landscape scenes: 1920x1080, 30fps
const S_LANDSCAPE = {
  ...S,
  width: 1920,
  height: 1080,
} as const;

export const RemotionRoot: React.FC = () => (
  <>

    {/* ── 9:16 TikTok / Shorts scenes ── */}
    <Composition id="GlitchArt" component={GlitchArt} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="SynthwaveRacer" component={SynthwaveRacer} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="WarpTunnel" component={WarpTunnel} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="NeonGeometric" component={NeonGeometric} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="BeatBulletHell" component={BeatBulletHell} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="LissajousScope" component={LissajousScope} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="DNAHelix" component={DNAHelix} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="RetroGameScene" component={RetroGameScene} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="ProceduralSnake" component={ProceduralSnake} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="AlienParty" component={AlienParty} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="KineticText" component={KineticText} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="DevilDancer" component={DevilDancer} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="AlienDJ" component={AlienDJ} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="CyberDrummer" component={CyberDrummer} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="VoodooShaman" component={VoodooShaman} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="PepeStormFlyer" component={PepeStormFlyer} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="CybercoreBreach" component={CybercoreBreach} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="UfoAttacks" component={UfoAttacksScene} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="UfoCityAttack" component={UfoCityAttack} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="RobotApocalypse" component={RobotApocalypse} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="NinjaFighting" component={NinjaFighting} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition id="RobotBoxing" component={RobotBoxing} {...S} calculateMetadata={calculateLegacyDuration} />
    <Composition
      id="LucidDriftOS"
      component={LucidDriftOS}
      {...S_LANDSCAPE}
      calculateMetadata={calculateLucidDuration}
    />

    {/* ── Pipeline Dynmaic Renders ──────────────────────────────────────── */}
    {renders.map(job => {
      const isPortrait = job.format === 'portrait';
      return (
        <Composition
          key={job.id}
          id={job.id}
          component={
            job.composition === 'VinylStreamOverlay' ? VinylStreamOverlay :
            job.composition === 'LiquidCrystalScene' ? LiquidCrystalScene :
            job.composition === 'NeonAuraScene' ? NeonAuraScene :
            job.composition === 'HolographicParallaxScene' ? HolographicParallaxScene :
            job.composition === 'ObjectParallaxScene' ? ObjectParallaxScene :
            EtherAmbient
          }
          defaultProps={{ job }}
          calculateMetadata={makeCalculateMetadata(job)}
          width={isPortrait ? S.width : S_LANDSCAPE.width}
          height={isPortrait ? S.height : S_LANDSCAPE.height}
          fps={FPS}
          durationInFrames={1}
        />
      );
    })}
  </>
);
