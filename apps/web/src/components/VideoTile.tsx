import React from 'react';

interface VideoTileProps {
    stream?: MediaStream | null;
    name: string;
    muted?: boolean;
    isLocal?: boolean;
    cameraOn?: boolean;
    isHost?: boolean;
    isSpeaking?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = React.memo(({
    stream,
    name,
    muted = false,
    isLocal = false,
    cameraOn = true,
    isHost = false,
    isSpeaking = false,
}) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const initials = name.slice(0, 2).toUpperCase();
    const bgColors = [
        'bg-violet-500', 'bg-blue-500', 'bg-rose-500',
        'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500',
    ];
    const colorIndex = name.charCodeAt(0) % bgColors.length;

    return (
        <div className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video shadow-sm border transition-all duration-300 group ${isSpeaking ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20' : 'border-white/10'}`}>
            {/* Speaking Indicator Pulse (Overlay) */}
            {isSpeaking && (
                <div className="absolute inset-0 pointer-events-none z-20 animate-pulse-fast ring-inset ring-2 ring-emerald-400/30" />
            )}
            {cameraOn && stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted || isLocal}
                    className="w-full h-full object-cover"
                    style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className={`w-14 h-14 rounded-full ${bgColors[colorIndex]} flex items-center justify-center text-white text-xl font-bold shadow-inner`}>
                        {initials}
                    </div>
                </div>
            )}
            {/* Name tag */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isHost && (
                        <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                            HOST
                        </span>
                    )}
                    <span className="text-white text-xs font-medium truncate">
                        {name}{isLocal ? ' (You)' : ''}
                    </span>
                </div>
                {muted && (
                    <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                )}
             </div>
 
             <style>{`
                 @keyframes pulse-fast {
                     0%, 100% { opacity: 0.3; }
                     50% { opacity: 0.8; }
                 }
                 .animate-pulse-fast {
                     animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                 }
             `}</style>
         </div>
    );
});
