/**
 * useScene.ts
 * React hook providing scene object state and collaborative scene management.
 * Bridges SceneSync ↔ React state for real-time multi-user 3D scene editing.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SceneSync } from '../3d/SceneSync';
import type { SceneObject } from '../3d/SceneSync';
import { SocketManager } from '../realtime/SocketManager';

export interface CursorInfo {
    userId: string;
    userName: string;
    position: [number, number, number];
}

export function useScene(socket: SocketManager | null) {
    const syncRef = useRef<SceneSync | null>(null);
    const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
    const [remoteCursors, setRemoteCursors] = useState<CursorInfo[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Initialize SceneSync when socket is available
    useEffect(() => {
        if (!socket) return;

        try {
            const sync = new SceneSync(socket);
            syncRef.current = sync;

            sync.setOnSceneChange((objects) => {
                setSceneObjects([...objects]);
            });

            sync.setOnCursorUpdate((userId, userName, position) => {
                setRemoteCursors(prev => {
                    const without = prev.filter(c => c.userId !== userId);
                    return [...without, { userId, userName, position }];
                });
                // Auto-remove cursor after 3s of inactivity
                setTimeout(() => {
                    setRemoteCursors(prev => prev.filter(c => c.userId !== userId));
                }, 3000);
            });
        } catch (error) {
            console.error('Failed to initialize SceneSync:', error);
        }

        return () => {
            syncRef.current = null;
        };
    }, [socket]);

    // ── Scene mutation actions ─────────────────────────────────────────────

    const addObject = useCallback((
        type: SceneObject['type'],
        color = '#6366f1',
        position: [number, number, number] = [
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            0
        ]
    ) => {
        syncRef.current?.emitAddObject(type, position, color);
    }, []);

    const deleteObject = useCallback((id: string) => {
        syncRef.current?.emitDelete(id);
        setSelectedId(prev => prev === id ? null : prev);
    }, []);

    const lockObject = useCallback((id: string) => {
        syncRef.current?.emitLock(id);
    }, []);

    const unlockObject = useCallback((id: string) => {
        syncRef.current?.emitUnlock(id);
    }, []);

    const transformObject = useCallback((
        id: string,
        transform: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>>
    ) => {
        syncRef.current?.emitTransform(id, transform);
    }, []);

    const moveCursor = useCallback((position: [number, number, number]) => {
        syncRef.current?.emitCursor(position);
    }, []);

    const selectObject = useCallback((id: string | null) => {
        setSelectedId(id);
    }, []);

    return {
        sceneObjects,
        remoteCursors,
        selectedId,
        addObject,
        deleteObject,
        lockObject,
        unlockObject,
        transformObject,
        moveCursor,
        selectObject,
        sceneSync: syncRef,
    };
}
