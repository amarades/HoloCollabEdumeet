import React, { useState } from 'react';
import { X, Eye, EyeOff, RotateCcw, Upload, Box, Trash2, Plus, Circle, Cylinder, Lock, Sparkles, MoveHorizontal, Palette, BookmarkPlus } from 'lucide-react';
import type { SceneObject } from '../../../3d/SceneSync';

interface ScenePanelProps {
    onClose: () => void;
    modelLoaded: boolean;
    modelVisible: boolean;
    onToggleModel: () => void;
    onDeleteModel: () => void;
    onUpload: () => void;
    // Scene sync props
    sceneObjects?: SceneObject[];
    onAddObject?: (type: SceneObject['type'], color: string) => void;
    onDeleteObject?: (id: string) => void;
    onSelectObject?: (id: string | null) => void;
    selectedObjectId?: string | null;
    // Visual & Motion props
    visualFilter?: 'realistic' | 'blue_glow' | 'red_glow';
    onSetVisualFilter?: (filter: 'realistic' | 'blue_glow' | 'red_glow') => void;
    autoOscillate?: boolean;
    onSetAutoOscillate?: (enabled: boolean) => void;
    onSelectLibraryModel?: (url: string, name: string) => void;
    onAddToLibrary?: () => void;
    libraryModels?: any[];
    isHost?: boolean;
}

const SHAPE_COLORS = [
    '#6366f1', '#ef4444', '#22c55e', '#f59e0b',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
];

