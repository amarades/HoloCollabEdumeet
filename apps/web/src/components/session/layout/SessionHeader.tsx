import React from 'react';
import { CheckCircle2, Hand } from 'lucide-react';
import { ConnectionQuality } from '../../ConnectionQuality';

interface SessionHeaderProps {
    isConnected: boolean;
    connectionQuality: 'good' | 'fair' | 'poor';
    gesturesEnabled: boolean;
    currentGesture: string;
    sceneObjectCount: number;
    handRaised: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = React.memo(({
    isConnected,
    connectionQuality,
    gesturesEnabled,
    currentGesture,
    sceneObjectCount,
    handRaised
}) => {
    return (
        <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
            {/* Connection Status */}
            <div className="flex items-center gap-2 bg-white/90 border border-gray-200 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                {isConnected
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-gray-700 text-sm font-medium">
                    {isConnected ? 'Connected' : 'Reconnecting…'}
                </span>
                <ConnectionQuality quality={connectionQuality} />
            </div>

            {/* Gesture Detection Status */}
            <div className={`flex items-center gap-2 bg-white/90 border ${gesturesEnabled ? 'border-primary/30 text-primary' : 'border-gray-200 text-gray-500'} shadow-sm backdrop-blur-md rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-colors`}>
                <Hand className="w-3 md:w-4 h-3 md:h-4" />
                <span className="text-xs md:text-sm font-medium">{currentGesture}</span>
            </div>

            {/* Scene Object Count */}
            {sceneObjectCount > 0 && (
                <div className="flex items-center gap-2 bg-white/90 border border-violet-200 text-violet-600 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                    <span className="text-sm font-medium">{sceneObjectCount} object{sceneObjectCount !== 1 ? 's' : ''} in scene</span>
                </div>
            )}

            {/* Hand Raised Indicator */}
            {handRaised && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 shadow-sm backdrop-blur-md rounded-full px-4 py-2">
                    <span className="text-sm font-medium">✋ Hand raised</span>
                </div>
            )}
        </div>
    );
});
