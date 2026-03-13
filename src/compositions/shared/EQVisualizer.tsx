import React from 'react';

interface EQVisualizerProps {
    eqData: Float32Array | null;
    eqBands: number;
    frame: number;
    width: number | string;
    height: number;
    color: string;
    color2: string;
    config?: {
        reflex?: boolean;
        reflexAlpha?: number;
        heightCurve?: number;
        roundBars?: boolean;
        radius?: number;
        gap?: number;
        barWidth?: number;
    };
}

export const EQVisualizer: React.FC<EQVisualizerProps> = ({
    eqData,
    eqBands,
    frame,
    width,
    height,
    color,
    color2,
    config
}) => {
    if (!eqData) return null;

    const curve = config?.heightCurve ?? 1.4;
    const roundBars = config?.roundBars ?? true;
    const radius = config?.radius ?? 4;
    const gap = config?.gap ?? 2;
    const barWidth = config?.barWidth ?? 4;

    return (
        <div
            style={{
                width: width,
                height: height,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                WebkitBoxReflect: (config?.reflex ?? true)
                    ? `below 0px linear-gradient(transparent 30%, rgba(0,0,0,${config?.reflexAlpha ?? 0.3}))`
                    : undefined,
            }}
        >
            {Array.from({ length: eqBands }, (_, b) => {
                const val = eqData[frame * eqBands + b] ?? 0;
                const barH = Math.max(1, Math.pow(val, curve) * (height - 6));

                return (
                    <div key={b} style={{
                        width: barWidth,
                        flexShrink: 0,
                        height: height,
                        marginRight: b < eqBands - 1 ? gap : 0,
                        alignSelf: 'flex-end',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0, right: 0,
                            height: barH,
                            background: `linear-gradient(to top, ${color}, ${color2})`,
                            borderRadius: roundBars ? `${barWidth / 2}px ${barWidth / 2}px 0 0` : `${radius}px ${radius}px 0 0`,
                        }} />
                    </div>
                );
            })}
        </div>
    );
};
