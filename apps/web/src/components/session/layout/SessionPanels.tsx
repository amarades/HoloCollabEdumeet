import React from 'react';
import { X, Mic } from 'lucide-react';

interface SessionPanelsProps {
    showParticipants: boolean;
    setShowParticipants: (show: boolean) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showHostControls: boolean;
    setShowHostControls: (show: boolean) => void;
    user: any;
    users: any[];
    isHost: boolean;
    ChatPanel: React.FC<any>; // For now passing as component or using existing
    HostControls: React.FC<any>;
    socketInstance: any;
    engagementMap: Record<string, number>;
}

export const SessionPanels: React.FC<SessionPanelsProps> = React.memo(({
    showParticipants,
    setShowParticipants,
    showChat,
    setShowChat,
    showHostControls,
    setShowHostControls,
    ChatPanel,
    HostControls,
    socketInstance,
    engagementMap,
    user,
    users,
    isHost,
}) => {
    return (
        <>
            {showParticipants && (
                <div className="absolute top-0 md:top-8 right-0 md:right-8 bottom-0 md:bottom-36 w-full md:w-80 bg-[#1a1919]/60 backdrop-blur-3xl border border-white/5 md:rounded-[32px] shadow-2xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Manifest</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Active Entities</p>
                        </div>
                        <button onClick={() => setShowParticipants(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                        <div className="p-4 rounded-2xl flex items-center justify-between bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-black text-sm">
                                    {user?.name?.[0]?.toUpperCase() || 'L'}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-white font-bold text-sm truncate">{user?.name}</div>
                                    <div className="text-[9px] text-primary font-black uppercase tracking-widest">
                                        {isHost ? 'Prime Entity' : 'Linked Participant'}
                                    </div>
                                </div>
                            </div>
                            <Mic size={14} className="text-primary" />
                        </div>
                        {users.map((p, idx) => {
                            const engagement = engagementMap[p.id] || 0;
                            return (
                                <div key={idx} className="p-4 rounded-2xl flex flex-col gap-3 group border border-transparent hover:border-white/5 hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 text-white/60 flex items-center justify-center font-black text-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                {p.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-white/80 font-bold text-sm group-hover:text-white transition-colors flex items-center gap-2 truncate">
                                                    {p.name}
                                                    {p.handRaised && <span className="text-amber-400 animate-bounce text-xs">✋</span>}
                                                </div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-widest">Subscriber</div>
                                            </div>
                                        </div>
                                        <Mic size={14} className={p.micOn !== false ? "text-emerald-400" : "text-white/20"} />
                                    </div>
                                    
                                    {/* Engagement Mini Bar */}
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${engagement > 70 ? 'bg-emerald-400' : engagement > 40 ? 'bg-primary' : 'bg-secondary'}`}
                                                style={{ width: `${engagement}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-black text-white/30 w-6 text-right uppercase tracking-tighter">{engagement}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showChat && (
                <div className="absolute top-0 md:top-8 right-0 md:right-8 bottom-0 md:bottom-36 w-full md:w-96 bg-[#1a1919]/60 backdrop-blur-3xl border border-white/5 md:rounded-[32px] shadow-2xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Stream</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Synchronized Intel</p>
                        </div>
                        <button onClick={() => setShowChat(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden bg-transparent">
                        <ChatPanel socket={socketInstance} user={user} roomId={sessionStorage.getItem('room_code') || ''} />
                    </div>
                </div>
            )}

            {isHost && showHostControls && (
                <HostControls
                    participants={users}
                    localName={user?.name || ''}
                    socket={socketInstance}
                    onClose={() => setShowHostControls(false)}
                    engagementMap={engagementMap}
                />
            )}
        </>
    );
});

export default SessionPanels;
