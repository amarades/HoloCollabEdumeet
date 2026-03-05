import React, { useState } from 'react';
import { X, MicOff, UserMinus, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { SocketManager } from '../../../realtime/SocketManager';

interface Participant {
    id: string;
    name: string;
    micOn?: boolean;
    cameraOn?: boolean;
    handRaised?: boolean;
}

interface HostControlsProps {
    participants: Participant[];
    localName: string;
    socket: SocketManager | null;
    onClose: () => void;
    onRemoveParticipant?: (id: string) => void;
}

export const HostControls: React.FC<HostControlsProps> = ({
    participants,
    localName,
    socket,
    onClose,
    onRemoveParticipant,
}) => {
    const [mutingAll, setMutingAll] = useState(false);

    const muteAll = () => {
        setMutingAll(true);
        socket?.emit('HOST_MUTE_ALL', { by: localName });
        setTimeout(() => setMutingAll(false), 2000);
    };

    const muteParticipant = (id: string, name: string) => {
        socket?.emit('HOST_MUTE', { targetId: id, targetName: name, by: localName });
    };

    const makeCoHost = (id: string, name: string) => {
        socket?.emit('HOST_PROMOTE', { targetId: id, targetName: name });
    };

    const removeParticipant = (id: string, name: string) => {
        if (!confirm(`Remove ${name} from the session?`)) return;
        socket?.emit('HOST_REMOVE', { targetId: id, targetName: name, by: localName });
        onRemoveParticipant?.(id);
    };

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[340px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-amber-50/50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    Host Controls
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Mute All */}
            <div className="p-4 border-b border-gray-100">
                <button
                    onClick={muteAll}
                    disabled={mutingAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all"
                >
                    <VolumeX className="w-4 h-4" />
                    {mutingAll ? 'Muted All' : 'Mute All Participants'}
                </button>
            </div>

            {/* Participant list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {participants.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">No other participants yet</p>
                )}
                {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                            {p.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-900 text-sm font-medium truncate flex items-center gap-1.5">
                                {p.name}
                                {p.handRaised && <span title="Hand raised">✋</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {p.micOn !== false
                                    ? <Volume2 className="w-3 h-3 text-green-500" />
                                    : <VolumeX className="w-3 h-3 text-red-400" />}
                                <span className="text-xs text-gray-400">{p.micOn !== false ? 'Mic on' : 'Muted'}</span>
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => muteParticipant(p.id, p.name)}
                                title="Mute participant"
                                className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                                <MicOff className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                                onClick={() => makeCoHost(p.id, p.name)}
                                title="Make co-host"
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                                onClick={() => removeParticipant(p.id, p.name)}
                                title="Remove from session"
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                <UserMinus className="w-3.5 h-3.5 text-red-500" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
