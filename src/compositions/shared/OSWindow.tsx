import React from 'react';

interface OSWindowProps {
    title: string;
    children: React.ReactNode;
    width: number | string;
    height: number | string;
    x?: number;
    y?: number;
    style?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
}

export const OSWindow: React.FC<OSWindowProps> = ({
    title,
    children,
    width,
    height,
    x,
    y,
    style,
    contentStyle
}) => {
    return (
        <div
            style={{
                position: x !== undefined || y !== undefined ? 'absolute' : 'relative',
                left: x,
                top: y,
                width: width,
                height: height,
                backgroundColor: '#dfdfdf',
                borderTop: '2px solid #ffffff',
                borderLeft: '2px solid #ffffff',
                borderRight: '2px solid #808080',
                borderBottom: '2px solid #808080',
                boxShadow: '2px 2px 0px #000000',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: '"MS Sans Serif", Arial, sans-serif',
                overflow: 'hidden',
                ...style
            }}
        >
            {/* Title Bar */}
            <div style={{
                height: 24,
                backgroundColor: '#000080',
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 'bold',
                userSelect: 'none'
            }}>
                <span style={{ flex: 1 }}>{title}</span>
                {/* Window Buttons */}
                <div style={{ display: 'flex', gap: 2 }}>
                    <WindowButton symbol="_" />
                    <WindowButton symbol="□" />
                    <WindowButton symbol="×" color="#ff0000" />
                </div>
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                padding: 8,
                backgroundColor: '#ffffff',
                border: '2px inset #ffffff',
                margin: 2,
                overflow: 'auto',
                ...contentStyle
            }}>
                {children}
            </div>
        </div>
    );
};

const WindowButton: React.FC<{ symbol: string; color?: string }> = ({ symbol, color }) => (
    <div style={{
        width: 16,
        height: 14,
        backgroundColor: '#dfdfdf',
        borderTop: '1px solid #ffffff',
        borderLeft: '1px solid #ffffff',
        borderRight: '1px solid #808080',
        borderBottom: '1px solid #808080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: color || '#000000',
        lineHeight: 1
    }}>
        {symbol}
    </div>
);
