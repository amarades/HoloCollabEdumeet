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
                <div className="tech-grid opacity-50" />
                <div className="floating-shape circle s1" />
                <div className="floating-shape square s7" />
            </div>

            <div className="glass-card w-full max-w-md p-12 rounded-[40px] relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Sign In</h2>
                    <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Welcome back to HoloCollab</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Email Address</label>
                        <input
                            className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900 font-bold placeholder:text-gray-300"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Password</label>
                        <input
                            className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900 font-bold placeholder:text-gray-300"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-black w-full py-5 text-sm mt-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 tracking-widest"
                    >
                        {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
                    </button>
                </form>

                <p className="mt-10 text-center text-sm text-gray-400 font-bold uppercase tracking-tight">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-indigo-500 hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
