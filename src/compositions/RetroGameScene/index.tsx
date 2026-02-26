import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

const ROWS = 4;
const COLS = 8;
const TOTAL = ROWS * COLS;
const KILL_INTERVAL_SEC = 0.55;
const ALIEN_EMOJIS = ['👾', '🛸', '👽', '🤖'];
const pixelFont = { fontFamily: '"Courier New", monospace' };

export const RetroGameScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const audioUrl = staticFile('track.mp3');
    const audioData = useAudioData(audioUrl);

    if (!audioData) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

    const viz = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 });
    const bass = (viz[0] + viz[1] + viz[2]) / 3;
    const mid = (viz[6] + viz[7]) / 2;
    const volume = Math.min(bass * 3, 1);
    const isBeat = bass > 0.3;

    const KILL_INTERVAL = Math.round(fps * KILL_INTERVAL_SEC);
    const numDead = Math.min(Math.floor(frame / KILL_INTERVAL), TOTAL);
    const score = numDead * 80;

    // Formation marches left-right, slowly descends
    const marchX = Math.sin(frame * 0.012) * width * 0.12;
    const marchY = 180 + Math.floor(frame / (fps * 20)) * 28;

    const spacing = (width - 160) / (COLS - 1);

    const aliens = Array.from({ length: TOTAL }, (_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const x = 80 + col * spacing + marchX;
        const y = marchY + row * 90;
        const isDead = i < numDead;
        const isNext = i === numDead;
        const pulse = 1 + Math.sin(frame * 0.12 + row * 0.4) * 0.08;
        return { x, y, isDead, isNext, row, pulse };
    });

    // Ship follows mid-frequency
    const shipX = width / 2 + Math.sin(frame * 0.04 + mid * 2) * width * 0.33;

    // Laser bursts
    const LASER_PERIOD = Math.round(fps * 0.35);
    const laserAge = frame % LASER_PERIOD;
    const laserY = height * 0.83 - (laserAge / LASER_PERIOD) * height * 0.75;
    const laserOpacity = Math.max(0, 1 - laserAge / LASER_PERIOD * 0.6);

    // Waveform bottom strip
    const bars = Array.from({ length: 40 }, (_, i) => viz[i] ?? 0);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            <Audio src={audioUrl} />

            {/* CRT SCANLINES */}
            <AbsoluteFill style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,50,0,0.25) 4px)',
                pointerEvents: 'none', zIndex: 99,
            }} />

            {/* HUD */}
            <div style={{
                position: 'absolute', top: 36, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between', padding: '0 50px',
                color: '#00ff44', fontSize: 34, ...pixelFont,
            }}>
                <span>SCORE<br />{String(score).padStart(6, '0')}</span>
                <span style={{ textAlign: 'center', fontSize: 28 }}>BEAT<br />INVADERS</span>
                <span style={{ textAlign: 'right' }}>HI<br />999999</span>
            </div>

            {/* LIVES */}
            <div style={{ position: 'absolute', top: 130, left: 50, color: '#00ff44', fontSize: 30, ...pixelFont }}>
                {'♥ ♥ ♥'}
            </div>

            {/* ALIENS */}
            {aliens.filter(a => !a.isDead).map((a, i) => (
                <div key={i} style={{
                    position: 'absolute', left: a.x - 28, top: a.y - 28,
                    fontSize: 46, transform: `scale(${a.pulse})`,
                    filter: `drop-shadow(0 0 ${a.isNext && isBeat ? 16 : 5}px #00ff44)`,
                    opacity: a.isNext && isBeat ? 0.4 : 1,
                }}>
                    {ALIEN_EMOJIS[a.row % 4]}
                </div>
            ))}

            {/* EXPLOSION on kill */}
            {isBeat && numDead < TOTAL && (() => {
                const dying = aliens[numDead];
                return Array.from({ length: 10 }, (_, i) => {
                    const angle = (i / 10) * Math.PI * 2;
                    const d = 50 + bass * 90;
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: dying.x + Math.cos(angle) * d - 5,
                            top: dying.y + Math.sin(angle) * d - 5,
                            width: 10, height: 10, borderRadius: '50%',
                            background: '#ffff00',
                            boxShadow: '0 0 12px #ffff00, 0 0 24px #ff8800',
                        }} />
                    );
                });
            })()}

            {/* LASER BEAM */}
            {laserY > 0 && (
                <div style={{
                    position: 'absolute', left: shipX - 3, top: laserY,
                    width: 6, height: Math.max(0, height * 0.83 - laserY),
                    background: '#00ff44', opacity: laserOpacity,
                    boxShadow: '0 0 12px #00ff44, 0 0 24px #00ff44',
                    borderRadius: 3,
                }} />
            )}

            {/* SHIP */}
            <div style={{
                position: 'absolute', bottom: 74, left: shipX - 30,
                fontSize: 54,
                filter: `drop-shadow(0 0 ${6 + volume * 18}px #00ff44)`,
            }}>
                🚀
            </div>

            {/* GROUND */}
            <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, height: 3, background: '#00ff44', boxShadow: '0 0 10px #00ff44' }} />

            {/* WAVEFORM STRIP */}
            <div style={{
                position: 'absolute', bottom: 10, left: 20, right: 20,
                height: 44, display: 'flex', alignItems: 'flex-end', gap: 4,
            }}>
                {bars.map((amp, i) => (
                    <div key={i} style={{
                        flex: 1, height: Math.max(2, amp * 3 * 44),
                        background: '#00ff44', borderRadius: '2px 2px 0 0',
                        boxShadow: `0 0 ${amp * 20}px #00ff44`,
                    }} />
                ))}
            </div>

            {isBeat && <AbsoluteFill style={{ background: `rgba(0,255,68,${bass * 0.07})`, pointerEvents: 'none' }} />}
        </AbsoluteFill>
    );
};
