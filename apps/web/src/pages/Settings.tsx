import { 
    User, Bell, Shield, Palette, 
    Settings as SettingsIcon,
    Camera, Laptop
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('profile');

    const sections = [
        { id: 'profile', label: 'Profile Settings', icon: User, description: 'Manage your researcher identity and neural links.' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure telemetry alerts and system pings.' },
        { id: 'security', label: 'Security & Access', icon: Shield, description: 'Neural key management and access protocols.' },
        { id: 'appearance', label: 'Interface Interface', icon: Palette, description: 'Customize your spatial workspace aesthetics.' },
        { id: 'devices', label: 'Neural Hardware', icon: Laptop, description: 'Manage connected VR/AR peripherals and sensors.' },
    ];

    return (
        <div className="bg-transparent text-white min-h-screen overflow-x-hidden selection:bg-primary/30">
            {/* Premium Background Elements */}
            <div className="premium-bg"></div>
            <div className="floating-shape s1 !opacity-20"></div>
            <div className="floating-shape s3 !opacity-20"></div>
            <div className="floating-shape s6 !opacity-20"></div>

            <Sidebar />
            <TopBar />

            <main className="ml-[300px] pt-32 pb-20 pr-10 relative z-10">
                <motion.header 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-14"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-px bg-primary/40"></span>
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Preferences</p>
                    </div>
                    <h2 className="text-5xl font-black text-white tracking-tighter mb-4 italic">Settings<span className="text-primary non-italic ml-2">.</span></h2>
                    <p className="text-white/60 font-medium max-w-xl">Configure your spatial workspace and neural bridge parameters.</p>
                </motion.header>

                <div className="grid grid-cols-12 gap-10">
                    {/* Navigation Sidebar */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            const isActive = activeSection === section.id;
                            return (
                                <motion.button
                                    key={section.id}
                                    whileHover={{ x: 5 }}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`p-6 rounded-[28px] border transition-all text-left flex items-start gap-4 relative overflow-hidden group
                                        ${isActive 
                                            ? 'bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(147,51,234,0.1)]' 
                                            : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'}`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                                    )}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all
                                        ${isActive 
                                            ? 'bg-primary/20 border-primary/40 text-primary' 
                                            : 'bg-white/5 border-white/10 text-white/40 group-hover:text-white'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white' : 'text-white/60'}`}>{section.label}</h4>
                                        <p className="text-[10px] text-white/30 font-medium leading-relaxed uppercase tracking-widest">{section.description}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="col-span-12 lg:col-span-8">
                        <motion.div 
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card rounded-[40px] p-12 min-h-[600px] border-white/10 relative overflow-hidden"
                        >
                            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                            
                            {activeSection === 'profile' && (
                                <div className="space-y-10 relative z-10">
                                    <div className="flex items-center gap-8 pb-10 border-b border-white/5">
                                        <div className="relative group">
                                            <div className="w-28 h-28 rounded-[38px] bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl transition-transform group-hover:scale-105">
                                                <div className="w-full h-full rounded-[34px] bg-background-dark overflow-hidden border border-white/10">
                                                    <img 
                                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpF1x3Bk9Zx-2hfMGk5ivMI25cXaqbJuOtHK1pN7kdl35ntUxtVH04DMsGWU9GrnykcCQMkNszavWCXYObqfuLksi0tLqgZOWC53NxjkeSfKiQ3ZgJYChqUgGQBuAYl3v1X3iLaOZRFG59L6CKUh1h44-n-K1S_geMzp88B-dU7zldyEBOEcKXElLcREEkfS1kPJpkUGrofxA83a_8UXHqT6G64b0iDwhUG_IIsxwl1F4Gr_53suggPvp_M4BVRSNmMim71fM8WOGn" 
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover opacity-80"
                                                    />
                                                </div>
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center border-4 border-background-dark text-white shadow-xl hover:scale-110 transition-transform">
                                                <Camera size={16} />
                                            </button>
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-white italic tracking-tight mb-2">{user?.name || 'Researcher'}<span className="text-primary non-italic">.</span></h3>
                                            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-4">Prime Entity Instance</p>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/40 uppercase tracking-widest">Node ID: 0x4F2A</span>
                                                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Sync Active
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Researcher Alias</label>
                                            <input 
                                                type="text" 
                                                defaultValue={user?.name || ''}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors"
                                                placeholder="Enter alias..."
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Neural Email</label>
                                            <input 
                                                type="email" 
                                                defaultValue={user?.email || ''}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors"
                                                placeholder="Enter email..."
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-3">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Bio Protocol</label>
                                            <textarea 
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                                placeholder="Define your research focus..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button className="px-10 py-5 bg-gradient-to-r from-primary to-secondary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all border border-white/10">
                                            Authorize Synchronization
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeSection !== 'profile' && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                    <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-white/20">
                                        <SettingsIcon size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Protocol Component Under Construction</h3>
                                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest max-w-sm">Neural bridge segment is being provisioned. This module will be available in the next deployment cycle.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
