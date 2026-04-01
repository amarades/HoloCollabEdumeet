import React from 'react';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Hand, Box, Sparkles, Copy, Check,
    Columns, Maximize2, Monitor, MonitorOff,
    Users, MessageSquare, ShieldCheck
} from 'lucide-react';

interface SessionControlBarProps {
    roomCode: string | null;
    codeCopied: boolean;
    onCopyCode: () => void;
    micOn: boolean;
    toggleMic: () => void;
    cameraOn: boolean;
    toggleCamera: () => void;
    gesturesEnabled: boolean;
    toggleGestures: () => void;
    modelVisible: boolean;
    toggleModel: () => void;
    splitView: boolean;
    setSplitView: React.Dispatch<React.SetStateAction<boolean>>;
    fullscreen3D: boolean;
    setFullscreen3D: React.Dispatch<React.SetStateAction<boolean>>;
    handRaised: boolean;
    toggleHand: () => void;
    isScreenSharing: boolean;
    toggleScreenShare: () => void;
    showReactionPicker: boolean;
    setShowReactionPicker: React.Dispatch<React.SetStateAction<boolean>>;
    onSendReaction: (emoji: string) => void;
    onLeave: () => void;
    isHost: boolean;
    showParticipants: boolean;
    setShowParticipants: React.Dispatch<React.SetStateAction<boolean>>;
    showChat: boolean;
    setShowChat: React.Dispatch<React.SetStateAction<boolean>>;
    showHostControls: boolean;
    setShowHostControls: React.Dispatch<React.SetStateAction<boolean>>;
}

const REACTIONS = ['❤️', '👍', '🔥', '😮', '👏', '🤔', '🎉', '😢'];

export const SessionControlBar: React.FC<SessionControlBarProps> = React.memo(({
    roomCode,
    codeCopied,
    onCopyCode,
    micOn,
    toggleMic,
    cameraOn,
    toggleCamera,
    gesturesEnabled,
    toggleGestures,
    modelVisible,
    toggleModel,
    splitView,
    setSplitView,
    fullscreen3D,
    setFullscreen3D,
    handRaised,
    toggleHand,
    isScreenSharing,
    toggleScreenShare,
    showReactionPicker,
    setShowReactionPicker,
    onSendReaction,
    onLeave,
    isHost,
    showParticipants,
    setShowParticipants,
    showChat,
    setShowChat,
    showHostControls,
    setShowHostControls
}) => {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-6 bg-[#1a1919]/40 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] z-50">
            {/* Room Identifier */}
            <div className="hidden lg:flex flex-col gap-1 pr-6 border-r border-white/10">
                <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/40 leading-none">Spatial Link</span>
                <button
                    onClick={onCopyCode}
                    className="flex items-center gap-2 text-white hover:text-primary transition-colors group"
                >
                    <span className="font-mono font-bold text-sm tracking-widest">{roomCode || 'SECURE'}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                        {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/40 group-hover:text-primary" />}
                    </div>
                </button>
            </div>

            {/* Main Interaction Hub */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-full border border-white/5">
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${!micOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-primary/20 text-white border border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'}`}
                    >
                        {!micOn ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={toggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${!cameraOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-secondary/20 text-white border border-secondary/40 shadow-[0_0_20px_rgba(236,72,153,0.3)]'}`}
                    >
                        {!cameraOn ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleGestures}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${gesturesEnabled ? 'bg-primary/20 text-primary border border-primary/40 shadow-inner' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                        title="AI Gesture Engine"
                    >
                        <Sparkles size={20} />
                    </button>

                    <button
                        onClick={toggleModel}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${modelVisible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                    >
                        <Box size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2 mx-2">
                    <button
                        onClick={() => { setSplitView(!splitView); setFullscreen3D(false); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${splitView ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                    >
                        <Columns size={20} />
                    </button>
                    <button
                        onClick={() => { setFullscreen3D(!fullscreen3D); setSplitView(false); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${fullscreen3D ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleHand}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${handRaised ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                    >
                        <Hand size={20} />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowReactionPicker(!showReactionPicker)}
                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                        >
                            <span className="text-xl">😊</span>
                        </button>
                        {showReactionPicker && (
                            <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 bg-[#1a1919]/90 border border-white/10 rounded-3xl shadow-2xl p-3 flex gap-2 z-[60] backdrop-blur-xl animate-in fade-in zoom-in-75 duration-300">
                                {REACTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { onSendReaction(emoji); setShowReactionPicker(false); }}
                                        className="text-2xl p-2 hover:bg-white/10 rounded-2xl transition-all hover:scale-125"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={toggleScreenShare}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                >
                    {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                </button>
            </div>

            {/* Utility / Side Panels */}
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                <button
                    onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowHostControls(false); }}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${showParticipants ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                    <Users size={18} />
                </button>
                <button
                    onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowHostControls(false); }}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${showChat ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                >
                    <MessageSquare size={18} />
                </button>
                {isHost && (
                    <button
                        onClick={() => { setShowHostControls(!showHostControls); setShowChat(false); setShowParticipants(false); }}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${showHostControls ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                    >
                        <ShieldCheck size={18} />
                    </button>
                )}
                
                <div className="w-[1px] h-8 bg-white/10 mx-1" />

                <button
                    onClick={onLeave}
                    className="h-12 px-6 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 transition-all font-black text-[10px] tracking-widest uppercase flex items-center gap-3 group"
                >
                    <PhoneOff size={16} className="group-hover:rotate-[135deg] transition-transform duration-500" />
                    Terminate
                </button>
            </div>
        </div>
    );
});
