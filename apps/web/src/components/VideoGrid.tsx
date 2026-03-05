import React from 'react';
import { VideoTile } from './VideoTile';

interface Participant {
    id: string;
    name: string;
    stream?: MediaStream | null;
    cameraOn?: boolean;
    micOn?: boolean;
}

interface VideoGridProps {
    localName: string;
    localStream?: MediaStream | null;
    localCameraOn?: boolean;
    localMicOn?: boolean;
    participants: Participant[];
    /** When true, renders as a compact strip (split-view mode) */
    compact?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
    localName,
    localStream,
    localCameraOn = true,

    participants,
    compact = false,
}) => {
    const total = participants.length + 1; // +1 for local

    const gridCols =
        compact ? 'grid-cols-1' :
            total === 1 ? 'grid-cols-1' :
                total <= 4 ? 'grid-cols-2' :
                    'grid-cols-3';

    return (
        <div className={`grid ${gridCols} gap-2 w-full h-full p-2 content-start`}>
            {/* Local tile always first */}
            <VideoTile
                key="local"
                stream={localStream}
                name={localName}
                muted
                isLocal
                cameraOn={localCameraOn}
            />

            {/* Remote participants */}
            {participants.map((p) => (
                <VideoTile
                    key={p.id}
                    stream={p.stream}
                    name={p.name}
                    muted={!p.micOn}
                    cameraOn={p.cameraOn ?? true}
                />
            ))}

            {/* Empty-state when alone */}
            {total === 1 && !compact && (
                <div className="rounded-xl border-2 border-dashed border-gray-700/50 aspect-video flex flex-col items-center justify-center gap-2 text-gray-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs">Waiting for participants…</span>
                </div>
            )}
        </div>
    );
};
