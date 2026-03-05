import React from 'react';

interface ConnectionQualityProps {
    quality: 'good' | 'fair' | 'poor';
    className?: string;
}

/**
 * 3-bar connection quality indicator (like mobile signal bars).
 * green = good, amber = fair, red = poor.
 */
export const ConnectionQuality: React.FC<ConnectionQualityProps> = ({ quality, className = '' }) => {
    const bars = [
        { minQuality: 'poor', height: 'h-1.5' },
        { minQuality: 'fair', height: 'h-2.5' },
        { minQuality: 'good', height: 'h-4' },
    ];

    const qualityRank = { poor: 0, fair: 1, good: 2 };
    const rank = qualityRank[quality];

    const colorClass =
        quality === 'good' ? 'bg-green-400' :
            quality === 'fair' ? 'bg-amber-400' : 'bg-red-400';

    const label =
        quality === 'good' ? 'Good connection' :
            quality === 'fair' ? 'Fair connection' : 'Poor connection';

    return (
        <div
            className={`flex items-end gap-0.5 ${className}`}
            title={label}
            aria-label={label}
        >
            {bars.map((bar, i) => (
                <div
                    key={i}
                    className={`w-1.5 rounded-sm transition-colors duration-500
                        ${bar.height}
                        ${i <= rank ? colorClass : 'bg-gray-600'}
                    `}
                />
            ))}
        </div>
    );
};
