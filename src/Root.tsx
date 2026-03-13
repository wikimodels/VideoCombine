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
import LucidDriftOS from './compositions/LucidDriftOS';
import LucidConfig from './compositions/LucidDriftOS/config.json';

// ── Pipeline ─────────────────────────────────────────────────────────────────
import { renders } from './pipeline.config';
import type { RenderJob } from './shared/types/pipeline';

const FPS = 30;

const calculateLucidDuration = async () => {
  const assetUrl = require(`./assets/${LucidConfig.audioTrack.src}`);
  const durationSec = await getAudioDurationInSeconds(typeof assetUrl === 'string' ? assetUrl : assetUrl.default);
  return { durationInFrames: Math.ceil(durationSec * FPS) };
};

/** Auto-detect duration from audio track in public/ */
const makeCalculateMetadata = (job: RenderJob) => async () => {
  if (job.durationSec) return { durationInFrames: Math.ceil(job.durationSec * FPS) };
  const url = staticFile(job.audio);
  const durationSec = await getAudioDurationInSeconds(url);
  return { durationInFrames: Math.ceil(durationSec * FPS) };
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
    <Composition id="GlitchArt" component={GlitchArt} {...S} />
    <Composition id="SynthwaveRacer" component={SynthwaveRacer} {...S} />
    <Composition id="WarpTunnel" component={WarpTunnel} {...S} />
    <Composition id="NeonGeometric" component={NeonGeometric} {...S} />
    <Composition id="BeatBulletHell" component={BeatBulletHell} {...S} />
    <Composition id="LissajousScope" component={LissajousScope} {...S} />
    <Composition id="DNAHelix" component={DNAHelix} {...S} />
    <Composition id="RetroGameScene" component={RetroGameScene} {...S} />
    <Composition id="ProceduralSnake" component={ProceduralSnake} {...S} />
    <Composition id="AlienParty" component={AlienParty} {...S} />
    <Composition id="KineticText" component={KineticText} {...S} />
    <Composition id="DevilDancer" component={DevilDancer} {...S} />
    <Composition id="AlienDJ" component={AlienDJ} {...S} />
    <Composition id="CyberDrummer" component={CyberDrummer} {...S} />
    <Composition id="VoodooShaman" component={VoodooShaman} {...S} />
    <Composition id="PepeStormFlyer" component={PepeStormFlyer} {...S} />
    <Composition id="CybercoreBreach" component={CybercoreBreach} {...S} />
    <Composition id="UfoAttacks" component={UfoAttacksScene} {...S} />
    <Composition id="UfoCityAttack" component={UfoCityAttack} {...S} />
    <Composition id="RobotApocalypse" component={RobotApocalypse} {...S} />
    <Composition id="NinjaFighting" component={NinjaFighting} {...S} />
    <Composition id="RobotBoxing" component={RobotBoxing} {...S} />
    <Composition
      id="LucidDriftOS"
      component={LucidDriftOS}
      {...S_LANDSCAPE}
      calculateMetadata={calculateLucidDuration}
    />

    {/* ── VinylStreamOverlay Pipeline ─────────────────────────────────────── */}
    {/* Each entry in pipeline.config.ts gets its own Composition in Studio   */}
    {renders.map(job => (
      <Composition
        key={job.id}
        id={job.id}
        component={VinylStreamOverlay}
        defaultProps={{ job }}
        fps={FPS}
        durationInFrames={job.durationSec ? Math.ceil(job.durationSec * FPS) : 1}
        calculateMetadata={makeCalculateMetadata(job)}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
