import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { AIChatMenu } from '../components/AIChatMenu';
import { Brain, Video, Plus, Shield, Globe, Cpu } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const update = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    const handleJoin = () => {
        const normalized = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (normalized) {
            navigate(`/join?code=${encodeURIComponent(normalized)}&source=home`);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col">
            <AIChatMenu />
            {/* ── Premium Background & Floating Shapes ── */}
            <div className="premium-bg">
                <div className="floating-shape circle s1" />
                <div className="floating-shape square s2" />
                <div className="floating-shape circle s3" />
                <div className="floating-shape square s4" />
                <div className="floating-shape circle s5" />
                <div className="floating-shape square s6" />
                <div className="floating-shape circle s7" />
                <div className="floating-shape square s8" />
                <div className="floating-shape square s9" />
            </div>

            {/* ── Navbar ── */}
            <header className="fixed top-0 left-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-purple-500/20">
                <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/40">⬡</div>
                        <span className="font-bold text-lg md:text-xl text-white tracking-tight">
                            HoloCollab<span className="text-purple-400 font-medium ml-1">EduMeet</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                        <span className="hidden sm:inline-block text-[10px] md:text-xs font-semibold text-purple-300/80 tracking-wider bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">{currentTime}</span>
                        <div className="flex items-center gap-3 md:gap-6">
                            <button onClick={() => navigate('/login')} className="text-xs md:text-sm text-white/80 font-medium hover:text-white transition-colors">Sign In</button>
                            <button onClick={() => navigate('/signup')} className="btn-premium-primary py-2 px-4 md:px-6 text-xs md:text-sm whitespace-nowrap">Get Started</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Hero Content (Side-by-Side on Desktop, Stacked on Mobile) ── */}
            <main className="flex-1 max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:gap-20 min-h-screen pt-24 pb-12 z-10 w-full">
                <div className="flex-1 text-center lg:text-left max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 md:px-5 py-2 mb-6 animate-in fade-in slide-in-from-left-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-purple-300 text-[10px] md:text-sm font-semibold tracking-widest uppercase">Next-Gen Learning Platform</span>
                    </div>

                    <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4.5rem] leading-[1.1] font-black text-white mb-6 tracking-tighter animate-in fade-in slide-in-from-left-6 duration-700 delay-100 italic">
                        Premium 3D<br />
                        Collaborative<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 text-glow-purple non-italic">
                            Learning.
                        </span>
                    </h1>

                    <p className="text-base md:text-lg text-white/50 font-medium mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-left-8 duration-700 delay-200">
                        Experience collaborative learning and design in a seamless 3D environment.
                        Bridges the gap between physical and digital workspaces.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-10 items-center justify-center lg:justify-start animate-in fade-in slide-in-from-left-10 duration-700 delay-300 w-full max-w-md mx-auto lg:mx-0">
                        <div className="flex-1 w-full relative group bg-white/5 border border-purple-500/30 rounded-xl transition-all hover:border-purple-400 p-1 flex items-center shadow-lg shadow-purple-900/20 backdrop-blur-sm">
                            <span className="pl-4 text-purple-400 font-mono tracking-widest">⌨</span>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Enter code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="flex-1 px-3 md:px-4 py-3 outline-none text-white font-semibold placeholder:text-white/20 bg-transparent text-sm md:text-base min-w-0"
                            />
                            <button
                                onClick={handleJoin}
                                className="bg-purple-600 text-white px-6 md:px-8 py-3 rounded-lg font-bold text-xs md:text-sm tracking-wide transition-all hover:bg-purple-500 active:scale-95 shadow-lg shadow-purple-600/30"
                            >
                                Join
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto bg-white/5 border border-white/10 px-8 py-4 rounded-xl text-white font-bold backdrop-blur-sm hover:bg-white/10 hover:border-purple-500/40 transition-all active:scale-95 whitespace-nowrap text-xs md:text-sm"
                        >
                            New Meeting
                        </button>
                    </div>

                    <a href="#" className="inline-block text-purple-400 font-semibold text-xs md:text-sm hover:text-purple-300 transition-colors animate-in fade-in duration-700 delay-500">Learn more about HoloCollab →</a>
                </div>

                {/* ── Orbit Atom Ring Column ── */}
                <div className="flex-1 flex justify-center lg:justify-end items-center relative animate-in fade-in scale-in-95 duration-1000 delay-200 mt-12 lg:mt-0">
                    <div className="hologram-container scale-75 sm:scale-90 md:scale-100 lg:scale-[1.2] lg:mr-10">
                        <div className="orb-core" />
                        <div className="orb-ring orb-ring-1" />
                        <div className="orb-ring orb-ring-2" />
                        <div className="orb-ring orb-ring-3" />
                    </div>
                    {/* Decorative Glow behind the ring */}
                    <div className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-purple-600/10 blur-[80px] md:blur-[100px] rounded-full z-[-1]" />
                </div>

                {/* Main Decorative Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 blur-[160px] rounded-full z-[-1]" />
            </main>

            {/* ── Features ── */}
            <section className="py-20 md:py-32 px-6 md:px-10 max-w-7xl mx-auto w-full relative z-10">
                <div className="text-center mb-16 md:mb-24">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Unleash Spatial Collaboration</h2>
                    <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto font-medium">HoloCollab offers features designed to supercharge your team's productivity and creativity in a 3D environment.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {[
                        { icon: <Video />, title: 'Instant Holographic Meetings', desc: 'Immersive 3D meeting rooms in seconds without any downloads.' },
                        { icon: <Globe />, title: 'Infinite Spatial Canvas', desc: 'Pin models and whiteboards freely in the 3D space around you.' },
                        { icon: <Shield />, title: 'Enterprise-Grade Security', desc: 'Enjoy peace of mind with end-to-end encryption for all data.' },
                        { icon: <Cpu />, title: 'Cross-Platform Sync', desc: 'Seamlessly syncs your environment in real-time across all devices.' },
                        { icon: <Brain />, title: 'Live 3D Model Editing', desc: 'Co-edit complex 3D models with your team simultaneously.' },
                        { icon: <Plus />, title: 'AI Meeting Assistant', desc: 'Let our AI take notes and suggested relevant 3D assets.' }
                    ].map((f, i) => (
                        <div key={i} className="bg-white/3 border border-purple-500/15 p-8 md:p-10 rounded-[28px] md:rounded-[32px] hover:-translate-y-2 transition-all duration-500 backdrop-blur-sm hover:border-purple-500/40 hover:shadow-[0_20px_60px_rgba(147,51,234,0.15)] group">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-purple-600/40">
                                {f.icon}
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-4">{f.title}</h3>
                            <p className="text-white/40 font-medium leading-relaxed text-sm md:text-base">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="py-12 md:py-20 px-6 md:px-10 border-t border-purple-500/15 bg-black/20 backdrop-blur-md relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/40">⬡</div>
                        <span className="font-bold text-xl text-white">HoloCollab</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[10px] md:text-sm font-bold text-white/30 uppercase tracking-widest">
                        <a href="#" className="hover:text-purple-400 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-purple-400 transition-colors">Terms</a>
                        <a href="#" className="hover:text-purple-400 transition-colors">Support</a>
                    </div>
                    <p className="text-[10px] md:text-sm font-bold text-white/20 text-center">© 2026 HOLOCOLLAB PLATFORM. ALL RIGHTS RESERVED.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
