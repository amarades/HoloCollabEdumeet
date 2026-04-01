import React, { useState } from 'react';
import { X, Eye, EyeOff, Upload, Box, Trash2, Plus, Circle, Cylinder, Lock, Sparkles, Palette, BookmarkPlus } from 'lucide-react';
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
    isUploading?: boolean;
}

const SHAPE_COLORS = [
    '#9333ea', '#ef4444', '#10b981', '#f59e0b',
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
    onSelectLibraryModel,
    libraryModels = [],
    isHost = false,
    isUploading = false,
}) => {
    const [selectedColor, setSelectedColor] = useState('#9333ea');
    const [activeTab, setActiveTab] = useState<'objects' | 'model' | 'library'>('objects');

    const getShapeIcon = (type: SceneObject['type']) => {
        switch (type) {
            case 'sphere': return <Circle className="w-4 h-4" />;
            case 'cylinder': return <Cylinder className="w-4 h-4" />;
            default: return <Box className="w-4 h-4" />;
        }
    };

    return (
        <div className="absolute top-0 md:top-8 right-0 md:right-8 bottom-0 md:bottom-36 w-full md:w-[380px] bg-[#1a1919]/80 backdrop-blur-3xl border border-white/10 md:rounded-[32px] shadow-2xl z-[100] md:z-40 flex flex-col overflow-hidden animate-in md:slide-in-from-right-8">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Manifest</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Spatial Registry</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-white/3">
                {(['objects', 'model', 'library'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === tab
                                ? 'text-primary bg-primary/5 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary relative'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            }`}
                    >
                        {tab === 'objects' ? `Entities (${sceneObjects.length})` : tab === 'model' ? 'Primary Asset' : 'Protocol Library'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-transparent custom-scrollbar">

                {/* ── Objects Tab ── */}
                {activeTab === 'objects' && (
                    <div className="p-6 flex flex-col gap-6">
                        {/* Spawn shapes */}
                        <div>
                            <h3 className="text-white/40 font-black text-[9px] uppercase tracking-[0.2em] mb-4">Initialize Primitive</h3>

                            {/* Color picker */}
                            <div className="flex flex-wrap gap-2.5 mb-5">
                                {SHAPE_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-7 h-7 rounded-lg transition-all border-2 ${selectedColor === c ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Shape buttons */}
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { type: 'box' as const, Icon: Box, label: 'Cube' },
                                    { type: 'sphere' as const, Icon: Circle, label: 'Sphere' },
                                    { type: 'cylinder' as const, Icon: Cylinder, label: 'Cylid' },
                                ] as { type: SceneObject['type'], Icon: any, label: string }[]).map(({ type, Icon, label }) => (
                                    <button
                                        key={type}
                                        onClick={() => onAddObject?.(type, selectedColor)}
                                        className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-primary/10 transition-all group"
                                    >
                                        <Icon className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                                        <span className="text-[9px] text-white/40 font-black uppercase tracking-widest group-hover:text-white">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scene object list */}
                        {sceneObjects.length > 0 && (
                            <div>
                                <h3 className="text-white/40 font-black text-[9px] uppercase tracking-[0.2em] mb-3">Active Registry</h3>
                                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                                    {sceneObjects.map(obj => (
                                        <div
                                            key={obj.id}
                                            onClick={() => onSelectObject?.(selectedObjectId === obj.id ? null : obj.id)}
                                            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group/item
                                                ${selectedObjectId === obj.id
                                                    ? 'border-primary/40 bg-primary/10'
                                                    : 'border-white/5 bg-white/3 hover:bg-white/5'
                                                }`}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                                                style={{ backgroundColor: obj.color + '20' }}
                                            >
                                                <span style={{ color: obj.color }}>{getShapeIcon(obj.type)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-bold text-xs capitalize">{obj.type}</div>
                                                <div className="text-white/20 text-[9px] font-mono tracking-tighter truncate">
                                                    ADDR: [{obj.position.map(v => v.toFixed(1)).join(', ')}]
                                                </div>
                                            </div>
                                            {obj.lockedBy && <Lock className="w-3.5 h-3.5 text-amber-500 opacity-60" />}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteObject?.(obj.id); }}
                                                className="p-2 hover:bg-red-500/10 rounded-xl transition-colors opacity-0 group-hover/item:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sceneObjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                <Box size={32} className="mb-3 text-white" />
                                <p className="text-[10px] uppercase font-black tracking-widest">Registry Empty</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Model Tab ── */}
                {activeTab === 'model' && (
                    <div className="p-6 flex flex-col gap-6">
                        {!modelLoaded ? (
                            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
                                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-center shadow-inner group transition-all hover:border-primary/40">
                                    <Box className="w-10 h-10 text-white/20 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="max-w-[200px]">
                                    <h3 className="text-white font-black text-sm uppercase tracking-widest mb-2">Protocol Uninitialized</h3>
                                    <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold leading-relaxed">
                                        Upload neural asset (GLB/GLTF) to initiate spatial environment.
                                    </p>
                                </div>
                                <button
                                    onClick={onUpload}
                                    disabled={isUploading}
                                    className={`flex items-center gap-3 bg-primary hover:bg-secondary text-white font-black uppercase text-[10px] tracking-[0.2em] py-4 px-8 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Syncing Asset...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Initialize Asset
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-inner">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                        <Box className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Asset Active</div>
                                        <div className="text-emerald-400/50 text-[9px] uppercase tracking-widest font-bold mt-0.5">Telemetry Synchronized</div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <button
                                        onClick={onToggleModel}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-lg
                                            ${modelVisible
                                                ? 'bg-white/5 border-white/10 hover:bg-white/8'
                                                : 'bg-primary/20 border-primary/40 text-primary'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modelVisible ? 'bg-white/5 text-white/40' : 'bg-primary/20 text-primary animate-pulse'}`}>
                                            {modelVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="text-white font-black text-[10px] uppercase tracking-widest">{modelVisible ? 'Terminate Viz' : 'Initiate Viz'}</div>
                                            <div className="text-white/20 text-[9px] uppercase font-bold tracking-widest mt-0.5">Overlay Status Toggle</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={onUpload}
                                        className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                                            <Upload size={18} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="text-white font-black text-[10px] uppercase tracking-widest">Update Source</div>
                                            <div className="text-white/20 text-[9px] uppercase font-bold tracking-widest mt-0.5">Provision new GLB data</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={onDeleteModel}
                                        className="flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                                            <Trash2 size={18} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="text-red-400 font-black text-[10px] uppercase tracking-widest">Purge Entity</div>
                                            <div className="text-red-400/40 text-[9px] uppercase font-bold tracking-widest mt-0.5">Wipe Registry Segment</div>
                                        </div>
                                    </button>
                                </div>

                                {/* Visual Filters */}
                                <div className="p-5 bg-white/3 border border-white/5 rounded-3xl">
                                    <h3 className="text-white/30 font-black text-[9px] tracking-[0.3em] mb-4 flex items-center gap-2 uppercase">
                                        <Palette className="w-3.5 h-3.5 text-primary" />
                                        Visual Protocol
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {[
                                            { id: 'realistic', label: 'Neutral', color: 'bg-white/40' },
                                            { id: 'blue_glow', label: 'Cyan Pulse', color: 'bg-blue-400' },
                                            { id: 'red_glow', label: 'Ruby Trace', color: 'bg-red-400' },
                                        ].map((filter) => (
                                            <button
                                                key={filter.id}
                                                onClick={() => onSetVisualFilter?.(filter.id as any)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all
                                                    ${visualFilter === filter.id
                                                        ? 'bg-primary/20 border-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/8 hover:border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${filter.color} ${visualFilter === filter.id ? 'animate-pulse' : 'opacity-40'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${visualFilter === filter.id ? 'text-white' : 'text-white/40'}`}>{filter.label}</span>
                                                </div>
                                                {visualFilter === filter.id && <Sparkles className="w-3.5 h-3.5 text-primary animate-spin-slow" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Library Tab ── */}
                {activeTab === 'library' && (
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                                <BookmarkPlus size={20} />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-sm uppercase tracking-widest">Curated Archives</h2>
                                <p className="text-white/20 text-[9px] uppercase font-bold tracking-widest mt-0.5">Verified Knowledge Assets</p>
                            </div>
                        </div>
                        
                        {!isHost && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                CRITICAL: Only Prime Entity (Host) can re-provision the primary spatial asset.
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* Curated Section */}
                            <div>
                                <h4 className="text-[9px] font-black text-white/20 uppercase tracking-[.4em] mb-4 flex items-center gap-2">
                                    <Lock className="w-3 h-3" />
                                    Core Protocol Assets
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {libraryModels.filter(m => m.is_curated).map(model => (
                                        <button
                                            key={model.id}
                                            disabled={!isHost}
                                            onClick={() => onSelectLibraryModel?.(model.url, model.name)}
                                            className={`flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all text-center group relative overflow-hidden
                                                ${isHost 
                                                    ? 'bg-white/5 border-white/10 hover:border-primary/40 hover:bg-primary/10 hover:shadow-xl' 
                                                    : 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'}`}
                                        >
                                            <span className="text-4xl group-hover:scale-110 transition-transform duration-500 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                                                {model.thumbnail || '📦'}
                                            </span>
                                            <div>
                                                <div className="text-white font-black text-[10px] uppercase tracking-widest">{model.name}</div>
                                                <div className="text-primary text-[8px] uppercase tracking-widest mt-1 font-black opacity-60 group-hover:opacity-100 transition-opacity">{model.category}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Community Section */}
                            <div>
                                <h4 className="text-[9px] font-black text-white/20 uppercase tracking-[.4em] mb-4 flex items-center gap-2">
                                    <Plus className="w-3 h-3" />
                                    Community Intel
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {libraryModels.filter(m => !m.is_curated).map(model => (
                                        <button
                                            key={model.id}
                                            disabled={!isHost}
                                            onClick={() => onSelectLibraryModel?.(model.url, model.name)}
                                            className={`flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all text-center group
                                                ${isHost 
                                                    ? 'bg-white/5 border-white/10 hover:border-primary/40 hover:bg-primary/10' 
                                                    : 'bg-white/[0.02] border-white/5 opacity-40'}`}
                                        >
                                            <span className="text-4xl group-hover:scale-110 transition-transform duration-500">
                                                {model.thumbnail || '📦'}
                                            </span>
                                            <div>
                                                <div className="text-white font-black text-[10px] uppercase tracking-widest">{model.name}</div>
                                                <div className="text-white/20 text-[8px] uppercase tracking-widest mt-1 font-black">{model.category}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {libraryModels.filter(m => !m.is_curated).length === 0 && (
                                        <div className="col-span-2 py-10 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                                            <p className="text-white/20 text-[9px] font-black uppercase tracking-[.3em]">No Community Metadata</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick action footer */}
            {activeTab === 'objects' && (
                <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-3xl">
                    <button
                        onClick={() => onAddObject?.('box', selectedColor)}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[.3em] hover:bg-secondary transition-all shadow-lg shadow-primary/20 hover:shadow-secondary/30 active:scale-95"
                    >
                        <Plus size={16} />
                        Instantiate Cube
                    </button>
                </div>
            )}
        </div>
    );
};
