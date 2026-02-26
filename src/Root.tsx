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

const FPS = 30;

// Duration = full audio track length, computed at runtime
const calculateAudioDuration = async () => {
  const durationSec = await getAudioDurationInSeconds(staticFile("track.mp3"));
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

export const RemotionRoot: React.FC = () => (
  <>
    {/* Legacy scene */}

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
  </>
);
