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
        <div className="p-4 md:p-6 bg-black/5 md:bg-transparent z-30 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Room code / label */}
            <div className="hidden sm:flex items-center gap-3">
                {roomCode ? (
                    <button
                        onClick={onCopyCode}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-xs md:text-sm hover:bg-gray-50 transition-all group"
                        title="Click to copy code"
                    >
                        <span className="text-gray-400 text-[10px] md:text-xs">Code:</span>
                        <span className="font-mono font-bold tracking-widest text-primary">{roomCode}</span>
                        {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />}
                    </button>
                ) : (
                    <div className="px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-gray-700 font-medium text-xs md:text-sm">
                        HoloCollab Secure Room
                    </div>
                )}
            </div>

            {/* Center: Primary Controls */}
            <div className="flex items-center gap-2 md:gap-3 mx-auto md:mx-0 w-full md:w-auto justify-center flex-wrap">
                <button
                    onClick={toggleMic}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm ${!micOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    {!micOn ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                    onClick={toggleCamera}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm ${!cameraOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    {!cameraOn ? <VideoOff size={18} /> : <Video size={18} />}
                </button>

                <button
                    onClick={toggleGestures}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${gesturesEnabled ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Sparkles size={18} />
                </button>

                <button
                    onClick={toggleModel}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${modelVisible ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Box size={18} className={modelVisible ? "" : "opacity-50"} />
                </button>

                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={() => { setSplitView(!splitView); setFullscreen3D(false); }}
                        className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${splitView ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        title="Split View"
                    >
                        <Columns size={18} />
                    </button>

                    <button
                        onClick={() => { setFullscreen3D(!fullscreen3D); setSplitView(false); }}
                        className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${fullscreen3D ? 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        title="Fullscreen 3D"
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>

                <button
                    onClick={toggleHand}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${handRaised ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    title="Raise Hand"
                >
                    <Hand size={18} />
                </button>

                {/* Emoji reactions */}
                <div className="relative">
                    <button
                        onClick={() => setShowReactionPicker(!showReactionPicker)}
                        className="p-3 md:p-4 rounded-full transition-all shadow-sm border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        title="Send Reaction"
                    >
                        <span className="text-lg md:text-xl leading-none">😊</span>
                    </button>
                    {showReactionPicker && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                            {REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { onSendReaction(emoji); setShowReactionPicker(false); }}
                                    className="text-xl md:text-2xl p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Screen share */}
                <button
                    onClick={toggleScreenShare}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-sm border ${isScreenSharing ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                >
                    {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                </button>

                <button
                    onClick={onLeave}
                    className="px-4 md:px-6 py-3 md:py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-md font-bold text-xs md:text-sm flex items-center gap-2"
                >
                    <PhoneOff size={16} /> <span className="hidden xs:inline">Leave</span>
                </button>
            </div>

            {/* Right: Side panel toggles */}
            <div className="flex md:flex items-center gap-2 md:gap-3">
                <button
                    onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowHostControls(false); }}
                    className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showParticipants ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    title="Participants"
                >
                    <Users size={18} />
                </button>
                <button
                    onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowHostControls(false); }}
                    className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showChat ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    title="Chat"
                >
                    <MessageSquare size={18} />
                </button>
                {isHost && (
                    <button
                        onClick={() => { setShowHostControls(!showHostControls); setShowChat(false); setShowParticipants(false); }}
                        className={`p-3 md:p-3.5 rounded-full transition-all border shadow-sm ${showHostControls ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        title="Host Controls"
                    >
                        <ShieldCheck size={18} />
                    </button>
                )}
            </div>
        </div>
    );
});
