import React from 'react';
import { Img } from 'remotion';
import { DefaultVinyl, SkullGraphic } from './Graphics';

interface VinylPlayerProps {
    x: number;
    y: number;
    size: number;
    rotation: number;
    scale?: number;
    vinylSrc?: string;
    bgColor?: string;
    getAssetUrl?: (filename: string) => string | null;
}

export const VinylPlayer: React.FC<VinylPlayerProps> = ({
    x,
    y,
    size,
    rotation,
    scale = 1,
    vinylSrc,
    bgColor = '#000',
    getAssetUrl
}) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                backgroundColor: bgColor,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                borderRadius: '50%',
                overflow: 'hidden',
                zIndex: 2000
            }}
        >
            <div style={{ width: '100%', height: '100%', transform: `rotate(${rotation}deg) scale(${scale})` }}>
                {(!vinylSrc || vinylSrc === 'default') ? (
                    <DefaultVinyl />
                ) : vinylSrc === 'skull' ? (
                    <SkullGraphic />
                ) : getAssetUrl ? (
                    <Img src={getAssetUrl(vinylSrc) || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                    <DefaultVinyl />
                )}
            </div>
            {/* Highlight/Reflection Layer */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 100%)',
                pointerEvents: 'none'
            }} />
        </div>
    );
};
