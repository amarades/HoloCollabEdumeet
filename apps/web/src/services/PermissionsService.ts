import { SocketManager } from '../realtime/SocketManager';

export interface UserPermissions {
    canControlGestures: boolean;
    canUploadModels: boolean;
    canControlWhiteboard: boolean;
    canManageParticipants: boolean;
    canStartQuiz: boolean;
    canUseAI: boolean;
}

export interface ParticipantRequest {
    userId: string;
    userName: string;
    requestedAt: number;
}

export class PermissionsService {
    private static instance: PermissionsService;
    private socket: SocketManager | null = null;
    private isHost: boolean = false;
    private pendingRequests: ParticipantRequest[] = [];
    private participantPermissions: Record<string, UserPermissions> = {};

    static getInstance(): PermissionsService {
        if (!PermissionsService.instance) {
            PermissionsService.instance = new PermissionsService();
        }
        return PermissionsService.instance;
    }

    initialize(socket: SocketManager, isHost: boolean) {
        this.socket = socket;
        this.isHost = isHost;
        
        if (isHost) {
            this.setupHostListeners();
        } else {
            this.setupParticipantListeners();
            // Wait for socket to be connected before requesting join
            // The socket connection is async, so we poll until it's ready
            this.requestJoinWhenReady();
        }
    }

    private setupHostListeners() {
        if (!this.socket) return;

        // Listen for participant join requests
        this.socket.on('PARTICIPANT_JOIN_REQUEST', (data: any) => {
            const request: ParticipantRequest = {
                userId: data.userId,
                userName: data.userName,
                requestedAt: data.requestedAt
            };
            this.pendingRequests.push(request);
            this.notifyJoinRequest(request);
        });

        // Listen for permission requests from participants
        this.socket.on('PERMISSION_REQUEST', (data: any) => {
            this.handlePermissionRequest(data.userId, data.permission);
        });
    }

    private setupParticipantListeners() {
        if (!this.socket) return;

        // Listen for permission grants from host
        this.socket.on('PERMISSION_GRANTED', (data: any) => {
            this.updatePermissions(data.userId, data.permissions);
        });

        // Listen for permission revocations
        this.socket.on('PERMISSION_REVOKED', (data: any) => {
            this.updatePermissions(data.userId, data.permissions);
        });

        // Listen for join approval/rejection
        this.socket.on('JOIN_APPROVED', (data: any) => {
            this.onJoinApproved(data);
        });

        this.socket.on('JOIN_REJECTED', (data: any) => {
            this.onJoinRejected(data);
        });
    }

    // Host methods
    approveParticipant(userId: string, permissions?: Partial<UserPermissions>) {
        if (!this.isHost || !this.socket) return;

        const defaultPermissions: UserPermissions = {
            canControlGestures: false,
            canUploadModels: false,
            canControlWhiteboard: true,
            canManageParticipants: false,
            canStartQuiz: false,
            canUseAI: true,
            ...permissions
        };

        this.socket.emit('APPROVE_PARTICIPANT', {
            userId,
            permissions: defaultPermissions
        });

        // Remove from pending requests
        this.pendingRequests = this.pendingRequests.filter(req => req.userId !== userId);
    }

    rejectParticipant(userId: string, reason?: string) {
        if (!this.isHost || !this.socket) return;

        this.socket.emit('REJECT_PARTICIPANT', {
            userId,
            reason
        });

        // Remove from pending requests
        this.pendingRequests = this.pendingRequests.filter(req => req.userId !== userId);
    }

    grantPermission(userId: string, permission: keyof UserPermissions) {
        if (!this.isHost || !this.socket) return;

        const currentPermissions = this.participantPermissions[userId] || this.getDefaultParticipantPermissions();
        currentPermissions[permission] = true;

        this.socket.emit('GRANT_PERMISSION', {
            userId,
            permission,
            permissions: currentPermissions
        });

        this.updatePermissions(userId, currentPermissions);
    }

    revokePermission(userId: string, permission: keyof UserPermissions) {
        if (!this.isHost || !this.socket) return;

        const currentPermissions = this.participantPermissions[userId] || this.getDefaultParticipantPermissions();
        currentPermissions[permission] = false;

        this.socket.emit('REVOKE_PERMISSION', {
            userId,
            permission,
            permissions: currentPermissions
        });

        this.updatePermissions(userId, currentPermissions);
    }

    // Participant methods
    private requestJoinWhenReady(attempts = 0) {
        if (this.isHost || !this.socket) return;
        
        if (this.socket.isConnected()) {
            console.log('[PermissionsService] Socket ready — sending join request.');
            this.socket.emit('PARTICIPANT_JOIN_REQUEST', {
                userId: this.socket.getUserId(),
                userName: localStorage.getItem('user_name') || 'Guest',
                requestedAt: Date.now()
            });
        } else if (attempts < 20) {
            // Retry every 500ms for up to 10 seconds
            console.log(`[PermissionsService] Waiting for socket connection... (attempt ${attempts + 1})`);
            setTimeout(() => this.requestJoinWhenReady(attempts + 1), 500);
        } else {
            console.error('[PermissionsService] Timed out waiting for socket — join request not sent.');
        }
    }

    requestJoin() {
        if (this.isHost || !this.socket) return;
        this.requestJoinWhenReady();
    }

    requestPermission(permission: keyof UserPermissions) {
        if (this.isHost || !this.socket) return;

        this.socket.emit('PERMISSION_REQUEST', {
            permission
        });
    }

    // Utility methods
    hasPermission(userId: string, permission: keyof UserPermissions): boolean {
        if (this.isHost) return true; // Host has all permissions
        return this.participantPermissions[userId]?.[permission] || false;
    }

    getPendingRequests(): ParticipantRequest[] {
        return this.pendingRequests;
    }

    getParticipantPermissions(userId: string): UserPermissions {
        return this.participantPermissions[userId] || this.getDefaultParticipantPermissions();
    }

    private getDefaultParticipantPermissions(): UserPermissions {
        return {
            canControlGestures: false,
            canUploadModels: false,
            canControlWhiteboard: true,
            canManageParticipants: false,
            canStartQuiz: false,
            canUseAI: true
        };
    }

    private updatePermissions(userId: string, permissions: UserPermissions) {
        this.participantPermissions[userId] = permissions;
        this.notifyPermissionChange(userId, permissions);
    }

    private notifyJoinRequest(request: ParticipantRequest) {
        // This would be handled by React components via event system
        window.dispatchEvent(new CustomEvent('participantJoinRequest', { 
            detail: request 
        }));
    }

    private notifyPermissionChange(userId: string, permissions: UserPermissions) {
        window.dispatchEvent(new CustomEvent('permissionChange', {
            detail: { userId, permissions }
        }));
    }

    private onJoinApproved(data: any) {
        window.dispatchEvent(new CustomEvent('joinApproved', { detail: data }));
    }

    private onJoinRejected(data: any) {
        window.dispatchEvent(new CustomEvent('joinRejected', { detail: data }));
    }

    private handlePermissionRequest(userId: string, permission: keyof UserPermissions) {
        // Host can handle this via UI
        window.dispatchEvent(new CustomEvent('permissionRequest', {
            detail: { userId, permission }
        }));
    }

    // Cleanup
    destroy() {
        this.socket = null;
        this.isHost = false;
        this.pendingRequests = [];
        this.participantPermissions = {};
    }
}
