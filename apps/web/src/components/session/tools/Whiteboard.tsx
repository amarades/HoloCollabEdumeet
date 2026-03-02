import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, X } from 'lucide-react';

interface WhiteboardProps {
    onClose: () => void;
    socket: any;
    user: any;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ onClose, socket, user }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#1a1a1a'); // Default to dark gray instead of white
    const [brushSize, setBrushSize] = useState(4);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Initialize Canvas
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

        if (socket) {
            socket.onDraw = (data: any) => {
                if (data.user === user.email) return;

                if (!ctxRef.current) return;

                const { x0, y0, x1, y1, color: strokeColor, width } = data;

                const prevStyle = ctxRef.current.strokeStyle;
                const prevWidth = ctxRef.current.lineWidth;
                const prevComposite = ctxRef.current.globalCompositeOperation;

                ctxRef.current.beginPath();
                ctxRef.current.moveTo(x0, y0);
                ctxRef.current.lineTo(x1, y1);
                ctxRef.current.strokeStyle = strokeColor;
                ctxRef.current.lineWidth = width;
                if (strokeColor === 'eraser') {
                    ctxRef.current.globalCompositeOperation = 'destination-out';
                    ctxRef.current.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    ctxRef.current.globalCompositeOperation = 'source-over';
                }
                ctxRef.current.stroke();

                ctxRef.current.strokeStyle = prevStyle;
                ctxRef.current.lineWidth = prevWidth;
                ctxRef.current.globalCompositeOperation = prevComposite;
            };
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (socket) socket.onDraw = null;
        };
    }, []);

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
        lastPos.current = { x: offsetX, y: offsetY };
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !ctxRef.current || !canvasRef.current || !lastPos.current) return;

        const { offsetX, offsetY } = getCoordinates(e);

        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        if (socket) {
            socket.emit('DRAW_STROKE', {
                x0: lastPos.current.x,
                y0: lastPos.current.y,
                x1: offsetX,
                y1: offsetY,
                color: tool === 'eraser' ? 'eraser' : color,
                width: brushSize,
                user: user.email
            });
        }

        lastPos.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        if (!ctxRef.current) return;
        ctxRef.current.closePath();
        setIsDrawing(false);
        lastPos.current = null;
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
    };

    return (
        <div className="absolute inset-4 md:inset-10 bg-white border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    Whiteboard
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={clearBoard} className="p-2 bg-white border border-gray-200 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors shadow-sm" title="Clear Board">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 border border-transparent hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-white cursor-crosshair touch-none">
                {/* Subtle Grid Background */}
                <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#f0f0f0 1px, transparent 1px), linear-gradient(90deg, #f0f0f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full mix-blend-multiply"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Toolbar */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 backdrop-blur-md flex items-center justify-center gap-6">

                {/* Colors */}
                <div className="flex items-center gap-3 bg-white border border-gray-200 p-2.5 rounded-full shadow-sm">
                    {['#1a1a1a', '#e8332a', '#2563eb', '#16a34a', '#d946ef'].map(c => (
                        <button
                            key={c}
                            onClick={() => { setColor(c); setTool('pen'); }}
                            className={`w-8 h-8 rounded-full transition-all duration-200 ${color === c && tool === 'pen' ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105 opacity-80 hover:opacity-100 border border-gray-300'}`}
                            style={{ backgroundColor: c }}
                            title="Pen Color"
                        />
                    ))}
                </div>

                <div className="w-px h-8 bg-gray-300"></div>

                {/* Tools */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-3 rounded-full transition-all border shadow-sm ${tool === 'eraser' ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-full border border-gray-200 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                        <input
                            type="range"
                            min="2"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-24 accent-primary"
                            title="Brush Size"
                        />
                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
