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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setIsConverting(true);
        try {
            console.log('[PDF] Starting conversion for:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                useWorkerFetch: true,
                isEvalSupported: false,
            });

            const pdf = await loadingTask.promise;
            console.log('[PDF] Document loaded, pages:', pdf.numPages);
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
                console.log(`[PDF] Rendered page ${i}/${pdf.numPages}`);
            }

            setCurrentSlides(newSlides);
            if (presentationMode) {
                arSceneRef.current?.startPresentationMode(newSlides);
                if (socketInstance) {
                    socketInstance.emit('PRESENTATION_STARTED', { slides: newSlides });
                }
            }
            console.log('[PDF] Conversion complete');
        } catch (error: any) {
            console.error('PDF Conversion error details:', error);
            alert(`Failed to process PDF: ${error.message || 'Unknown error'}`);
        } finally {
            setIsConverting(false);
        }
    };

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
