import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface PomodoroTimerProps {
    startMinutes?: number;
    color?: string;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
    startMinutes = 50,
    color = '#000000'
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const totalSeconds = startMinutes * 60;
    const elapsedSeconds = frame / fps;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);

    const formatTime = (val: number) => val.toString().padStart(2, '0');

    return (
        <div style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 48,
            fontWeight: 'bold',
            color: color,
            textAlign: 'center',
            padding: '20px 0',
            backgroundColor: '#000000',
            borderRadius: 4,
            border: '2px inset #ffffff',
            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.5)',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.2)'
        }}>
            {formatTime(minutes)}:{formatTime(seconds)}
            <div style={{ fontSize: 14, marginTop: 8, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2 }}>
                Focus Session
            </div>
        </div>
    );
};
