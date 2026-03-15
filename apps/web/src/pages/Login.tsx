import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { LogIn } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            const data = await apiRequest('/api/auth/login', { method: 'POST', body: formData });
            login(data.access_token, { email, name: data.user_name, role: data.role });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4">
            {/* ── Background Elements ── */}
            <div className="premium-bg">
                <div className="floating-shape circle s2" />
                <div className="floating-shape square s5" />
                <div className="floating-shape circle s7" />
            </div>

            <div className="glass-card w-full max-w-md p-12 rounded-[40px] relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/40">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tight">Sign In</h2>
                    <p className="text-purple-300/60 font-bold mt-2 uppercase tracking-widest text-xs">Welcome back to HoloCollab</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-purple-300/70 ml-1 uppercase tracking-widest">Email Address</label>
                        <input
                            className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none focus:border-purple-500 focus:bg-white/10 transition-all text-white font-bold placeholder:text-white/20"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-purple-300/70 ml-1 uppercase tracking-widest">Password</label>
                        <input
                            className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none focus:border-purple-500 focus:bg-white/10 transition-all text-white font-bold placeholder:text-white/20"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-black w-full py-5 text-sm mt-4 rounded-2xl shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 tracking-widest"
                    >
                        {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
                    </button>
                </form>

                <p className="mt-10 text-center text-sm text-white/40 font-bold uppercase tracking-tight">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
