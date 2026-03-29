import React from 'react';
import { VideoGrid } from '../../VideoGrid';
import { SessionSidebar } from '../wrapper/SessionSidebar';
import { Monitor, Presentation, FileUp } from 'lucide-react';

interface SessionMainAreaProps {
    user: any;
    users: any[];
    localStream: MediaStream | null;
    cameraOn: boolean;
    micOn: boolean;
    remoteStreams: Record<string, MediaStream>;
    speakingUsers: Set<string>;
    localUserId?: string;
    splitView: boolean;
    fullscreen3D: boolean;
    isScreenSharing: boolean;
    reactions: any[];
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    modelVisible: boolean;
    isHost: boolean;
    presentationMode: boolean;
    setPresentationMode: (mode: boolean) => void;
    onTogglePresentation: () => void;
    onUploadPresentation: (file: File) => void;
    isConverting: boolean;
}

export const SessionMainArea: React.FC<SessionMainAreaProps> = ({
    user,
    users,
    localStream,
    cameraOn,
    micOn,
    remoteStreams,
    speakingUsers,
    localUserId,
    splitView,
    fullscreen3D,
    isScreenSharing,
    reactions,
    activeTool,
    onSelectTool,
    videoRef,
    canvasRef,
    modelVisible,
    isHost,
    presentationMode,
    onTogglePresentation,
    onUploadPresentation,
    isConverting
}) => {
    const presentationFileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className={`flex-1 relative p-4 md:p-6 pb-0 flex ${splitView ? 'gap-4' : ''}`}>
            {/* Video column (split-view only) */}
            {splitView && !fullscreen3D && (
                <div className="w-64 flex-shrink-0 rounded-[20px] overflow-hidden bg-gray-900 border border-gray-200/30">
                    <VideoGrid
                        localName={user?.name || 'You'}
                        localStream={localStream}
                        localCameraOn={cameraOn}
                        localMicOn={micOn}
                        localIsHost={true}
                        speakingUsers={speakingUsers}
                        localUserId={localUserId}
                        participants={users.map(u => ({
                            id: u.id || u.name,
                            name: u.name,
                            cameraOn: true,
                            micOn: true,
                            isHost: u.isHost || false
                        }))}
                        remoteStreams={remoteStreams}
                        compact
                    />
                </div>
            )}

            {/* 3D / main view */}
            <div className="flex-1 relative rounded-[24px] overflow-hidden bg-gray-900 shadow-sm border border-gray-200/50 flex">
                
                {/* Floating reactions overlay */}
                {reactions.length > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-40 flex gap-3 pointer-events-none">
                        {reactions.map(r => (
                            <div key={r.id} className="flex flex-col items-center animate-bounce-slow">
                                <span className="text-4xl drop-shadow-lg" style={{ animation: 'floatUp 4s ease-out forwards' }}>{r.emoji}</span>
                                <span className="text-xs text-white font-medium bg-black/40 rounded-full px-2 py-0.5 mt-1">{r.userName}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Screen share banner */}
                {isScreenSharing && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Sharing your screen
                    </div>
                )}

                {/* Feature 4 + 2: Voice Detection & Presentation Buttons (Host only) */}
                {isHost && (
                    <div className="absolute bottom-20 left-4 z-50 flex flex-col gap-2">
                        <button
                            onClick={onTogglePresentation}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${presentationMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-800/80 hover:bg-gray-700 text-white'}`}
                        >
                            <Presentation className="w-3.5 h-3.5" />
                            {presentationMode ? 'Exit Slides' : '🖥 Slide Mode'}
                        </button>
                        
                        <button
                            onClick={() => presentationFileInputRef.current?.click()}
                            disabled={isConverting}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                        >
                            <FileUp className="w-3.5 h-3.5" />
                            {isConverting ? 'Processing...' : 'Upload PDF'}
                        </button>

                        {presentationMode && (
                            <div className="bg-black/60 text-white/70 text-xs px-2 py-1 rounded-lg text-center">← → to navigate</div>
                        )}
                    </div>
                )}

                {/* Main video / canvas area */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        {!cameraOn && (
                            <div className="absolute inset-0 z-0 bg-gray-800 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-4xl text-white font-medium shadow-inner">
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                            </div>
                        )}

                        {/* AR Canvas */}
                        <canvas
                            ref={canvasRef}
                            className={`absolute inset-0 w-full h-full z-20 ${modelVisible ? 'pointer-events-auto' : 'pointer-events-none opacity-0 transition-opacity'}`}
                            style={{ background: 'transparent', touchAction: 'none' }}
                        />

                        {/* Name tag */}
                        <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium z-30 pointer-events-none">
                            {user?.name || 'Participant'}
                        </div>

                        {/* Fullscreen floating video tiles */}
                        {fullscreen3D && (
                            <div className="absolute top-6 left-6 flex flex-col gap-2 z-30 pointer-events-auto max-h-80 overflow-y-auto">
                                {users.slice(0, 4).map(u => (
                                    <div key={u.id || u.name} className="w-32 rounded-xl overflow-hidden shadow-lg border border-white/20">
                                        <div className="bg-gray-800 aspect-video flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="bg-black/60 px-2 py-1">
                                            <span className="text-white text-xs truncate block">{u.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sidebar Tools */}
                        <div className="absolute top-6 right-6 z-40 pointer-events-auto shadow-xl rounded-2xl">
                            <SessionSidebar
                                activeTool={activeTool}
                                onSelectTool={onSelectTool}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden presentation file input */}
            <input
                type="file"
                ref={presentationFileInputRef}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadPresentation(f); e.target.value = ''; }}
                accept="application/pdf"
                className="hidden"
            />
        </div>
    );
};
