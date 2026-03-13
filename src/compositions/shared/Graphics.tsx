import React from 'react';

export const CrosshairGraphic: React.FC<{ color: string }> = ({ color }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="4" />
        <line x1="2" y1="50" x2="98" y2="50" stroke={color} strokeWidth="4" />
        <line x1="50" y1="2" x2="50" y2="98" stroke={color} strokeWidth="4" />
        <line x1="45" y1="15" x2="55" y2="15" stroke={color} strokeWidth="3" />
        <line x1="45" y1="25" x2="55" y2="25" stroke={color} strokeWidth="3" />
        <line x1="45" y1="35" x2="55" y2="35" stroke={color} strokeWidth="3" />
        <line x1="45" y1="65" x2="55" y2="65" stroke={color} strokeWidth="3" />
        <line x1="45" y1="75" x2="55" y2="75" stroke={color} strokeWidth="3" />
        <line x1="45" y1="85" x2="55" y2="85" stroke={color} strokeWidth="3" />
        <line x1="15" y1="45" x2="15" y2="55" stroke={color} strokeWidth="3" />
        <line x1="25" y1="45" x2="25" y2="55" stroke={color} strokeWidth="3" />
        <line x1="35" y1="45" x2="35" y2="55" stroke={color} strokeWidth="3" />
        <line x1="65" y1="45" x2="65" y2="55" stroke={color} strokeWidth="3" />
        <line x1="75" y1="45" x2="75" y2="55" stroke={color} strokeWidth="3" />
        <line x1="85" y1="45" x2="85" y2="55" stroke={color} strokeWidth="3" />
        <circle cx="50" cy="50" r="3" fill="#ff4336" />
    </svg>
);

export const SkullGraphic: React.FC = () => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <path d="M50,10 C30,10 15,25 15,45 C15,55 20,65 25,72 L25,85 C25,88 27,90 30,90 L70,90 C73,90 75,88 75,85 L75,72 C80,65 85,55 85,45 C85,25 70,10 50,10 Z" fill="#fff" />
        <circle cx="35" cy="45" r="8" fill="#000" />
        <circle cx="65" cy="45" r="8" fill="#000" />
        <path d="M45,65 L55,65 L53,75 L47,75 Z" fill="#000" />
        <line x1="35" y1="80" x2="65" y2="80" stroke="#000" strokeWidth="2" />
        <line x1="40" y1="75" x2="40" y2="85" stroke="#000" strokeWidth="2" />
        <line x1="50" y1="75" x2="50" y2="85" stroke="#000" strokeWidth="2" />
        <line x1="60" y1="75" x2="60" y2="85" stroke="#000" strokeWidth="2" />
    </svg>
);

export const DefaultVinyl: React.FC = () => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <circle cx="50" cy="50" r="48" fill="#111" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="#222" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="15" fill="#f44336" />
        <circle cx="50" cy="50" r="3" fill="#000" />
    </svg>
);

export const HeartGraphic: React.FC<{ color: string }> = ({ color }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <path d="M50 80C50 80 15 60 15 35C15 20 30 15 50 35C70 15 85 20 85 35C85 60 50 80 50 80Z" fill={color} />
    </svg>
);
