import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { RobotFighter, FighterState } from './Ninja';

// ─── Scene Constants ───
const W = 1080;
const H = 1920;
const FLOOR_Y = H * 0.8;

// ─── Main Composition ───
export const NinjaFighting: React.FC = () => {
    const rawFrame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ─── Audio Data & Frequency Analysis ───
    const audioData = useAudioData(staticFile('audio/track.mp3'));
    const viz = audioData ? visualizeAudio({ fps, frame: rawFrame, audioData, numberOfSamples: 32 }) : new Array(32).fill(0);

    // Bass (0-3) and Mid (10-15)
    let bass = 0; let mid = 0;
    for (let i = 0; i < 4; i++) bass += viz[i] || 0;
    bass = Math.max(0, bass * 2.5); // Amplified for easier triggering
    for (let i = 10; i < 16; i++) mid += viz[i] || 0;

    // ─── Choreography logic (State Machine) ───
    // We want them to fight based on bass hits. 
    // We use rawFrame for choreography logic.

    // A stable frame for rendering
    const tFrame = rawFrame; // Base time

    // Phase determination (Who is attacking?)
    // Swap roles precisely every second (30 frames) to enforce alternating head punches
    const p1Attacking = Math.floor(tFrame / 30) % 2 === 0;

    // Determine states based on bass spikes
    let state1: FighterState = 'idle';
    let state2: FighterState = 'idle';
    let stateProg1 = 0;
    let stateProg2 = 0;

    // Trigger attacks when bass peaks
    // Increased threshold slightly so they don't punch constantly on quiet bits
    if (bass > 0.7) {
        if (p1Attacking) {
            state1 = 'punch';
            stateProg1 = Math.min(1, (bass - 0.65) / 0.35); // scale 0 to 1 based on bass intensity
            state2 = 'hurt';
            stateProg2 = stateProg1;
        } else {
            state2 = 'punch';
            stateProg2 = Math.min(1, (bass - 0.65) / 0.35);
            state1 = 'hurt';
            stateProg1 = stateProg2;
        }
    } else {
        // Idle motion
        stateProg1 = (tFrame % 30) / 30;
        stateProg2 = (tFrame % 30) / 30;
    }

    // ─── Positions & Spring Physics ───
    // Base positions
    let x1 = W * 0.35;
    let x2 = W * 0.65;

    // Knockback
    if (state1 === 'hurt') x1 -= bass * 80;
    if (state2 === 'hurt') x2 += bass * 80;

    return (
        <AbsoluteFill style={{ backgroundColor: '#050508' }}>
            <Audio src={staticFile('audio/track.mp3')} />

            {/* Simple Floor Line */}
            <div style={{ position: 'absolute', bottom: H - FLOOR_Y, width: W, height: 2, backgroundColor: '#222' }} />

            {/* SVG Canvas for Robots */}
            <svg width={W} height={H} style={{ position: 'absolute' }}>

                {/* Robot 1 (Left) */}
                <RobotFighter
                    x={x1} y={FLOOR_Y} scale={3.5}
                    facingLeft={false} colorMain="#00d8ff" colorGlow="#0088ff"
                    state={state1} stateProgress={stateProg1}
                    frame={tFrame} fps={fps}
                />

                {/* Robot 2 (Right) */}
                <RobotFighter
                    x={x2} y={FLOOR_Y} scale={3.5}
                    facingLeft={true} colorMain="#ff0055" colorGlow="#ff0022"
                    state={state2} stateProgress={stateProg2}
                    frame={tFrame} fps={fps}
                />
            </svg>
        </AbsoluteFill>
    );
};
