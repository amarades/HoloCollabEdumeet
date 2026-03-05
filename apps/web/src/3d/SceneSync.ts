/**
 * SceneSync.ts
 * Bridge between ARScene (Three.js) and SocketManager (WebSocket).
 * Emits scene object changes to the server and applies remote changes locally.
 *
 * Performance features:
 *  - Delta compression: only sends transform fields that actually changed
 *  - Cursor throttle: max 60fps (16ms) for CURSOR_MOVE emissions
 */

import { SocketManager } from '../realtime/SocketManager';

export interface SceneObject {
    id: string;
    type: 'box' | 'sphere' | 'cylinder' | 'model';
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    color: string;
    lockedBy: string | null;
}

export type SceneChangeHandler = (objects: SceneObject[]) => void;
export type CursorUpdateHandler = (userId: string, userName: string, position: [number, number, number]) => void;


const CURSOR_THROTTLE_MS = 16; // 60fps cap
const TRANSFORM_EPSILON = 0.0001; // min change to send

export class SceneSync {
    private socket: SocketManager;
    private objects: Map<string, SceneObject> = new Map();
    private onSceneChange?: SceneChangeHandler;
    private onCursorUpdate?: CursorUpdateHandler;
    private lastCursorEmit = 0;
    // Delta compression: last sent transform per object
    private lastSentTransform: Map<string, Pick<SceneObject, 'position' | 'rotation' | 'scale'>> = new Map();

    constructor(socket: SocketManager) {
        this.socket = socket;
        this.attachSocketListeners();
    }

    setOnSceneChange(cb: SceneChangeHandler) { this.onSceneChange = cb; }
    setOnCursorUpdate(cb: CursorUpdateHandler) { this.onCursorUpdate = cb; }

    private attachSocketListeners() {
        this.socket.on('SCENE_STATE', (data: any) => {
            this.objects.clear();
            this.lastSentTransform.clear();
            (data.objects || []).forEach((obj: SceneObject) => {
                this.objects.set(obj.id, obj);
            });
            this.onSceneChange?.(this.getObjects());
        });

        this.socket.on('OBJECT_ADDED', (data: any) => {
            const obj: SceneObject = data.object;
            this.objects.set(obj.id, obj);
            this.onSceneChange?.(this.getObjects());
        });

        this.socket.on('OBJECT_UPDATED', (data: any) => {
            const obj: SceneObject = data.object;
            if (this.objects.has(obj.id)) {
                this.objects.set(obj.id, obj);
                this.onSceneChange?.(this.getObjects());
            }
        });

        this.socket.on('OBJECT_DELETED', (data: any) => {
            this.objects.delete(data.id);
            this.lastSentTransform.delete(data.id);
            this.onSceneChange?.(this.getObjects());
        });

        this.socket.on('OBJECT_LOCKED', (data: any) => {
            const obj = this.objects.get(data.id);
            if (obj) { obj.lockedBy = data.lockedBy; this.onSceneChange?.(this.getObjects()); }
        });

        this.socket.on('OBJECT_UNLOCKED', (data: any) => {
            const obj = this.objects.get(data.id);
            if (obj) { obj.lockedBy = null; this.onSceneChange?.(this.getObjects()); }
        });

        this.socket.on('CURSOR_UPDATE', (data: any) => {
            this.onCursorUpdate?.(data.userId, data.userName, data.position);
        });
    }

    // ── Outgoing ────────────────────────────────────────────────────────

    emitAddObject(type: SceneObject['type'], position: [number, number, number], color: string) {
        this.socket.emit('OBJECT_ADD', { type, position, color });
    }

    /**
     * Delta-compressed transform: only sends position/rotation/scale fields
     * that have changed beyond TRANSFORM_EPSILON since the last emit.
     */
    emitTransform(id: string, transform: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>>) {
        const last = this.lastSentTransform.get(id);
        const delta: any = { id };
        let hasChanges = false;

        const vecChanged = (a: number[] | undefined, b: number[] | undefined) => {
            if (!a || !b) return true;
            return a.some((v, i) => Math.abs(v - b[i]) > TRANSFORM_EPSILON);
        };

        if (transform.position && vecChanged(transform.position, last?.position)) {
            delta.position = transform.position;
            hasChanges = true;
        }
        if (transform.rotation && vecChanged(transform.rotation, last?.rotation)) {
            delta.rotation = transform.rotation;
            hasChanges = true;
        }
        if (transform.scale && vecChanged(transform.scale, last?.scale)) {
            delta.scale = transform.scale;
            hasChanges = true;
        }

        if (!hasChanges) return; // Skip if nothing meaningful changed

        this.socket.emit('OBJECT_TRANSFORM', delta);
        this.lastSentTransform.set(id, {
            position: transform.position ?? last?.position ?? [0, 0, 0],
            rotation: transform.rotation ?? last?.rotation ?? [0, 0, 0],
            scale: transform.scale ?? last?.scale ?? [1, 1, 1],
        });
    }

    emitDelete(id: string) {
        this.socket.emit('OBJECT_DELETE', { id });
        this.lastSentTransform.delete(id);
    }

    emitLock(id: string) { this.socket.emit('OBJECT_LOCK', { id }); }
    emitUnlock(id: string) { this.socket.emit('OBJECT_UNLOCK', { id }); }

    emitCursor(position: [number, number, number]) {
        const now = Date.now();
        if (now - this.lastCursorEmit < CURSOR_THROTTLE_MS) return;
        this.lastCursorEmit = now;
        this.socket.emit('CURSOR_MOVE', { position });
    }

    // ── Local state ──────────────────────────────────────────────────────

    addLocalObject(obj: SceneObject) {
        this.objects.set(obj.id, obj);
        this.onSceneChange?.(this.getObjects());
    }

    getObjects(): SceneObject[] { return Array.from(this.objects.values()); }
    getObject(id: string): SceneObject | undefined { return this.objects.get(id); }

    /** Release all references — call when component unmounts. */
    dispose() {
        this.objects.clear();
        this.lastSentTransform.clear();
        this.onSceneChange = undefined;
        this.onCursorUpdate = undefined;
    }
}
