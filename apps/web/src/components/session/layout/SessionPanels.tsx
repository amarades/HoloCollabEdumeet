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
                <div className="absolute top-0 md:top-6 right-0 md:right-6 bottom-0 md:bottom-32 w-full md:w-80 bg-white border border-gray-200 md:rounded-2xl shadow-xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-gray-900 font-semibold text-lg">Participants</h3>
                        <button onClick={() => setShowParticipants(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div className="p-3 rounded-xl flex items-center justify-between bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-lg">
                                    {user?.name?.[0]?.toUpperCase() || 'L'}
                                </div>
                                <div>
                                    <div className="text-gray-900 font-medium text-sm">{user?.name} (You)</div>
                                    <div className="text-xs text-gray-500 font-medium">
                                        {isHost ? 'Host' : 'Participant'}
                                    </div>
                                </div>
                            </div>
                            <Mic size={16} className="text-gray-400" />
                        </div>
                        {users.map((p, idx) => {
                            const engagement = engagementMap[p.id] || 0;
                            return (
                                <div key={idx} className="p-3 rounded-xl flex flex-col gap-2 hover:bg-gray-50 transition-colors cursor-pointer group border border-transparent hover:border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-lg">
                                                {p.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-gray-900 font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                                                    {p.name}
                                                    {p.handRaised && <span className="text-amber-500 animate-bounce">✋</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">Participant</div>
                                            </div>
                                        </div>
                                        <Mic size={16} className={p.micOn !== false ? "text-green-500" : "text-gray-300"} />
                                    </div>
                                    
                                    {/* Engagement Mini Bar */}
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${engagement > 70 ? 'bg-green-500' : engagement > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                style={{ width: `${engagement}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 w-6">{engagement}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showChat && (
                <div className="absolute top-0 md:top-6 right-0 md:right-6 bottom-0 md:bottom-32 w-full md:w-80 bg-white border border-gray-200 md:rounded-2xl shadow-xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-gray-900 font-semibold text-lg">Meeting Chat</h3>
                        <button onClick={() => setShowChat(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <ChatPanel socket={socketInstance} user={user} roomId={sessionStorage.getItem('room_code') || ''} />
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