export const ScenePanel: React.FC<ScenePanelProps> = ({
    onClose,
    modelLoaded,
    modelVisible,
    onToggleModel,
    onDeleteModel,
    onUpload,
    sceneObjects = [],
    onAddObject,
    onDeleteObject,
    onSelectObject,
    selectedObjectId,
    visualFilter = 'blue_glow',
    onSetVisualFilter,
    autoOscillate = true,
    onSetAutoOscillate,
    onSelectLibraryModel,
    onAddToLibrary,
    libraryModels = [],
    isHost = false,
}) => {
    const [selectedColor, setSelectedColor] = useState('#6366f1');
    const [activeTab, setActiveTab] = useState<'objects' | 'model' | 'library'>('objects');

    const getShapeIcon = (type: SceneObject['type']) => {
        switch (type) {
            case 'sphere': return <Circle className="w-4 h-4" />;
            case 'cylinder': return <Cylinder className="w-4 h-4" />;
            default: return <Box className="w-4 h-4" />;
        }
    };

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    3D Scene
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
                {(['objects', 'model', 'library'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize
                            ${activeTab === tab
                                ? 'text-primary border-b-2 border-primary bg-primary/5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'objects' ? `Objects (${sceneObjects.length})` : tab === 'model' ? '3D Model' : 'Library'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">

                {/* ── Objects Tab ── */}
                {activeTab === 'objects' && (
                    <div className="p-4 flex flex-col gap-4">
                        {/* Spawn shapes */}
                        <div>
                            <h3 className="text-gray-700 font-semibold text-sm mb-3">Add Shape</h3>

                            {/* Color picker */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {SHAPE_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-7 h-7 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                ))}
                            </div>

                            {/* Shape buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { type: 'box' as const, Icon: Box, label: 'Cube' },
                                    { type: 'sphere' as const, Icon: Circle, label: 'Sphere' },
                                    { type: 'cylinder' as const, Icon: Cylinder, label: 'Cylinder' },
                                ] as { type: SceneObject['type'], Icon: any, label: string }[]).map(({ type, Icon, label }) => (
                                    <button
                                        key={type}
                                        onClick={() => onAddObject?.(type, selectedColor)}
                                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                    >
                                        <Icon className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                                        <span className="text-xs text-gray-600 font-medium group-hover:text-primary">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scene object list */}
                        {sceneObjects.length > 0 && (
                            <div>
                                <h3 className="text-gray-700 font-semibold text-sm mb-2">Scene Objects</h3>
                                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                                    {sceneObjects.map(obj => (
                                        <div
                                            key={obj.id}
                                            onClick={() => onSelectObject?.(selectedObjectId === obj.id ? null : obj.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all
                                                ${selectedObjectId === obj.id
                                                    ? 'border-primary/40 bg-primary/5'
                                                    : 'border-gray-100 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: obj.color + '30' }}
                                            >
                                                <span style={{ color: obj.color }}>{getShapeIcon(obj.type)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-gray-800 text-xs font-medium capitalize">{obj.type}</div>
                                                <div className="text-gray-400 text-xs font-mono truncate">
                                                    [{obj.position.map(v => v.toFixed(1)).join(', ')}]
                                                </div>
                                            </div>
                                            {obj.lockedBy && (
                                                <span title="Locked" className="flex-shrink-0 flex items-center justify-center">
                                                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteObject?.(obj.id); }}
                                                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Delete object"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sceneObjects.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-6">
                                No objects yet — spawn a shape above!
                            </p>
                        )}
                    </div>
                )}

                {/* ── Model Tab ── */}
                {activeTab === 'model' && (
                    <div className="p-4 flex flex-col gap-4">
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
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <Box className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-green-800 font-semibold text-sm">Model Active</div>
                                        <div className="text-green-600 text-xs">3D model is loaded in the scene</div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
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
                                            <div className="text-gray-800 font-medium text-sm">{modelVisible ? 'Hide Model' : 'Show Model'}</div>
                                            <div className="text-gray-400 text-xs">Toggle 3D model visibility</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={onUpload}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all bg-white"
                                    >
                                        <Upload className="w-5 h-5 text-gray-600" />
                                        <div className="text-left">
                                            <div className="text-gray-800 font-medium text-sm">Replace Model</div>
                                            <div className="text-gray-400 text-xs">Upload a new GLB / GLTF file</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={onAddToLibrary}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all bg-white text-primary"
                                    >
                                        <BookmarkPlus className="w-5 h-5" />
                                        <div className="text-left">
                                            <div className="font-medium text-sm">Add to Library</div>
                                            <div className="text-primary/60 text-xs">Save this model for future use</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={onDeleteModel}
                                        className="flex items-center gap-3 p-4 rounded-xl border border-red-100 hover:bg-red-50 transition-all bg-white"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                        <div className="text-left">
                                            <div className="text-red-600 font-medium text-sm">Remove Model</div>
                                            <div className="text-red-400 text-xs">Clear the 3D scene</div>
                                        </div>
                                    </button>
                                </div>

                                {/* Visual Filters */}
                                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                    <h3 className="text-gray-700 font-semibold text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
                                        <Palette className="w-3.5 h-3.5 text-primary" />
                                        Visual Filters
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'realistic', label: 'Realistic', color: 'bg-gray-400' },
                                            { id: 'blue_glow', label: 'Blue Glow', color: 'bg-blue-500' },
                                            { id: 'red_glow', label: 'Red Glow', color: 'bg-red-500' },
                                        ].map((filter) => (
                                            <button
                                                key={filter.id}
                                                onClick={() => onSetVisualFilter?.(filter.id as any)}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all
                                                    ${visualFilter === filter.id
                                                        ? 'bg-white border-primary shadow-sm ring-1 ring-primary/20'
                                                        : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${filter.color} shadow-sm`} />
                                                    <span className={`text-sm font-medium ${visualFilter === filter.id ? 'text-primary' : 'text-gray-600'}`}>{filter.label}</span>
                                                </div>
                                                {visualFilter === filter.id && <Sparkles className="w-4 h-4 text-primary animate-pulse" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Movement Controls */}
                                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                    <h3 className="text-gray-700 font-semibold text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
                                        <MoveHorizontal className="w-3.5 h-3.5 text-primary" />
                                        Movement
                                    </h3>
                                    <button
                                        onClick={() => onSetAutoOscillate?.(!autoOscillate)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all
                                            ${autoOscillate
                                                ? 'bg-white border-primary shadow-sm ring-1 ring-primary/20'
                                                : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className={`text-sm font-medium ${autoOscillate ? 'text-primary' : 'text-gray-600'}`}>180° Oscillation</span>
                                            <span className="text-[10px] text-gray-400">Left-to-right smooth motion</span>
                                        </div>
                                        <div className={`relative w-10 h-5 rounded-full transition-colors ${autoOscillate ? 'bg-primary' : 'bg-gray-200'}`}>
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoOscillate ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </button>
                                </div>

                                {/* Gesture tips */}
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
                                                <span>{emoji}</span><span>{tip}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Library Tab ── */}
                {activeTab === 'library' && (
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h3 className="text-gray-900 font-semibold text-sm">3D Library</h3>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed mb-4">
                            Select a curated model from our interactive library. These are optimized for high-performance spatial education.
                        </p>
                        
                        {!isHost && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs mb-4">
                                <strong>Note:</strong> Only the session host can change the primary 3D model for all participants.
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Curated Section */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Lock className="w-3 h-3" />
                                    In-built Models
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {libraryModels.filter(m => m.is_curated).map(model => (
                                        <button
                                            key={model.id}
                                            disabled={!isHost}
                                            onClick={() => onSelectLibraryModel?.(model.url, model.name)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group
                                                ${isHost 
                                                    ? 'bg-purple-50/30 border-purple-100 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md' 
                                                    : 'bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed'}`}
                                        >
                                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                                                {model.thumbnail || '📦'}
                                            </span>
                                            <div>
                                                <div className="text-gray-900 font-bold text-[11px] leading-tight">{model.name}</div>
                                                <div className="text-primary text-[9px] uppercase tracking-tighter mt-0.5 font-medium">{model.category}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {libraryModels.filter(m => m.is_curated).length === 0 && (
                                        <div className="col-span-2 py-4 text-center text-gray-400 text-xs italic">
                                            Loading curated collection...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Community Section */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Plus className="w-3 h-3" />
                                    Community Contributions
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {libraryModels.filter(m => !m.is_curated).map(model => (
                                        <button
                                            key={model.id}
                                            disabled={!isHost}
                                            onClick={() => onSelectLibraryModel?.(model.url, model.name)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center group
                                                ${isHost 
                                                    ? 'bg-gray-50 border-gray-100 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md' 
                                                    : 'bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed'}`}
                                        >
                                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                                                {model.thumbnail || '📦'}
                                            </span>
                                            <div>
                                                <div className="text-gray-900 font-bold text-[11px] leading-tight">{model.name}</div>
                                                <div className="text-gray-400 text-[9px] uppercase tracking-tighter mt-0.5">{model.category}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {libraryModels.filter(m => !m.is_curated).length === 0 && (
                                        <div className="col-span-2 py-8 text-center border border-dashed border-gray-200 rounded-2xl">
                                            <p className="text-gray-400 text-xs italic">No uploads in the library yet.</p>
                                            <p className="text-gray-400 text-[10px] mt-1">Uploaded models appear here once saved.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add object quick-action footer */}
            {activeTab === 'objects' && (
                <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => onAddObject?.('box', selectedColor)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Quick Add Cube
                    </button>
                </div>
            )}
        </div>
    );
};
