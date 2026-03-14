import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { ARScene, SlideData } from '../three/ARScene';
import { SocketManager } from '../realtime/SocketManager';

interface Params {
  socketRef: MutableRefObject<SocketManager | null>;
  socketInstance: SocketManager | null;
  arSceneRef: MutableRefObject<ARScene | null>;
  isHost: boolean;
  currentSlides: SlideData[];
  setCurrentSlides: Dispatch<SetStateAction<SlideData[]>>;
  setPresentationMode: Dispatch<SetStateAction<boolean>>;
  setEngagementMap: Dispatch<SetStateAction<Record<string, number>>>;
  setVisualFilter: Dispatch<SetStateAction<'realistic' | 'blue_glow' | 'red_glow'>>;
  setAutoOscillate: Dispatch<SetStateAction<boolean>>;
}

export function useSessionRealtimeListeners({
  socketRef,
  socketInstance,
  arSceneRef,
  isHost,
  currentSlides,
  setCurrentSlides,
  setPresentationMode,
  setEngagementMap,
  setVisualFilter,
  setAutoOscillate,
}: Params) {
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const unsubTopic = socket.on('TOPIC_DETECTED', () => {
      // Topic detection handled via AI workflows and host notifications.
    });
    const unsubEngagement = socket.on('ENGAGEMENT_UPDATE', (data: any) => {
      setEngagementMap((prev) => ({ ...prev, [data.userId]: data.score }));
    });
    const unsubSlide = socket.on('SLIDE_CHANGED', (data: any) => {
      if (!isHost) {
        if (data.direction === 'next') arSceneRef.current?.nextSlide();
        else arSceneRef.current?.prevSlide();
      }
    });

    const unsubModelUpdate = socket.on('MODEL_UPDATE', (data: any) => {
      const state = data.state;
      if (!isHost && state) {
        if (state.visual_filter) setVisualFilter(state.visual_filter);
        if (state.auto_oscillate !== undefined) setAutoOscillate(state.auto_oscillate);
      }
    });

    const unsubPresentationStart = socket.on('PRESENTATION_STARTED', (data: any) => {
      if (!isHost) {
        const slidesToUse = data.slides || currentSlides;
        setCurrentSlides(slidesToUse);
        arSceneRef.current?.startPresentationMode(slidesToUse);
        setPresentationMode(true);
      }
    });

    const unsubPresentationStop = socket.on('PRESENTATION_STOPPED', () => {
      if (!isHost) {
        arSceneRef.current?.stopPresentationMode();
        setPresentationMode(false);
      }
    });

    return () => {
      unsubTopic();
      unsubEngagement();
      unsubSlide();
      unsubModelUpdate();
      unsubPresentationStart();
      unsubPresentationStop();
    };
  }, [
    socketRef,
    socketInstance,
    arSceneRef,
    isHost,
    currentSlides,
    setCurrentSlides,
    setPresentationMode,
    setEngagementMap,
    setVisualFilter,
    setAutoOscillate,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const unsubScene = socket.on('SCENE_STATE', (data: any) => {
      const objects = data.objects ?? data.payload?.objects ?? [];
      if (arSceneRef.current && objects.length > 0) {
        arSceneRef.current.applySceneState(objects);
      }
    });

    const unsubAdded = socket.on('OBJECT_ADDED', (data: any) => {
      const obj = data.object ?? data.payload ?? data;
      if (arSceneRef.current && obj?.id) {
        arSceneRef.current.addSceneObject(obj);
      }
    });

    const unsubUpdated = socket.on('OBJECT_UPDATED', (data: any) => {
      const obj = data.object ?? data.payload ?? data;
      if (arSceneRef.current && obj?.id) {
        arSceneRef.current.updateSceneObject(obj);
      }
    });

    const unsubDeleted = socket.on('OBJECT_DELETED', (data: any) => {
      const id = data.id ?? data.payload?.id;
      if (arSceneRef.current && id) {
        arSceneRef.current.deleteSceneObject(id);
      }
    });

    return () => {
      unsubScene();
      unsubAdded();
      unsubUpdated();
      unsubDeleted();
    };
  }, [socketRef, socketInstance, arSceneRef]);
}
