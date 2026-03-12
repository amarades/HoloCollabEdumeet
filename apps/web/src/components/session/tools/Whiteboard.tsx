import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, X, Box, Circle, Triangle, Type, MousePointer2, Sparkles, Plus } from 'lucide-react';

interface WhiteboardProps {
    onClose: () => void;
    socket: any;
    user: any;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ onClose, socket, user }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#6366f1'); // Primary indigo
    const [brushSize, setBrushSize] = useState(4);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'text' | 'select'>('pen');
    const [showShapes, setShowShapes] = useState(false);
    const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
    const [currentText, setCurrentText] = useState('');
    const strokePoints = useRef<{ x: number, y: number }[]>([]);

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Initialize Canvas (only once)
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSize;
            ctxRef.current = ctx;
        }

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;

                if (ctxRef.current) {
                    ctxRef.current.lineCap = 'round';
                    ctxRef.current.lineJoin = 'round';
                    ctxRef.current.strokeStyle = color;
                    ctxRef.current.lineWidth = brushSize;
                    ctxRef.current.drawImage(tempCanvas, 0, 0);
                }
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Bind socket listener separately so it re-runs when socket changes
    useEffect(() => {
        if (!socket) return;

        const handleRemoteDraw = (data: any) => {
            // data could be wrapped: { event, payload } or flat
            const d = data.payload || data;
            
            // Ignore own events echoed back from server
            const localUserId = socket.getUserId ? socket.getUserId() : null;
            if (d.senderId === localUserId || (d.user && d.user === user?.email)) return;
            if (!ctxRef.current) return;

            if (d.type === 'text') {
                ctxRef.current.font = `${d.fontSize}px Inter, sans-serif`;
                ctxRef.current.fillStyle = d.color;
                ctxRef.current.fillText(d.text, d.x, d.y);
                return;
            }

            const { x0, y0, x1, y1, color: strokeColor, width } = d;
            const prevStyle = ctxRef.current.strokeStyle;
            const prevWidth = ctxRef.current.lineWidth;
            const prevComposite = ctxRef.current.globalCompositeOperation;

            ctxRef.current.beginPath();
            ctxRef.current.moveTo(x0, y0);
            ctxRef.current.lineTo(x1, y1);
            ctxRef.current.strokeStyle = strokeColor === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor;
            ctxRef.current.lineWidth = width;
            ctxRef.current.globalCompositeOperation = strokeColor === 'eraser' ? 'destination-out' : 'source-over';
            ctxRef.current.stroke();

            ctxRef.current.strokeStyle = prevStyle;
            ctxRef.current.lineWidth = prevWidth;
            ctxRef.current.globalCompositeOperation = prevComposite;
        };

        const handleClear = () => {
            if (ctxRef.current && canvasRef.current) {
                ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };

        // Both stroke and clear sync
        const unsubDraw = socket.on('DRAW_STROKE', handleRemoteDraw);
        const unsubClear = socket.on('WHITEBOARD_CLEAR', handleClear);

        return () => {
            unsubDraw();
            unsubClear();
        };
    }, [socket, user]);

    useEffect(() => {
        if (!ctxRef.current) return;
        ctxRef.current.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : color;
        ctxRef.current.lineWidth = brushSize;
        ctxRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    }, [color, brushSize, tool]);

    const lastPos = useRef<{ x: number, y: number } | null>(null);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!ctxRef.current || !canvasRef.current) return;
        const { offsetX, offsetY } = getCoordinates(e);

        if (tool === 'text') {
            setTextInput({ x: offsetX, y: offsetY });
            return;
        }

        lastPos.current = { x: offsetX, y: offsetY };
        strokePoints.current = [{ x: offsetX, y: offsetY }];
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !ctxRef.current || !canvasRef.current || !lastPos.current) return;

        const { offsetX, offsetY } = getCoordinates(e);

        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        strokePoints.current.push({ x: offsetX, y: offsetY });

        if (socket) {
            socket.emit('DRAW_STROKE', {
                x0: lastPos.current.x,
                y0: lastPos.current.y,
                x1: offsetX,
                y1: offsetY,
                color: tool === 'eraser' ? 'eraser' : color,
                width: brushSize,
                user: user?.email,
                senderId: socket.getUserId ? socket.getUserId() : null
            });
        }

        lastPos.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!ctxRef.current) return;
        ctxRef.current.closePath();
        setIsDrawing(false);
        lastPos.current = null;

        // Feature 11: Simple Shape Detection
        if (strokePoints.current.length > 20 && tool === 'pen') {
            const points = strokePoints.current;
            const xMin = Math.min(...points.map(p => p.x));
            const xMax = Math.max(...points.map(p => p.x));
            const yMin = Math.min(...points.map(p => p.y));
            const yMax = Math.max(...points.map(p => p.y));
            const width = xMax - xMin;
            const height = yMax - yMin;
            const ratio = width / height;

            // Check if start and end are close
            const start = points[0];
            const end = points[points.length - 1];
            const dist = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);

            if (dist < 80 && ratio > 0.6 && ratio < 1.4 && width > 40) {
                // Heuristic: Circular vs Boxy
                // Average distance from center vs width/2
                const centerX = (xMin + xMax) / 2;
                const centerY = (yMin + yMax) / 2;
                const idealRadius = (width + height) / 4;
                const variance = points.reduce((acc, p) => acc + Math.abs(Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2) - idealRadius), 0) / points.length;

                if (variance < idealRadius * 0.2) {
                    spawn3DObject('sphere'); // Circle -> Sphere
                } else {
                    spawn3DObject('box');    // Boxy -> Cube
                }
                clearBoard();
            }
        }
        strokePoints.current = [];
    };

    const handleTextSubmit = () => {
        if (!textInput || !currentText.trim() || !ctxRef.current) return;

        ctxRef.current.font = `${brushSize * 4}px Inter, sans-serif`;
        ctxRef.current.fillStyle = color;
        ctxRef.current.fillText(currentText, textInput.x, textInput.y);

        socket?.emit('DRAW_STROKE', {
            type: 'text',
            text: currentText,
            x: textInput.x,
            y: textInput.y,
            color,
            fontSize: brushSize * 4
        });

        setTextInput(null);
        setCurrentText('');
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };

        if ('touches' in e) {
            const rect = canvasRef.current.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                offsetX: e.nativeEvent.offsetX,
                offsetY: e.nativeEvent.offsetY
            };
        }
    };

    const clearBoard = () => {
        if (!ctxRef.current || !canvasRef.current) return;
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket?.emit('WHITEBOARD_CLEAR', {});
    };

    // Feature 5: Spawn 3D Object in the main scene
    const spawn3DObject = (type: string) => {
        if (!socket) return;

        // Random position in front of user
        const position = [
            (Math.random() - 0.5) * 2,
            1,
            (Math.random() - 0.5) * 2
        ];

        socket.emit('OBJECT_ADD', {
            type,
            position,
            color,
            scale: [0.5, 0.5, 0.5]
        });

        setShowShapes(false);
    };

    return (
        <div className="absolute inset-0 z-40 flex flex-col overflow-hidden animate-in fade-in duration-200" style={{ background: 'transparent' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/30 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-base leading-tight">✏️ Draw on Screen</h2>
                        <p className="text-white/50 text-xs font-medium">Drawing directly over the 3D scene</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={clearBoard} className="p-2.5 bg-white/10 border border-white/20 hover:bg-red-500/30 rounded-xl text-white/70 hover:text-white transition-all group" title="Clear Board">
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <button onClick={onClose} className="p-2.5 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Canvas Area — fully transparent so the 3D scene shows through */}
            <div className="flex-1 relative cursor-crosshair touch-none">
                {/* Faint dot grid for drawing reference */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ mixBlendMode: 'normal', background: 'transparent' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {/* Feature 12: Text Input Overlay */}
                {textInput && (
                    <div
                        className="absolute z-50 animate-in fade-in duration-200"
                        style={{ left: textInput.x, top: textInput.y }}
                    >
                        <input
                            autoFocus
                            type="text"
                            value={currentText}
                            onChange={(e) => setCurrentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTextSubmit();
                                if (e.key === 'Escape') setTextInput(null);
                            }}
                            onBlur={handleTextSubmit}
                            className="bg-white/90 border-2 border-primary rounded-lg px-2 py-1 text-sm focus:outline-none shadow-xl min-w-[100px]"
                            placeholder="Type..."
                            style={{ color, fontSize: brushSize * 2 }}
                        />
                    </div>
                )}

                {/* Left Side: Tool Selector */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 p-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
                    <button
                        onClick={() => setTool('pen')}
                        className={`p-3 rounded-xl transition-all ${tool === 'pen' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/60 hover:bg-white/20 hover:text-white'}`}
                        title="Pen Tool"
                    >
                        <MousePointer2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setTool('text')}
                        className={`p-3 rounded-xl transition-all ${tool === 'text' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/60 hover:bg-white/20 hover:text-white'}`}
                        title="Text Tool (Click to type)"
                    >
                        <Type className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-3 rounded-xl transition-all ${tool === 'eraser' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/60 hover:bg-white/20 hover:text-white'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>

                    <div className="h-px bg-white/20 mx-2" />

                    {/* Feature 5: Shape Spawner */}
                    <div className="relative">
                        <button
                            onClick={() => setShowShapes(!showShapes)}
                            className="p-3 rounded-xl text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                            title="Spawn 3D Object"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {showShapes && (
                            <div className="absolute left-full ml-3 top-0 flex flex-col gap-2 p-2 bg-white border border-gray-200 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-left-2">
                                <button onClick={() => spawn3DObject('box')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                                    <Box className="w-4 h-4 text-primary" /> Cube
                                </button>
                                <button onClick={() => spawn3DObject('sphere')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                                    <Circle className="w-4 h-4 text-blue-500" /> Sphere
                                </button>
                                <button onClick={() => spawn3DObject('cone')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                                    <Triangle className="w-4 h-4 text-amber-500" /> Pyramid
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-md flex items-center justify-center gap-6">
                {/* Colors */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                    {['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9', '#000000'].map(c => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); setTool('pen'); }}
                            className={`w-7 h-7 rounded-full transition-all duration-200 border-2 ${color === c ? 'scale-110 border-white ring-2 ring-primary shadow-md' : 'border-transparent hover:scale-105 opacity-80'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Size Slider */}
                <div className="flex items-center gap-4 bg-white/10 px-5 py-2.5 rounded-2xl border border-white/20 min-w-[180px]">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Size</span>
                    <input
                        type="range"
                        min="2"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="flex-1 accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div
                        className="rounded-full bg-primary flex-shrink-0"
                        style={{ width: Math.max(4, brushSize / 2), height: Math.max(4, brushSize / 2) }}
                    />
                </div>
            </div>
        </div>
    );
};
