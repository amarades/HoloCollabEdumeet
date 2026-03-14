import React, { useEffect, useState } from 'react';
import { Shield, Target, Cpu, Activity, Zap } from 'lucide-react';

interface HolographicOverlayProps {
    active: boolean;
    topic?: string;
    modelName?: string;
}

export const HolographicOverlay: React.FC<HolographicOverlayProps> = ({ active, topic, modelName }) => {
    const [scanPos, setScanPos] = useState(0);

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            setScanPos(prev => (prev + 1) % 100);
        }, 50);
        return () => clearInterval(interval);
    }, [active]);

    if (!active) return null;

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none">
            {/* ── Corners (Tech Frames) ── */}
            <div className="absolute top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-primary/40 rounded-tl-3xl shadow-[0_0_15px_-5px_rgba(124,58,237,0.5)]" />
            <div className="absolute top-8 right-8 w-32 h-32 border-r-2 border-t-2 border-primary/40 rounded-tr-3xl shadow-[0_0_15px_-5px_rgba(124,58,237,0.5)]" />
            <div className="absolute bottom-8 left-8 w-32 h-32 border-l-2 border-b-2 border-primary/40 rounded-bl-3xl shadow-[0_0_15px_-5px_rgba(124,58,237,0.5)]" />
            <div className="absolute bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-primary/40 rounded-br-3xl shadow-[0_0_15px_-5px_rgba(124,58,237,0.5)]" />

            {/* ── Data Streams (Left) ── */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                {[
                    { icon: Activity, label: 'SYNC', value: 'ACTIVE', color: 'text-green-400' },
                    { icon: Target, label: 'LOCK', value: modelName || 'SEARCHING...', color: 'text-primary' },
                    { icon: Cpu, label: 'PROC', value: 'OPTIMAL', color: 'text-blue-400' },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 animate-in slide-in-from-left duration-700 delay-150">
                        <div className="w-10 h-10 rounded-lg bg-black/65 backdrop-blur-md border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex items-center justify-center">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex flex-col drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                            <span className="text-[10px] text-white/85 font-mono uppercase tracking-tighter">{item.label}</span>
                            <span className={`text-xs font-bold font-mono ${item.color}`}>{item.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Top Header Bar ── */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    <span className="text-[10px] text-white/90 font-mono uppercase tracking-[0.2em]">Holographic Link Est.</span>
                </div>
                <div className="w-[2px] h-4 bg-white/10" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-violet-200 font-bold font-mono tracking-widest drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">{topic || 'SYSTEM IDLE'}</span>
                </div>
            </div>

            {/* ── Scanning Line ── */}
            <div 
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_10px_rgba(124,58,237,0.8)]"
                style={{ top: `${scanPos}%`, transition: 'top 0.05s linear' }}
            />

            {/* ── Circular Reticle (Center) ── */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-20">
                <svg className="w-full h-full animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" className="text-primary" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 1" className="text-white" />
                </svg>
            </div>

            {/* ── Status Indicators (Right) ── */}
            <div className="absolute right-10 bottom-12 flex flex-col items-end gap-2 text-right drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2 text-violet-200">
                    <span className="text-[10px] font-mono">ENCRYPTED // CHANNEL 07</span>
                    <Shield className="w-4 h-4" />
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-3 h-1 rounded-full ${i <= 4 ? 'bg-primary' : 'bg-white/10'} shadow-[0_0_5px_rgba(124,58,237,0.5)]`} />
                    ))}
                </div>
            </div>

            {/* ── Vignette/Atmosphere ── */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>
    );
};

