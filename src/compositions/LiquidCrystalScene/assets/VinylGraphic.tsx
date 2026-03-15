import React from 'react';

// Default built-in Vinyl SVG
export const DefaultVinyl = () => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* Black vinyl base */}
        <circle cx="50" cy="50" r="48" fill="#111" />
        {/* Track Grooves - Thickened arcs so rotation of grooves is visible */}
        <path d="M 50 4 A 46 46 0 0 1 96 50" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
        <path d="M 4 50 A 46 46 0 0 0 50 96" fill="none" stroke="#222" strokeWidth="1.5" />

        <path d="M 50 12 A 38 38 0 0 1 88 50" fill="none" stroke="#222" strokeWidth="1.5" />
        <path d="M 12 50 A 38 38 0 0 0 50 88" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />

        <path d="M 50 20 A 30 30 0 0 1 80 50" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />

        {/* Record Label Base */}
        <circle cx="50" cy="50" r="22" fill="#f44336" />

        {/* Asymmetrical Label Design (making rotation VERY obvious) */}
        <path d="M 50 28 A 22 22 0 0 1 72 50 L 50 50 Z" fill="#ffc107" />
        <path d="M 28 50 A 22 22 0 0 1 50 28 L 50 50 Z" fill="#ff9800" />

        {/* Text on label to ensure rotation is felt */}
        <text x="35" y="52" fill="#fff" fontSize="5" fontWeight="bold" transform="rotate(-15, 35, 52)">HIT</text>
        <text x="52" y="65" fill="#fff" fontSize="5" fontWeight="bold" transform="rotate(15, 52, 65)">TRACK</text>

        {/* Spindle Hole */}
        <circle cx="50" cy="50" r="3" fill="#111" />
        <circle cx="50" cy="50" r="1.5" fill="#fff" />
    </svg>
);
