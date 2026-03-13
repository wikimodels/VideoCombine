import React from 'react';
import { interpolate, Easing } from 'remotion';
import { HeartParams } from './useAudioEngine';
import { CrosshairGraphic, HeartGraphic } from './Graphics';

interface ParticleEmitterProps {
    hearts: HeartParams[];
    frame: number;
    originX: number;
    originY: number;
    particleSrc?: string | null;
    getAssetUrl?: (filename: string) => string | null;
    config?: {
        particleFadeStart?: number;
        particleMaxHeight?: number;
        particleDeceleration?: number;
        particleFadeRange?: number;
        particleSpreadStart?: number;
    };
}

export const ParticleEmitter: React.FC<ParticleEmitterProps> = ({
    hearts,
    frame,
    originX,
    originY,
    particleSrc,
    getAssetUrl,
    config
}) => {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {hearts.map((h) => {
                const age = frame - h.startF;
                if (age < 0 || age > h.duration) return null;

                const progress = age / h.duration;
                const fadeStart = config?.particleFadeStart ?? 0.6;
                const maxHeightRatio = config?.particleMaxHeight ?? 0.8;
                const decStrength = config?.particleDeceleration ?? 0.2;

                let yOff = 0;
                const fullTravel = -800;

                if (decStrength <= 0) {
                    yOff = fullTravel * progress;
                } else {
                    const power = 1 + decStrength * 6;
                    const eased = 1 - Math.pow(1 - Math.min(progress, 1), power);
                    yOff = fullTravel * eased;
                }

                const timeOpacity = interpolate(progress, [0, 0.1, fadeStart, 1], [0, 1, 1, 0]);
                const travelRatio = Math.abs(yOff) / Math.abs(fullTravel);
                const fadeRange = config?.particleFadeRange ?? 0.15;
                const heightOpacity = interpolate(travelRatio,
                    [Math.max(0, maxHeightRatio - fadeRange), maxHeightRatio],
                    [1, 0],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

                const opacity = Math.min(timeOpacity, heightOpacity);
                const spreadStart = config?.particleSpreadStart ?? 0.0;
                const spreadProgress = Math.max(0, (progress - spreadStart) / (1 - spreadStart));
                const spreadCurve = Math.pow(spreadProgress, 1.2);
                const sprayWideness = h.baseX * spreadCurve;
                const currentAmp = h.amp * spreadCurve;
                const sineSway = Math.sin(age * h.freq + h.phase) * currentAmp;
                const xOff = sprayWideness + sineSway;

                const scale = interpolate(progress, [0, 0.05, 1], [0.01, h.scalePeak, h.scalePeak * 0.8], {
                    easing: Easing.out(Easing.back(1.5))
                });

                return (
                    <div
                        key={h.id}
                        style={{
                            position: 'absolute',
                            left: originX - 20,
                            top: originY - 20,
                            width: 40,
                            height: 40,
                            transform: `translate(${xOff}px, ${yOff}px) scale(${scale})`,
                            opacity,
                            zIndex: Math.floor(1000 - age)
                        }}
                    >
                        {particleSrc === 'heart' ? (
                            <HeartGraphic color={h.color} />
                        ) : particleSrc && getAssetUrl ? (
                            <div style={{
                                width: '100%', height: '100%',
                                backgroundColor: h.color,
                                WebkitMaskImage: `url('${getAssetUrl(particleSrc)}')`,
                                WebkitMaskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                maskImage: `url('${getAssetUrl(particleSrc)}')`,
                                maskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center'
                            }} />
                        ) : (
                            <CrosshairGraphic color={h.color} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
