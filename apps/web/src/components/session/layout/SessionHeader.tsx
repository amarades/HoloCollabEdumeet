import React from 'react';
import { Hand } from 'lucide-react';
import { ConnectionQuality } from '../../ConnectionQuality';

interface SessionHeaderProps {
    isConnected: boolean;
    connectionQuality: 'good' | 'fair' | 'poor';
    gesturesEnabled: boolean;
    currentGesture: string;
    sceneObjectCount: number;
    handRaised: boolean;
    isTranscribing: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = React.memo(({
    isConnected,
    connectionQuality,
    gesturesEnabled,
    currentGesture,
    sceneObjectCount,
    handRaised,
    isTranscribing
}) => {
    return (
        <div className="absolute top-8 left-8 flex flex-col gap-4 z-30 pointer-events-none">
            {/* Connection Status */}
            <div className="flex items-center gap-3 bg-[#1a1919]/60 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl rounded-full px-5 py-2.5 transition-all">
                {isConnected
                    ? <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    : <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_10px_rgba(248,113,113,0.5)]" />}
                <span className="text-white text-xs font-black uppercase tracking-[0.15em]">
                    {isConnected ? 'Nexus Connected' : 'Wait... Protocol Offline'}
                </span>
                <div className="ml-2 h-3 w-[1px] bg-white/10" />
                <ConnectionQuality quality={connectionQuality} />
            </div>

            <div className="flex flex-wrap gap-3">
                {/* Gesture Detection Status */}
                <div className={`flex items-center gap-2.5 bg-[#1a1919]/60 border shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl rounded-full px-4 py-2 transition-all ${gesturesEnabled ? 'border-primary/40' : 'border-white/5'}`}>
                    <Hand className={`w-3.5 h-3.5 ${gesturesEnabled ? 'text-primary' : 'text-white/40'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${gesturesEnabled ? 'text-white' : 'text-white/40'}`}>
                        {currentGesture || (gesturesEnabled ? 'Ready' : 'Gestures Off')}
                    </span>
                </div>

                {/* Scene Object Count */}
                {sceneObjectCount > 0 && (
                    <div className="flex items-center gap-2.5 bg-[#1a1919]/60 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl rounded-full px-4 py-2">
                        <span className="text-[10px] font-black text-secondary tracking-widest uppercase">{sceneObjectCount} Modules Linked</span>
                    </div>
                )}

                {/* Hand Raised Indicator */}
                {handRaised && (
                    <div className="flex items-center gap-2.5 bg-primary/20 border border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.2)] backdrop-blur-xl rounded-full px-4 py-2 animate-pulse">
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">✋ Intent Flagged</span>
                    </div>
                )}

                {/* Transcription Status */}
                {isTranscribing && (
                    <div className="flex items-center gap-2.5 bg-secondary/20 border border-secondary/40 shadow-[0_0_20px_rgba(236,72,153,0.2)] backdrop-blur-xl rounded-full px-4 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Flow Active</span>
                    </div>
                )}
            </div>
        </div>
    );
});
