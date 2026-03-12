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
import { CommandoScene } from './compositions/CommandoScene';
import VinylStreamOverlay from './compositions/VinylStreamOverlay';

const FPS = 30;

// Duration = full audio track length, computed at runtime
import VinylConfig from './compositions/VinylStreamOverlay/config.json';
const audioAssetUrl = require(`./compositions/VinylStreamOverlay/assets/${VinylConfig.audioTrack.src}`);

const calculateAudioDuration = async () => {
  const durationSec = await getAudioDurationInSeconds(typeof audioAssetUrl === 'string' ? audioAssetUrl : audioAssetUrl.default);
  return { durationInFrames: Math.ceil(durationSec * FPS) };
};

// All TikTok/Shorts scenes: 1080×1920 (9:16), 30fps, full track length
const S = {
  calculateMetadata: calculateAudioDuration,
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
    {/* Legacy scene */}

    {/* ── 16:9 Landscape scenes ── */}
    <Composition id="CommandoScene" component={CommandoScene} {...S_LANDSCAPE} />

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
    <Composition id="AlienParty" component={AlienParty}      {...S} />
    <Composition id="KineticText" component={KineticText}    {...S} />
    <Composition id="DevilDancer" component={DevilDancer}    {...S} />
    <Composition id="AlienDJ" component={AlienDJ} {...S} />
    <Composition
      id="CyberDrummer"
      component={CyberDrummer}
      {...S}
    />

    <Composition
      id="VoodooShaman"
      component={VoodooShaman}
      {...S}
    />

    <Composition
      id="PepeStormFlyer"
      component={PepeStormFlyer}
      {...S}
    />
    <Composition
      id="CybercoreBreach"
      component={CybercoreBreach}
      {...S}
    />
    <Composition
      id="UfoAttacks"
      component={UfoAttacksScene}
      {...S}
    />
    <Composition
      id="UfoCityAttack"
      component={UfoCityAttack}
      {...S}
    />
    <Composition
      id="RobotApocalypse"
      component={RobotApocalypse}
      {...S}
    />
    <Composition
      id="NinjaFighting"
      component={NinjaFighting}
      {...S}
    />
    <Composition
      id="RobotBoxing"
      component={RobotBoxing}
      {...S}
    />
    <Composition
      id="VinylStreamOverlay"
      component={VinylStreamOverlay}
      {...S_LANDSCAPE}
    />
  </>
);
