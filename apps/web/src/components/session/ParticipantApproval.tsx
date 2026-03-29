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
        <div className="fixed top-4 right-4 z-50 max-w-sm" style={{ animation: 'slideInRight 0.3s ease' }}>
            <div className="bg-white border-2 border-blue-400 rounded-xl shadow-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Users className="w-5 h-5 text-blue-500" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Join Requests</h3>
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                            {pendingRequests.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setShow(!show)}
                        className="text-gray-400 hover:text-gray-600"
                        title={show ? 'Collapse' : 'Expand'}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                {show && (
                    <div className="space-y-3">
                        {pendingRequests.map((request) => (
                            <div key={request.userId} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-medium text-gray-900">{request.userName}</p>
                                        <p className="text-xs text-gray-500">
                                            Requested {new Date(request.requestedAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleApprove(request.userId)}
                                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                            title="Approve with default permissions"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.userId)}
                                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Reject"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveWithPermissions(request.userId, {
                                            canControlGestures: true,
                                            canUploadModels: true
                                        })}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                    >
                                        + Full Access
                                    </button>
                                    <button
                                        onClick={() => handleApproveWithPermissions(request.userId, {
                                            canControlGestures: false,
                                            canUploadModels: false
                                        })}
                                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                    >
                                        + View Only
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
