import React from 'react';

// Sniper Crosshair Graphic
// Receives a color prop to dynamically change its stroke color when spawned
export const CrosshairGraphic = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* Главный круг прицела */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="4" />

        {/* Горизонтальная ось (выступает за круг) */}
        <line x1="2" y1="50" x2="98" y2="50" stroke={color} strokeWidth="4" />

        {/* Вертикальная ось (выступает за круг) */}
        <line x1="50" y1="2" x2="50" y2="98" stroke={color} strokeWidth="4" />

        {/* --- ЗАСЕЧКИ --- */}
        {/* Верхний луч */}
        <line x1="45" y1="15" x2="55" y2="15" stroke={color} strokeWidth="3" />
        <line x1="45" y1="25" x2="55" y2="25" stroke={color} strokeWidth="3" />
        <line x1="45" y1="35" x2="55" y2="35" stroke={color} strokeWidth="3" />

        {/* Нижний луч */}
        <line x1="45" y1="65" x2="55" y2="65" stroke={color} strokeWidth="3" />
        <line x1="45" y1="75" x2="55" y2="75" stroke={color} strokeWidth="3" />
        <line x1="45" y1="85" x2="55" y2="85" stroke={color} strokeWidth="3" />

        {/* Левый луч */}
        <line x1="15" y1="45" x2="15" y2="55" stroke={color} strokeWidth="3" />
        <line x1="25" y1="45" x2="25" y2="55" stroke={color} strokeWidth="3" />
        <line x1="35" y1="45" x2="35" y2="55" stroke={color} strokeWidth="3" />

        {/* Правый луч */}
        <line x1="65" y1="45" x2="65" y2="55" stroke={color} strokeWidth="3" />
        <line x1="75" y1="45" x2="75" y2="55" stroke={color} strokeWidth="3" />
        <line x1="85" y1="45" x2="85" y2="55" stroke={color} strokeWidth="3" />

        {/* Центральная точка для точности (опционально) */}
        <circle cx="50" cy="50" r="3" fill="#ff4336" />
    </svg>
);
