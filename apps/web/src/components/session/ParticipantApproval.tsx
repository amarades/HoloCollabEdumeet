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

        const handleJoinRequest = (event: CustomEvent) => {
            const request = event.detail as ParticipantRequest;
            console.log('[ParticipantApproval] Received join request event:', request);
            setPendingRequests(prev => [...prev, request]);
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
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900">Join Requests</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                            {pendingRequests.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setShow(!show)}
                        className="text-gray-400 hover:text-gray-600"
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
