import React, { useState, useEffect } from 'react';
import { Users, Check, X, Settings } from 'lucide-react';
import { PermissionsService, type ParticipantRequest, type UserPermissions } from '../../services/PermissionsService';

interface ParticipantApprovalProps {
    isHost: boolean;
}

export const ParticipantApproval: React.FC<ParticipantApprovalProps> = ({ isHost }) => {
    const [pendingRequests, setPendingRequests] = useState<ParticipantRequest[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isHost) return;

        // Initialize with any already pending requests from PermissionsService
        const permissionsService = PermissionsService.getInstance();
        const existingRequests = permissionsService.getPendingRequests();
        if (existingRequests.length > 0) {
            console.log('[ParticipantApproval] Initializing with existing requests:', existingRequests);
            setPendingRequests(existingRequests);
            setShow(true);
        }

        const handleJoinRequest = (event: CustomEvent) => {
            const request = event.detail as ParticipantRequest;
            console.log('[ParticipantApproval] Received join request event:', request);
            setPendingRequests(prev => {
                // Prevent duplicate entries for the same user
                if (prev.some(r => r.userId === request.userId)) return prev;
                return [...prev, request];
            });
            // Always expand the panel when a new request arrives
            setShow(true);
        };

        window.addEventListener('participantJoinRequest', handleJoinRequest as EventListener);

        return () => {
            window.removeEventListener('participantJoinRequest', handleJoinRequest as EventListener);
        };
    }, [isHost]);

    const handleApprove = (userId: string) => {
        const permissionsService = PermissionsService.getInstance();
        permissionsService.approveParticipant(userId);
        setPendingRequests(prev => prev.filter(req => req.userId !== userId));
    };

    const handleReject = (userId: string) => {
        const permissionsService = PermissionsService.getInstance();
        permissionsService.rejectParticipant(userId);
        setPendingRequests(prev => prev.filter(req => req.userId !== userId));
    };

    const handleApproveWithPermissions = (userId: string, permissions: Partial<UserPermissions>) => {
        const permissionsService = PermissionsService.getInstance();
        permissionsService.approveParticipant(userId, permissions);
        setPendingRequests(prev => prev.filter(req => req.userId !== userId));
    };

    if (!isHost || pendingRequests.length === 0) return null;

    return (
        <div className="fixed top-8 right-8 z-[60] w-full max-w-sm animate-in slide-in-from-right-8 duration-500">
            <div className="bg-[#1a1919]/80 backdrop-blur-3xl border border-primary/20 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.6)] p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Users className="w-5 h-5 text-primary" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            </div>
                            <h3 className="font-black text-xs text-white uppercase tracking-[0.2em]">Join Request</h3>
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Inbound Link Request</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/30 uppercase tracking-widest leading-none">
                            {pendingRequests.length} Pending
                        </span>
                        <button
                            onClick={() => setShow(!show)}
                            className="p-1.5 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {show && (
                    <div className="space-y-3 pt-2">
                        {pendingRequests.map((request) => (
                            <div key={request.userId} className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-white text-sm truncate">{request.userName}</p>
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-black">
                                            Handshake: {new Date(request.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleReject(request.userId)}
                                            className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                                            title="Terminate Link"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleApprove(request.userId)}
                                            className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20"
                                            title="Initialize Sync"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveWithPermissions(request.userId, {
                                            canControlGestures: true,
                                            canUploadModels: true
                                        })}
                                        className="flex-1 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                    >
                                        Full Access
                                    </button>
                                    <button
                                        onClick={() => handleApproveWithPermissions(request.userId, {
                                            canControlGestures: false,
                                            canUploadModels: false
                                        })}
                                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Observer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
