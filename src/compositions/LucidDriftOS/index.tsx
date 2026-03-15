import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';
import { useAudioEngine } from '../shared/useAudioEngine';
import { EQVisualizer } from '../shared/EQVisualizer';
import { ParticleEmitter } from '../shared/ParticleEmitter';
import { VinylPlayer } from '../shared/VinylPlayer';
import { OSWindow } from '../shared/OSWindow';
import { PomodoroTimer } from '../shared/PomodoroTimer';
import { PromoPopup } from '../shared/PromoPopup';
import { VCRPrompt } from '../shared/VCRPrompt';
import { getAssetUrl } from '../shared/assets';

import cfg from './config.json';

const LucidDriftOS: React.FC = () => {
    const frame = useCurrentFrame();
    // const { fps, width, height } = useVideoConfig(); // Unused for now

    const audioUrl = cfg.audioTrack ? getAssetUrl(cfg.audioTrack.src) : null;
    const { engine } = useAudioEngine(audioUrl || '', cfg);

    const vinylSize = cfg.overlay.vinylSize || 300;

    // Window Positions
    const playerWin = { x: 100, y: 100, w: 500, h: 600 };
    const timerWin = { x: 700, y: 150, w: 400, h: 250 };
    const logWin = { x: 100, y: 750, w: 1000, h: 200 };

    return (
        <AbsoluteFill style={{ backgroundColor: cfg.overlay.background || '#E8E4D9' }}>
            {/* Desktop Background Texture or Grid could go here */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: 'radial-gradient(#d1cfc7 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.5
            }} />

            {/* 1. Music Player Window */}
            <OSWindow
                title="LucidPlayer v1.0 - Digital Twin"
                x={playerWin.x}
                y={playerWin.y}
                width={playerWin.w}
                height={playerWin.h}
                contentStyle={{ backgroundColor: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
                {/* Particles Emitter focused on vinyl center */}
                <ParticleEmitter
                    hearts={engine.hearts}
                    frame={frame}
                    originX={playerWin.w / 2 - 8} // Relative to window content (padding ignored for now)
                    originY={playerWin.h / 2 - 50}
                    getAssetUrl={getAssetUrl}
                    particleSrc={cfg.overlay.particleSrc}
                    config={cfg.overlay}
                />

                <VinylPlayer
                    x={(playerWin.w - vinylSize) / 2 - 12} // Adjust for padding/border
                    y={(playerWin.h - vinylSize) / 2 - 40}
                    size={vinylSize}
                    rotation={frame * 2}
                    scale={cfg.overlay.originScale}
                    vinylSrc={cfg.overlay.vinylSrc}
                    getAssetUrl={getAssetUrl}
                />

                {/* EQ at the bottom of the player window */}
                <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                    <EQVisualizer
                        eqData={engine.eqData}
                        eqBands={cfg.equalizer.bands}
                        frame={frame}
                        width="100%"
                        height={100}
                        color={cfg.equalizer.color}
                        color2={cfg.equalizer.color2}
                        config={cfg.equalizer}
                    />
                </div>
            </OSWindow>

            {/* 2. Focus Timer Window */}
            <OSWindow title="Pomodoro Focus" x={timerWin.x} y={timerWin.y} width={timerWin.w} height={timerWin.h}>
                <PomodoroTimer startMinutes={50} color="#000" />
                <div style={{ marginTop: 15, fontSize: 11, color: '#666', lineHeight: 1.4 }}>
                    Remember to take a 10-minute break after this session. Stay hydrated and stay in the flow.
                </div>
            </OSWindow>

            {/* 3. Terminal / Logs Window */}
            <OSWindow title="System.log" x={logWin.x} y={logWin.y} width={logWin.w} height={logWin.h} contentStyle={{ backgroundColor: '#000' }}>
                {/* We reuse VCRPrompt but override its AbsoluteFill to fit in window */}
                <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                    <VCRPrompt
                        text={cfg.vcrPrompt.text}
                        cycleSeconds={cfg.vcrPrompt.cycleSeconds}
                        offsetSeconds={cfg.vcrPrompt.offsetSeconds}
                        holdSeconds={cfg.vcrPrompt.holdSeconds}
                    />
                </div>
            </OSWindow>

            {/* Global Overlays (Popups) */}
            <PromoPopup
                text={cfg.promo.text}
                cycleSeconds={cfg.promo.cycleSeconds}
                offsetSeconds={cfg.promo.offsetSeconds}
                holdSeconds={cfg.promo.holdSeconds}
            />

        </AbsoluteFill>
    );
};

export default LucidDriftOS;
