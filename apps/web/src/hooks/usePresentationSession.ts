import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { ARScene, SlideData } from '../three/ARScene';
import { SocketManager } from '../realtime/SocketManager';

interface UsePresentationSessionProps {
    arSceneRef: MutableRefObject<ARScene | null>;
    socketInstance: SocketManager | null;
    isHost: boolean;
}

export const usePresentationSession = ({
    arSceneRef,
    socketInstance,
    isHost
}: UsePresentationSessionProps) => {
    const [presentationMode, setPresentationMode] = useState(false);
    const [currentSlides, setCurrentSlides] = useState<SlideData[]>([
        { title: 'Introduction', body: "Welcome to today's lesson. We will explore the topic using 3D interactive models." },
        { title: 'Key Concepts', body: 'Observe the 3D model carefully. Notice the structure, orientation, and components.' },
        { title: 'Discussion', body: 'How does this structure relate to what we studied previously? Share your observations.' },
    ]);
    const [isConverting, setIsConverting] = useState(false);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file || file.type !== 'application/pdf') return;

        setIsConverting(true);
        try {
            console.log('[Presentation] Starting conversion for:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                isEvalSupported: false,
            });

            const pdf = await loadingTask.promise;
            console.log('[Presentation] PDF loaded, pages:', pdf.numPages);
            const newSlides: SlideData[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport } as any).promise;
                newSlides.push({
                    title: `Page ${i}`,
                    body: `Visual content from ${file.name}`,
                    imageUrl: canvas.toDataURL('image/jpeg', 0.8)
                });
            }

            setCurrentSlides(newSlides);
            setPresentationMode(true);
            
            // Broadcast to participants
            if (socketInstance) {
                socketInstance.emit('PRESENTATION_STARTED', { slides: newSlides });
            }
            console.log('[Presentation] Conversion complete and mode enabled');
        } catch (error: any) {
            console.error('PDF Conversion error:', error);
            alert(`Failed to process PDF: ${error.message || 'Unknown error'}`);
        } finally {
            setIsConverting(false);
        }
    }, [socketInstance]);

    // ── Effect: Sync Presentation Mode with ARScene ───────────────────────
    useEffect(() => {
        const scene = arSceneRef.current;
        if (!scene) return;

        if (presentationMode) {
            console.log('[Presentation] Initializing 3D presentation mode with', currentSlides.length, 'slides');
            scene.startPresentationMode(currentSlides);
            
            // If host toggles manually without upload, broadcast the default/current slides
            if (isHost && socketInstance) {
                socketInstance.emit('PRESENTATION_STARTED', { slides: currentSlides });
            }
        } else {
            console.log('[Presentation] Stopping 3D presentation mode');
            scene.stopPresentationMode();
            
            if (isHost && socketInstance) {
                socketInstance.emit('PRESENTATION_STOPPED', {});
            }
        }
    }, [presentationMode, arSceneRef, currentSlides, socketInstance, isHost]);

    const nextSlide = useCallback(() => {
        if (!presentationMode || !arSceneRef.current || !isHost) return;
        arSceneRef.current.nextSlide();
        if (socketInstance) {
            socketInstance.emit('SLIDE_CHANGED', { direction: 'next' });
        }
    }, [presentationMode, arSceneRef, socketInstance, isHost]);

    const prevSlide = useCallback(() => {
        if (!presentationMode || !arSceneRef.current || !isHost) return;
        arSceneRef.current.prevSlide();
        if (socketInstance) {
            socketInstance.emit('SLIDE_CHANGED', { direction: 'prev' });
        }
    }, [presentationMode, arSceneRef, socketInstance, isHost]);

    useEffect(() => {
        if (!presentationMode) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [presentationMode, nextSlide, prevSlide]);

    return {
        presentationMode,
        setPresentationMode,
        currentSlides,
        setCurrentSlides,
        isConverting,
        handleFileUpload,
        nextSlide,
        prevSlide
    };
};
