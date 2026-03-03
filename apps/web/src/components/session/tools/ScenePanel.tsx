import React from 'react';
import { X, Eye, EyeOff, RotateCcw, Upload, Box, Trash2 } from 'lucide-react';

interface ScenePanelProps {
    onClose: () => void;
    modelLoaded: boolean;
    modelVisible: boolean;
    onToggleModel: () => void;
    onDeleteModel: () => void;
    onUpload: () => void;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({
    onClose,
    modelLoaded,
    modelVisible,
    onToggleModel,
    onDeleteModel,
    onUpload,
}) => {
    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    3D Scene
                </h2>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col gap-5">
                {!modelLoaded ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <Box className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-gray-900 font-semibold text-base">No Model Loaded</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-xs">
                                Upload a GLB or GLTF file to display a 3D model in your session.
                            </p>
                        </div>
                        <button
                            onClick={onUpload}
                            className="mt-2 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-md"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Model
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Status */}
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Box className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-green-800 font-semibold text-sm">Model Active</div>
                                <div className="text-green-600 text-xs">3D model is loaded in the scene</div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-3">
                            <h3 className="text-gray-700 font-semibold text-sm">Scene Controls</h3>

                            <button
                                onClick={onToggleModel}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all shadow-sm
                                    ${modelVisible
                                        ? 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        : 'bg-primary/5 border-primary/30 text-primary'
                                    }`}
                            >
                                {modelVisible ? <Eye className="w-5 h-5 text-gray-600" /> : <EyeOff className="w-5 h-5 text-primary" />}
                                <div className="text-left">
                                    <div className="text-gray-800 font-medium text-sm">
                                        {modelVisible ? 'Hide Model' : 'Show Model'}
                                    </div>
                                    <div className="text-gray-400 text-xs">Toggle 3D model visibility</div>
                                </div>
                            </button>

                            <button
                                onClick={onUpload}
                                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm bg-white"
                            >
                                <Upload className="w-5 h-5 text-gray-600" />
                                <div className="text-left">
                                    <div className="text-gray-800 font-medium text-sm">Replace Model</div>
                                    <div className="text-gray-400 text-xs">Upload a new GLB / GLTF file</div>
                                </div>
                            </button>

                            <button
                                onClick={onDeleteModel}
                                className="flex items-center gap-3 p-4 rounded-xl border border-red-100 hover:bg-red-50 transition-all shadow-sm bg-white"
                            >
                                <Trash2 className="w-5 h-5 text-red-500" />
                                <div className="text-left">
                                    <div className="text-red-600 font-medium text-sm">Remove Model</div>
                                    <div className="text-red-400 text-xs">Clear the 3D scene</div>
                                </div>
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mt-2">
                            <h4 className="text-primary font-semibold text-sm mb-2 flex items-center gap-2">
                                <RotateCcw className="w-3.5 h-3.5" />
                                Gesture Controls
                            </h4>
                            <div className="flex flex-col gap-1.5">
                                {[
                                    ['✊', 'Fist to reset position'],
                                    ['☝️', 'Point to move model'],
                                    ['🤏', 'Pinch to zoom'],
                                    ['🖐️', 'Open hand to rotate'],
                                ].map(([emoji, tip]) => (
                                    <div key={tip} className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>{emoji}</span>
                                        <span>{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
