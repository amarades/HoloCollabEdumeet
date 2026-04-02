import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    activePage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { id: 'home', label: 'Home', icon: 'home', path: '/dashboard' },
        { 
            id: 'assets', 
            label: 'Assets', 
            icon: 'inventory_2', 
            path: '/library',
            subItems: [
                { id: 'library', label: 'Library', path: '/library', icon: 'local_library' },
                { id: 'vault', label: 'Neural Vault', path: '#', icon: 'lock' },
            ]
        },
        { id: 'sessions', label: 'Sessions', icon: 'groups', path: '/join' },
        { id: 'report', label: 'Report', icon: 'monitoring', path: location.pathname.includes('/report') ? location.pathname : '#' },
        { id: 'profile', label: 'Profile', icon: 'person', path: '/profile' },
        { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
    ];

    const currentPath = activePage || location.pathname;

    return (
        <aside className="h-screen w-72 fixed left-0 top-0 glass-panel border-r border-white/10 shadow-2xl z-50 flex flex-col gap-2 p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-50" />
            
            <div className="mb-10 px-4 mt-4 relative group cursor-pointer" onClick={() => navigate('/')}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">⬡</div>
                    <div>
                        <span className="text-xl font-black tracking-tight text-white">HoloCollab</span>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mt-0.5">Spatial Workspace</p>
                    </div>
                </div>
            </div>

            <nav className="flex flex-col gap-2 relative z-10">
                {menuItems.map((item) => {
                    const isActive = currentPath === item.path || 
                        (item.id === 'profile' && currentPath.includes('/profile')) ||
                        (item.id === 'report' && currentPath.includes('/report'));
                    
                    if (item.id === 'report' && !location.pathname.includes('/report')) {
                        return null;
                    }

                    return (
                        <div key={item.id} className="flex flex-col gap-1">
                            <button
                                onClick={() => item.path !== '#' && navigate(item.path)}
                                className={`px-5 py-3.5 flex items-center gap-4 transition-all duration-500 ease-out rounded-2xl w-full text-left group relative overflow-hidden ${
                                    isActive 
                                    ? 'bg-white/5 text-white shadow-lg border border-primary/30' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-secondary" />
                                )}
                                <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} data-icon={item.icon}>{item.icon}</span>
                                <span className="font-['Inter'] tracking-wider text-xs uppercase font-black">{item.label}</span>
                                
                                {isActive && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                                )}
                            </button>

                            {/* Sub Items */}
                            {item.subItems && (isActive || currentPath.includes(item.path)) && (
                                <div className="flex flex-col gap-1 ml-6 mt-1 border-l border-white/5 pl-4 animate-in fade-in slide-in-from-left-2 duration-500">
                                    {item.subItems.map(subItem => {
                                        const isSubActive = currentPath === subItem.path;
                                        return (
                                            <button
                                                key={subItem.id}
                                                onClick={() => subItem.path !== '#' && navigate(subItem.path)}
                                                className={`px-4 py-2 flex items-center gap-3 transition-all rounded-xl text-left group ${
                                                    isSubActive ? 'text-primary' : 'text-gray-500 hover:text-white'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{subItem.icon}</span>
                                                <span className="text-[10px] uppercase font-black tracking-widest">{subItem.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto flex flex-col gap-6 relative z-10">
                <div className="p-4 glass-card rounded-[28px] flex items-center gap-4 border border-white/5 hover:border-primary/20 group">
                    <div className="relative">
                        <img 
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10 group-hover:border-primary/40 transition-colors" 
                            alt={user?.name || 'User profile'} 
                            src={"https://lh3.googleusercontent.com/aida-public/AB6AXuCpF1x3Bk9Zx-2hfMGk5ivMI25cXaqbJuOtHK1pN7kdl35ntUxtVH04DMsGWU9GrnykcCQMkNszavWCXYObqfuLksi0tLqgZOWC53NxjkeSfKiQ3ZgJYChqUgGQBuAYl3v1X3iLaOZRFG59L6CKUh1h44-n-K1S_geMzp88B-dU7zldyEBOEcKXElLcREEkfS1kPJpkUGrofxA83a_8UXHqT6G64b0iDwhUG_IIsxwl1F4Gr_53suggPvp_M4BVRSNmMim71fM8WOGn"}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background-dark" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-black truncate text-white tracking-tight">{user?.name || 'Researcher'}</p>
                        <p className="text-[10px] text-primary truncate uppercase tracking-widest font-bold">{user?.role || 'Prime Member'}</p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-3 px-6 py-4 text-[10px] font-black text-white/40 hover:text-red-400 transition-all duration-300 uppercase tracking-[0.25em] group bg-white/5 rounded-2xl border border-white/5 hover:border-red-400/20 hover:bg-red-400/5 shadow-inner"
                >
                    <span className="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform duration-700">logout</span>
                    Terminate Session
                </button>
            </div>

            {/* Decorative background glow */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        </aside>
    );
};

export default Sidebar;
