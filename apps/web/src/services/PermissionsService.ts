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
    private unsubscribers: Array<() => void> = [];

    static getInstance(): PermissionsService {
        if (!PermissionsService.instance) {
            PermissionsService.instance = new PermissionsService();
        }
        return PermissionsService.instance;
    }

    initialize(socket: SocketManager, isHost: boolean) {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
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
        this.unsubscribers.push(this.socket.on('PARTICIPANT_JOIN_REQUEST', (data: any) => {
            console.log('[PermissionsService] Received JOIN_REQUEST event from socket:', data);
            const request: ParticipantRequest = {
                userId: data.userId,
                userName: data.userName,
                requestedAt: data.requestedAt
            };
            this.pendingRequests.push(request);
            this.notifyJoinRequest(request);
        }));

        // Listen for permission requests from participants
        this.unsubscribers.push(this.socket.on('PERMISSION_REQUEST', (data: any) => {
            this.handlePermissionRequest(data.userId, data.permission);
        }));
    }

    private setupParticipantListeners() {
        if (!this.socket) return;

        // Listen for permission grants from host
        this.unsubscribers.push(this.socket.on('PERMISSION_GRANTED', (data: any) => {
            this.updatePermissions(data.userId, data.permissions);
        }));

        // Listen for permission revocations
        this.unsubscribers.push(this.socket.on('PERMISSION_REVOKED', (data: any) => {
            this.updatePermissions(data.userId, data.permissions);
        }));

        // Listen for join approval/rejection
        this.unsubscribers.push(this.socket.on('JOIN_APPROVED', (data: any) => {
            this.onJoinApproved(data);
        }));

        this.unsubscribers.push(this.socket.on('JOIN_REJECTED', (data: any) => {
            this.onJoinRejected(data);
        }));
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
            // Read user name from the standard auth storage location
            let userName = 'Guest';
            try {
                const userData = localStorage.getItem('user_name') || localStorage.getItem('user_data');
                if (userData) {
                    // Could be a plain string (user_name) or JSON object (user_data)
                    if (userData.startsWith('{')) {
                        const parsed = JSON.parse(userData);
                        userName = parsed.name || parsed.email || 'Guest';
                    } else {
                        userName = userData;
                    }
                }
            } catch { /* ignore parse errors */ }

            console.log('[PermissionsService] Socket ready — sending join request as:', userName);
            this.socket.emit('PARTICIPANT_JOIN_REQUEST', {
                userId: this.socket.getUserId(),
                userName,
                requestedAt: Date.now()
            });
        } else if (attempts < 30) {
            // Retry every 500ms for up to 15 seconds
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

    canInteract(): boolean {
        if (this.isHost) return true;
        const myId = this.socket?.getUserId();
        if (!myId) return false;
        return this.hasPermission(myId, 'canControlGestures');
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
        console.log('[PermissionsService] Dispatching participantJoinRequest window event:', request);
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
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.socket = null;
        this.isHost = false;
        this.pendingRequests = [];
        this.participantPermissions = {};
    }
}
