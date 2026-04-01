import React from 'react';
import { VideoGrid } from '../../VideoGrid';
import { SessionSidebar } from '../wrapper/SessionSidebar';
import { Presentation, FileUp } from 'lucide-react';

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
        <div className={`flex-1 relative p-8 pb-0 flex ${splitView ? 'gap-8' : ''}`}>
            {/* Video column (split-view only) */}
            {splitView && !fullscreen3D && (
                <div className="w-80 flex-shrink-0 rounded-[40px] overflow-hidden bg-[#1a1919]/60 backdrop-blur-3xl border border-white/5 shadow-2xl">
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
            <div className="flex-1 relative rounded-[48px] overflow-hidden bg-surface shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5 flex">
                
                {/* Floating reactions overlay */}
                {reactions.length > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-12 z-40 flex gap-4 pointer-events-none">
                        {reactions.map(r => (
                            <div key={r.id} className="flex flex-col items-center animate-bounce-slow">
                                <span className="text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" style={{ animation: 'floatUp 4s ease-out forwards' }}>{r.emoji}</span>
                                <span className="text-[10px] text-white font-black uppercase tracking-widest bg-[#1a1919]/60 backdrop-blur-xl rounded-full px-3 py-1 mt-2 border border-white/10">{r.userName}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Screen share banner */}
                {isScreenSharing && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-500/20 backdrop-blur-2xl text-blue-100 border border-blue-500/30 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(59,130,246,0.3)] z-50 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Live Protocol: Broadcast Active
                    </div>
                )}

                {/* Feature 4 + 2: Voice Detection & Presentation Buttons (Host only) */}
                {isHost && (
                    <div className="absolute bottom-24 left-8 z-50 flex flex-col gap-3">
                        <button
                            onClick={onTogglePresentation}
                            className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all ${presentationMode ? 'bg-primary text-white shadow-primary/30 border border-primary/40' : 'bg-[#1a1919]/80 backdrop-blur-xl hover:bg-primary/20 text-white border border-white/10'}`}
                        >
                            <Presentation className="w-4 h-4" />
                            {presentationMode ? 'Terminate Stream' : 'Deploy Presentation'}
                        </button>
                        
                        <button
                            onClick={() => presentationFileInputRef.current?.click()}
                            disabled={isConverting}
                            className="flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all bg-secondary/80 hover:bg-secondary text-white border border-secondary/40 disabled:opacity-50"
                        >
                            <FileUp className="w-4 h-4" />
                            {isConverting ? 'Processing Buffer...' : 'Inject PDF Asset'}
                        </button>

                        {presentationMode && (
                            <div className="bg-[#1a1919]/60 backdrop-blur-xl text-white/30 text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5 text-center uppercase tracking-widest">
                                Use Arrow Keys to navigate
                            </div>
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
                            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-700 ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        {!cameraOn && (
                            <div className="absolute inset-0 z-0 bg-[#0e0e0e] flex items-center justify-center">
                                <div className="w-40 h-40 rounded-[48px] bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/5 flex items-center justify-center text-5xl text-white font-black shadow-inner">
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                            </div>
                        )}

                        {/* AR Canvas */}
                        <canvas
                            ref={canvasRef}
                            className={`absolute inset-0 w-full h-full z-20 transition-opacity duration-500 ${modelVisible ? 'pointer-events-auto' : 'pointer-events-none opacity-0'}`}
                            style={{ background: 'transparent', touchAction: 'none' }}
                        />

                        {/* Name tag */}
                        <div className="absolute bottom-8 left-8 bg-[#1a1919]/60 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-2 text-white/90 text-[10px] font-black uppercase tracking-[0.2em] z-30 pointer-events-none">
                            {user?.name || 'Authorized Entity'}
                        </div>

                        {/* Fullscreen floating video tiles */}
                        {fullscreen3D && (
                            <div className="absolute top-8 left-8 flex flex-col gap-3 z-30 pointer-events-auto max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                {users.slice(0, 4).map(u => (
                                    <div key={u.id || u.name} className="w-40 rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-[#1a1919]/40 backdrop-blur-xl">
                                        <div className="aspect-video flex items-center justify-center bg-black/20">
                                            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-black">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 px-3 py-2">
                                            <span className="text-white font-bold text-[10px] truncate block uppercase tracking-widest">{u.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sidebar Tools */}
                        <div className="absolute top-8 right-8 z-40 pointer-events-auto shadow-2xl rounded-3xl overflow-hidden border border-white/5">
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
