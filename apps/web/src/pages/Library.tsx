import { 
    Search, Grid, 
    List, Sparkles, Download, 
    Plus, Play,
    Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { apiRequest } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Library = () => {
    const navigate = useNavigate();
    const [models, setModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const categories = ['All', 'Science', 'Engineering', 'Medical', 'Anatomy', 'Space', 'Historical'];

    useEffect(() => {
        const fetchModels = async () => {
            setLoading(true);
            try {
                const data = await apiRequest('/api/models/');
                setModels(data);
            } catch (err) {
                console.error('Failed to fetch library models:', err);
                // Fallback some mock data if request fails for UI demonstration
                setModels([
                    { id: 1, name: 'Human Heart (Neural)', category: 'Medical', thumbnail: '🫀', is_curated: true, author: 'HoloMed' },
                    { id: 2, name: 'James Webb Protocol', category: 'Space', thumbnail: '🛰️', is_curated: true, author: 'SpaceOps' },
                    { id: 3, name: 'Internal Combustion', category: 'Engineering', thumbnail: '⚙️', is_curated: false, author: 'MechCore' },
                    { id: 4, name: 'Mars Rover Unit', category: 'Space', thumbnail: '🚜', is_curated: true, author: 'NASA' },
                    { id: 5, name: 'Eiffel Structure', category: 'Historical', thumbnail: '🗼', is_curated: false, author: 'HistoryHub' },
                    { id: 6, name: 'DNA Helix Trace', category: 'Science', thumbnail: '🧬', is_curated: true, author: 'BioLink' },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchModels();
    }, []);

    const filteredModels = models.filter(model => {
        const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || model.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="bg-transparent text-white min-h-screen overflow-x-hidden selection:bg-primary/30">
            {/* Premium Background Elements */}
            <div className="premium-bg"></div>
            <div className="floating-shape s1 !opacity-20"></div>
            <div className="floating-shape s7 !opacity-20"></div>
            <div className="floating-shape s4 square !opacity-10"></div>

            <Sidebar />
            <TopBar />

            <main className="ml-[300px] pt-32 pb-20 pr-10 relative z-10">
                <motion.header 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-8 h-px bg-primary/40"></span>
                            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Registry</p>
                        </div>
                        <h2 className="text-5xl font-black text-white tracking-tighter mb-4 italic">Asset Library<span className="text-emerald-500 non-italic ml-2">.</span></h2>
                        <p className="text-white/60 font-medium max-w-xl">Browse curated neural assets and holographic simulations available for deployment.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 shadow-inner">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                        <button className="px-8 py-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-700/20 hover:scale-105 transition-all flex items-center gap-4 border border-emerald-400">
                           <Plus size={16} /> Asset Provision
                        </button>
                    </div>
                </motion.header>

                {/* Toolbar */}
                <div className="mb-10 flex flex-col md:flex-row gap-6">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search library assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-[28px] pl-16 pr-8 py-5 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border
                                    ${selectedCategory === cat 
                                        ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_20px_rgba(147,51,234,0.1)]' 
                                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Initializing Registry...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {filteredModels.map((model, idx) => (
                            <motion.div 
                                key={model.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card rounded-[40px] p-8 group hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                                
                                <div className="aspect-square rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-center text-6xl mb-8 group-hover:scale-105 transition-transform duration-500 shadow-inner group-hover:shadow-[0_0_40px_rgba(147,51,234,0.15)] relative">
                                    {model.thumbnail || '📦'}
                                    {model.is_curated && (
                                        <div className="absolute top-4 left-4 w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center text-primary group-hover:animate-pulse">
                                            <Sparkles size={16} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-bold text-white/30 uppercase tracking-widest">Protocol {idx + 104}</span>
                                        <span className="text-primary text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{model.category}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2 italic tracking-tight group-hover:text-primary transition-colors">{model.name}</h3>
                                    <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest mb-6">Author: {model.author || 'Neural Core'}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate('/dashboard')}
                                        className="flex-1 px-4 py-4 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={14} fill="currentColor" /> Initiate Session
                                    </button>
                                    <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center justify-center">
                                        <Download size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredModels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[60px]">
                        <Database className="w-16 h-16 text-white/10 mb-6" />
                        <h3 className="text-2xl font-black text-white/40 uppercase tracking-tight">Registry Fragmented</h3>
                        <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-2">No neural assets matched your current search parameters.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Library;
