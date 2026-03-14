import React, { useState } from 'react';
import { X, Youtube, Monitor, Link as LinkIcon, Lock } from 'lucide-react';

interface MediaPanelProps {
    onClose: () => void;
    onShareScreen?: () => void;
    onPlayVideo?: (url: string) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({ onClose, onShareScreen, onPlayVideo }) => {
    const [activeTab, setActiveTab] = useState<'video' | 'screen'>('video');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handlePlay = () => {
        const normalized = url.trim();
        if (!normalized) {
            setError('Please enter a media URL.');
            return;
        }
        try {
            const parsed = new URL(normalized);
            if (!/^https?:$/i.test(parsed.protocol)) throw new Error('invalid');
        } catch {
            setError('Please enter a valid http/https URL.');
            return;
        }
        setError('');
        onPlayVideo?.(normalized);
    };

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[400px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    Media Hub
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors border border-transparent">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 p-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2
                        ${activeTab === 'video' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                    <Youtube className="w-4 h-4" />
                    Video URL
                </button>
                <button
                    onClick={() => setActiveTab('screen')}
                    className={`flex-1 p-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2
                        ${activeTab === 'screen' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                    <Monitor className="w-4 h-4" />
                    Share Screen
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white relative">

                {activeTab === 'video' && (
                    <div className="flex flex-col gap-6 relative z-10">
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-primary font-semibold text-sm mb-1 flex items-center gap-2">
                                Broadcast Video
                            </h3>
                            <p className="text-gray-600 text-sm">Input a YouTube URL to broadcast synchronously to all attendees.</p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">Video Link</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-3 text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-400 shadow-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                                <button
                                    onClick={handlePlay}
                                    className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-5 rounded-xl transition-all shadow-sm shrink-0"
                                >
                                    Play
                                </button>
                            </div>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                        </div>

                        {/* Recent/Suggested */}
                        <div className="flex flex-col gap-3 mt-4">
                            <label className="text-sm font-medium text-gray-700">Suggested Media</label>
                            <button className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group shadow-sm">
                                <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
                                    <Youtube className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-gray-900 font-semibold group-hover:text-primary transition-colors">Intro to Neural Anatomy</div>
                                    <div className="text-gray-500 text-xs font-medium mt-0.5">10:24 • Educational Channel</div>
                                </div>
                            </button>
                            <button className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group shadow-sm">
                                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                    <Youtube className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-gray-900 font-semibold group-hover:text-primary transition-colors">Skeletal Structure 3D Map</div>
                                    <div className="text-gray-500 text-xs font-medium mt-0.5">05:12 • Biology Today</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'screen' && (
                    <div className="flex flex-col gap-4 h-full items-center justify-center text-center relative z-10 py-10">
                        <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-4 relative">
                            <Monitor className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-lg">Present to Meeting</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">
                            Share your screen, window, or tab with all attendees.
                        </p>

                        <button
                            onClick={onShareScreen}
                            className="mt-6 bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 px-8 rounded-full flex items-center justify-center gap-2 transition-all shadow-md"
                        >
                            <Monitor className="w-5 h-5" />
                            Share Screen
                        </button>

                        <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
                            <Lock className="w-3.5 h-3.5" />
                            Secure Connection
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
