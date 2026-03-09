import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
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
        if (roomCode) {
            navigate(`/join?code=${roomCode}`);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col">
            {/* ── Premium Background & Grid ── */}
            <div className="premium-bg">
                <div className="tech-grid" />
                <div className="floating-shape circle s1" />
                <div className="floating-shape square s2" />
                <div className="floating-shape circle s3" />
                <div className="floating-shape square s4" />
                <div className="floating-shape circle s5" />
                <div className="floating-shape square s6" />
                <div className="floating-shape circle s7" />
            </div>

            {/* ── Navbar ── */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white/20 backdrop-blur-md border-b border-gray-100/50">
                <div className="max-w-7xl mx-auto px-10 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">⬡</div>
                        <span className="font-bold text-2xl text-gray-900 tracking-tight">
                            HoloCollab<span className="text-indigo-500 font-medium ml-1">EduMeet</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-10">
                        <span className="text-sm font-semibold text-gray-500 tracking-wider bg-gray-50/50 px-4 py-1.5 rounded-full">{currentTime}</span>
                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => navigate('/login')} className="btn-premium-text">Sign In</button>
                            <button onClick={() => navigate('/signup')} className="btn-premium-primary">Get Started</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Hero Content ── */}
            <main className="flex-1 max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-20 items-center pt-40 pb-20">
                <div className="z-10">
                    <h1 className="text-[5.5rem] leading-[1.05] font-black text-gray-900 mb-8 tracking-tighter">
                        Premium 3D<br />
                        Collaborative<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 text-glow-purple">
                            Learning.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-500 font-medium max-w-lg mb-12 leading-relaxed">
                        Experience collaborative learning and design in a seamless 3D environment.
                        Bridges the gap between physical and digital workspaces.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-20">
                        <div className="flex-1 max-w-sm relative group bg-white border border-gray-200 rounded-xl transition-all hover:border-indigo-400 p-1 flex items-center shadow-sm">
                            <span className="pl-4 text-gray-400 font-mono tracking-widest">⌨</span>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Enter meeting code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="flex-1 px-4 py-3 outline-none text-gray-900 font-semibold placeholder:text-gray-300 bg-transparent"
                            />
                            <button
                                onClick={handleJoin}
                                className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all hover:bg-indigo-600 active:scale-95"
                            >
                                Join
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/signup')}
                            className="bg-white border-2 border-gray-100 px-8 py-4 rounded-xl text-gray-900 font-bold shadow-sm hover:border-indigo-200 transition-all active:scale-95"
                        >
                            New Meeting
                        </button>
                    </div>

                    <a href="#" className="text-indigo-500 font-semibold text-sm hover:underline">Learn more about HoloCollab →</a>
                </div>

                {/* ── Hero Graphic ── */}
                <div className="relative">
                    <div className="glass-card aspect-[4/3] rounded-[40px] flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                        <div className="hologram-container">
                            <div className="orb-ring orb-ring-1" />
                            <div className="orb-ring orb-ring-2" />
                            <div className="orb-ring orb-ring-3" />
                            <div className="orb-core" />
                        </div>
                    </div>
                    {/* Pulsing Aura Decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-purple-500/10 blur-[80px] rounded-full z-[-1]" />
                </div>
            </main>

            {/* ── Features ── */}
            <section className="py-32 px-10 max-w-7xl mx-auto w-full">
                <div className="text-center mb-24">
                    <h2 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">Unleash Spatial Collaboration</h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">HoloCollab offers features designed to supercharge your team's productivity and creativity in a 3D environment.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {[
                        { icon: <Video />, title: 'Instant Holographic Meetings', desc: 'Launch immersive 3D meeting rooms in seconds without any downloads.' },
                        { icon: <Globe />, title: 'Infinite Spatial Canvas', desc: 'Pin models, documents, and whiteboards freely in the 3D space around you.' },
                        { icon: <Shield />, title: 'Enterprise-Grade Security', desc: 'Enjoy peace of mind with end-to-end encryption for all spatial data.' },
                        { icon: <Cpu />, title: 'Cross-Platform Sync', desc: 'Seamlessly syncs your spatial environment in real-time across all devices.' },
                        { icon: <Brain />, title: 'Live 3D Model Editing', desc: 'Co-edit complex 3D models with your team simultaneously with live updates.' },
                        { icon: <Plus />, title: 'AI Meeting Assistant', desc: 'Let our spatial AI take notes and suggested relevant 3D assets during the session.' }
                    ].map((f, i) => (
                        <div key={i} className="bg-white border border-gray-100 p-10 rounded-[32px] hover:-translate-y-2 transition-all duration-500 shadow-sm hover:shadow-xl hover:border-indigo-100 group">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-8 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                {f.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{f.title}</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="py-20 px-10 border-t border-gray-100 bg-white/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">⬡</div>
                        <span className="font-bold text-xl text-gray-900">HoloCollab</span>
                    </div>
                    <div className="flex gap-12 text-sm font-bold text-gray-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-indigo-500 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-indigo-500 transition-colors">Terms</a>
                        <a href="#" className="hover:text-indigo-500 transition-colors">Support</a>
                    </div>
                    <p className="text-sm font-bold text-gray-300">© 2026 HOLOCOLLAB PLATFORM. ALL RIGHTS RESERVED.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
