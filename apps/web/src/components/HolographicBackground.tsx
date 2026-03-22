import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const pseudoRandom = (index: number, salt: number): number => {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

const HolographicBackground: React.FC = () => {
    // Generate static shapes once to avoid re-renders
    const particles = useMemo(() =>
        Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            size: pseudoRandom(i, 1) * 100 + 50,
            x: pseudoRandom(i, 2) * 100,
            y: pseudoRandom(i, 3) * 100,
            duration: pseudoRandom(i, 4) * 20 + 20,
            delay: pseudoRandom(i, 5) * -20,
        })), []);

    return (
        <div className="holographic-bg-container">
            {/* Base Gradient */}
            <div className="absolute inset-0 bg-[#fdfbff]" />

            {/* Glowing Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-100/40 blur-[120px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-100/30 blur-[140px]" />
            </div>

            {/* Animated Grid */}
            <div className="holographic-grid" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="absolute rounded-full border border-purple-200/40 bg-purple-50/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        style={{
                            width: p.size,
                            height: p.size,
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                        }}
                        animate={{
                            y: [0, -100, 0],
                            x: [0, 30, 0],
                            rotate: [0, 180, 360],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            {/* Overlay Scanlines (Subtle) */}
            <div className="holographic-scanlines" />
        </div>
    );
};

export default React.memo(HolographicBackground);
