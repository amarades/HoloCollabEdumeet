import React, { useRef } from 'react';
import {
    Pencil,
    MessageSquare,
    MonitorPlay,
    Settings,
    Upload,
    Trash2,
    Box
} from 'lucide-react';

interface SessionSidebarProps {
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
    onModelUpload?: (file: File) => void;
    modelLoaded?: boolean;
    onDeleteModel?: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
    activeTool,
    onSelectTool,
    onModelUpload,
    modelLoaded,
    onDeleteModel
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onModelUpload) {
            onModelUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const tools = [
        { id: 'whiteboard', icon: Pencil, label: 'Whiteboard' },
        { id: 'quiz', icon: MessageSquare, label: 'Quiz / Poll' },
        { id: 'media', icon: MonitorPlay, label: 'Media' },
        { id: '3d', icon: Box, label: '3D Scene' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex flex-col gap-3 z-30 pointer-events-auto">
            {/* Main Tools */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 flex flex-col gap-2 shadow-sm border border-gray-200">
                {tools.map((tool) => {
                    const isActive = activeTool === tool.id;
                    const Icon = tool.icon;

                    return (
                        <button
                            key={tool.id}
                            onClick={() => onSelectTool(isActive ? null : tool.id)}
                            className={`p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center
                                ${isActive
                                    ? 'bg-primary/10 text-primary scale-105 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            title={tool.label}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="absolute right-full mr-4 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                                {tool.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Upload Button */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-gray-200 flex flex-col gap-2">
                <button
                    onClick={handleUploadClick}
                    className="p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center text-primary hover:bg-primary/10 hover:shadow-sm"
                    title="Upload 3D Model"
                >
                    <Upload className="w-5 h-5" />
                    <span className="absolute right-full mr-4 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                        Upload 3D Model
                    </span>
                </button>

                {/* Delete Model button — only visible when a model is loaded */}
                {modelLoaded && (
                    <button
                        onClick={onDeleteModel}
                        className="p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center text-red-500 hover:bg-red-50 hover:shadow-sm"
                        title="Remove 3D Model"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="absolute right-full mr-4 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                            Remove Model
                        </span>
                    </button>
                )}

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>
        </div>
    );
};
