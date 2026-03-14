import React, { useState } from 'react';
import { X, MicOff, UserMinus, ShieldCheck, Volume2, VolumeX, BarChart3, Users } from 'lucide-react';
import { SocketManager } from '../../../realtime/SocketManager';

interface Participant {
    id: string;
    name: string;
    micOn?: boolean;
    cameraOn?: boolean;
    handRaised?: boolean;
    engagementScore?: number;
}

interface HostControlsProps {
    participants: Participant[];
    localName: string;
    socket: SocketManager | null;
    onClose: () => void;
    engagementMap?: Record<string, number>;
    onRemoveParticipant?: (id: string) => void;
}

export const HostControls: React.FC<HostControlsProps> = ({
    participants,
    localName,
    socket,
    onClose,
    engagementMap = {},
    onRemoveParticipant,
}) => {
    const [mutingAll, setMutingAll] = useState(false);
    const [view, setView] = useState<'students' | 'analytics'>('students');

    const avgEngagement = participants.length > 0 
        ? Math.round(participants.reduce((acc, p) => acc + (engagementMap[p.id] || 0), 0) / participants.length)
        : 0;

    const muteAll = () => {
        setMutingAll(true);
        socket?.emit('HOST_MUTE_ALL', { by: localName });
        setTimeout(() => setMutingAll(false), 2000);
    };

    const muteParticipant = (id: string, name: string) => {
        socket?.emit('HOST_MUTE', { targetId: id, targetName: name, by: localName });
    };

    const removeParticipant = (id: string, name: string) => {
        if (!confirm(`Remove ${name} from the session?`)) return;
        socket?.emit('HOST_REMOVE', { targetId: id, targetName: name, by: localName });
        onRemoveParticipant?.(id);
    };

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[340px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-100 bg-amber-50/50">
                <div className="flex items-center justify-between p-4 pb-2">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        Host Controls
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex px-4 pb-2 gap-2">
                    <button 
                        onClick={() => setView('students')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'students' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Students
                    </button>
                    <button 
                        onClick={() => setView('analytics')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'analytics' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Analytics
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'students' ? (
                    <div className="flex flex-col">
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
                        <div className="p-3 space-y-2">
                            {participants.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-8">No other participants yet</p>
                            )}
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                        {p.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-gray-900 text-sm font-medium truncate flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                {p.name}
                                                {p.handRaised && <span title="Hand raised">✋</span>}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${(engagementMap[p.id] || 0) > 70 ? 'bg-green-500' : (engagementMap[p.id] || 0) > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                        style={{ width: `${engagementMap[p.id] || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400">{(engagementMap[p.id] || 0)}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {p.micOn !== false
                                                ? <Volume2 className="w-3 h-3 text-green-500" />
                                                : <VolumeX className="w-3 h-3 text-red-400" />}
                                            <span className="text-xs text-gray-400">{p.micOn !== false ? 'Mic on' : 'Muted'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => muteParticipant(p.id, p.name)} className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors">
                                            <MicOff className="w-3.5 h-3.5 text-amber-600" />
                                        </button>
                                        <button onClick={() => removeParticipant(p.id, p.name)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                                            <UserMinus className="w-3.5 h-3.5 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-6 animate-in fade-in duration-300">
                        {/* Engagement Overview */}
                        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 text-center">
                            <p className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-1">Average Engagement</p>
                            <div className="text-5xl font-black text-purple-900 mb-2">
                                {avgEngagement}%
                            </div>
                            <div className="w-full bg-purple-200/50 rounded-full h-2 max-w-[200px] mx-auto overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-700 ${avgEngagement > 70 ? 'bg-green-500' : avgEngagement > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${avgEngagement}%` }}
                                />
                            </div>
                        </div>

                        {/* Action List */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Attention Scores</h3>
                            <div className="space-y-2">
                                {participants.map(p => {
                                    const score = engagementMap[p.id] || 0;
                                    return (
                                        <div key={p.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                                                <span className={`text-xs font-bold ${score > 70 ? 'text-green-600' : score > 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                                    {score}% Attention
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${score > 70 ? 'bg-green-500' : score > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                    style={{ width: `${score}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {participants.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4 italic">Waiting for students...</p>
                                )}
                            </div>
                        </div>

                        {/* AI Tip Placeholder */}
                        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                            <div className="flex gap-2">
                                <div className="text-blue-500 mt-0.5">💡</div>
                                <p className="text-[11px] text-blue-700 leading-relaxed">
                                    {avgEngagement < 50 
                                      ? "Tip: Low engagement detected. Try asking a poll question to re-capture attention."
                                      : "Tip: Great engagement! Now is a good time for a brief quiz to reinforce concepts."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
