import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Zap, LayoutGrid } from 'lucide-react';

const TopBar: React.FC = () => {
    const { user } = useAuth();

    return (
        <header className="fixed top-6 left-[300px] right-8 glass-panel border border-white/10 p-1.5 rounded-[24px] z-40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center h-14 px-6 md:px-8">
                <div className="flex items-center gap-6 flex-1">
                    <div className="relative w-full max-w-lg group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input 
                            className="w-full bg-white/5 border border-white/5 rounded-full pl-12 pr-6 py-2.5 text-xs font-medium text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all" 
                            placeholder="Search spatial assets or protocols..." 
                            type="text"
                        />
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                        <Zap className="w-3 h-3 text-primary fill-primary animate-pulse" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">Neural Link Active</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary/30 transition-all group relative">
                            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background-dark shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary/30 transition-all group">
                            <LayoutGrid className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <div className="flex items-center gap-3 pl-1 group cursor-pointer">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-white group-hover:text-primary transition-colors tracking-tight leading-none mb-1">{user?.name || 'Researcher'}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black opacity-60">Node 0x4F2A</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-0.5 shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform">
                            <div className="w-full h-full rounded-[10px] bg-background-dark flex items-center justify-center font-black text-primary text-sm border border-white/10">
                                {user?.name?.[0]?.toUpperCase() || 'R'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
