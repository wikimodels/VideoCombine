import React from 'react';

// A stylized vector skull that rotates
export const SkullGraphic = () => (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* Shadow/Backing */}
        <circle cx="50" cy="50" r="48" fill="#151515" />

        {/* Skull Dome */}
        <path d="M 50 15 C 25 15, 15 35, 15 50 C 15 65, 25 70, 35 70 L 65 70 C 75 70, 85 65, 85 50 C 85 35, 75 15, 50 15 Z" fill="#e0e0e0" />

        {/* Jaw bone */}
        <path d="M 35 70 L 40 85 L 60 85 L 65 70 Z" fill="#cfcfcf" />

        {/* Eye Sockets */}
        <circle cx="35" cy="45" r="10" fill="#111" />
        <circle cx="65" cy="45" r="10" fill="#111" />

        {/* Inner Eye Glow (Asymmetrical for rotation feeling) */}
        <circle cx="33" cy="43" r="3" fill="#ff4081" />
        <circle cx="67" cy="47" r="2" fill="#00bcd4" />

        {/* Nasal Cavity */}
        <path d="M 50 55 L 47 62 L 53 62 Z" fill="#111" />

        {/* Teeth */}
        <rect x="40" y="72" width="4" height="8" fill="#111" rx="1" />
        <rect x="48" y="73" width="4" height="8" fill="#111" rx="1" />
        <rect x="56" y="72" width="4" height="8" fill="#111" rx="1" />

        {/* Cracked texture lines to make rotation distinct */}
        <path d="M 50 15 C 55 25, 45 30, 50 35" fill="none" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <path d="M 20 40 L 25 42" fill="none" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <path d="M 80 40 L 75 42" fill="none" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <path d="M 40 85 L 42 90" fill="none" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <path d="M 60 85 L 58 90" fill="none" stroke="#222" strokeWidth="1" strokeLinecap="round" />
    </svg>
);
