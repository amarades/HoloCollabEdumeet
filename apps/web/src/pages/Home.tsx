import { useNavigate } from 'react-router-dom';
import {
    Gamepad2, Brain, Video, BarChart2, BookOpen, Shield,
    ArrowRight
} from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary">

            {/* Navigation */}
            <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-white font-bold text-xl">H</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                            HoloCollab<span className="font-normal text-gray-500">EduMeet</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
                        <button onClick={() => navigate('/login')} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all hover:shadow-lg"
                        >
                            Get Started Free
                        </button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-8">
                        <span className="text-xs font-bold text-primary px-2 py-0.5 bg-red-50 rounded-full">NEW</span>
                        <span className="text-xs font-medium text-gray-600">AI-Powered 3D Learning Platform 2.0</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8 leading-tight">
                        Welcome to the <br />
                        <span className="text-primary">Learning Revolution</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Transform your educational experience with AI-powered immersive 3D collaboration.
                        Explore complex concepts in real-time AR environments.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-8 py-4 rounded-full bg-primary text-white font-medium hover:bg-primary-hover transition-all hover:shadow-lg flex items-center gap-2"
                        >
                            Start Learning Free <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => navigate('/join?source=home')}
                            className="px-8 py-4 rounded-full bg-white text-gray-900 font-medium border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            Join Session
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 py-12 max-w-4xl mx-auto">
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">50K+</div>
                            <div className="text-sm font-medium text-gray-500">Active Students</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">1000+</div>
                            <div className="text-sm font-medium text-gray-500">3D Models</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
                            <div className="text-sm font-medium text-gray-500">Uptime</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">24/7</div>
                            <div className="text-sm font-medium text-gray-500">AI Support</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Revolutionary Learning Experience</h2>
                        <p className="text-gray-500 text-lg">Everything you need to create immersive, collaborative 3D sessions.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Gamepad2 className="w-6 h-6 text-indigo-500" />}
                            iconBg="bg-indigo-50"
                            title="Real-time 3D Collaboration"
                            desc="Interact with 3D models together. See changes instantly as your team manipulates objects in real-time."
                        />
                        <FeatureCard
                            icon={<Brain className="w-6 h-6 text-emerald-500" />}
                            iconBg="bg-emerald-50"
                            title="AI-Powered Insights"
                            desc="Get intelligent explanations and contextual information about complex 3D structures on demand."
                        />
                        <FeatureCard
                            icon={<Video className="w-6 h-6 text-blue-500" />}
                            iconBg="bg-blue-50"
                            title="HD Video Conferencing"
                            desc="Built-in HD video and audio with screen sharing and recording capabilities for seamless communication."
                        />
                        <FeatureCard
                            icon={<BarChart2 className="w-6 h-6 text-orange-500" />}
                            iconBg="bg-orange-50"
                            title="Learning Analytics"
                            desc="Track engagement, measure outcomes, and get detailed insights into progress."
                        />
                        <FeatureCard
                            icon={<BookOpen className="w-6 h-6 text-pink-500" />}
                            iconBg="bg-pink-50"
                            title="Vast 3D Library"
                            desc="Access thousands of high-quality 3D models across multiple subjects like Anatomy, Engineering, and more."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-teal-500" />}
                            iconBg="bg-teal-50"
                            title="Enterprise Security"
                            desc="Bank-level encryption and compliance with educational data privacy standards."
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 relative overflow-hidden bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                        <p className="text-gray-500 text-lg">Get started in three simple steps</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>

                        <StepCard
                            number="1"
                            title="Create Your Account"
                            desc="Sign up for free and set up your profile. No credit card required."
                        />
                        <StepCard
                            number="2"
                            title="Choose or Upload"
                            desc="Browse our library or upload your own 3D models in GLB/GLTF format."
                        />
                        <StepCard
                            number="3"
                            title="Start Collaborating"
                            desc="Invite participants and begin your interactive 3D learning session."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="relative rounded-[32px] p-12 md:p-20 text-center bg-gray-900 overflow-hidden shadow-2xl">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Learning?</h2>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Join thousands of educators and students already using HoloCollab today.
                        </p>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-10 py-4 rounded-full bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-all hover:scale-105 shadow-xl"
                        >
                            Get Started Free
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-12 bg-white">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-primary"></div>
                            <span className="font-bold text-lg text-gray-900">HoloCollab</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Revolutionizing education through immersive 3D collaboration.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">Product</h4>
                        <ul className="space-y-3 text-sm text-gray-500">
                            <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Demo</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
                        <ul className="space-y-3 text-sm text-gray-500">
                            <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">Legal</h4>
                        <ul className="space-y-3 text-sm text-gray-500">
                            <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
                    &copy; 2026 HoloCollab EduMeet. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, iconBg, title, desc }: { icon: any, iconBg: string, title: string, desc: string }) => (
    <div className="bg-white border border-gray-100 p-8 rounded-3xl hover:-translate-y-1 transition-all hover:shadow-xl shadow-sm">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-6`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
);

const StepCard = ({ number, title, desc }: { number: string, title: string, desc: string }) => (
    <div className="relative text-center z-10 pt-4">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white mx-auto mb-6 shadow-md border-4 border-gray-50">
            {number}
        </div>
        <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
    </div>
);

export default Home;
