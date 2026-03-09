import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { UserPlus } from 'lucide-react';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name, role }),
            });
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
                <div className="floating-shape square s2" />
                <div className="floating-shape circle s5" />
            </div>

            <div className="glass-card w-full max-w-xl p-12 rounded-[40px] relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Create Profile</h2>
                    <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Start your spatial journey</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Full Name</label>
                            <input
                                className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900 font-bold placeholder:text-gray-300"
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>
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
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">Password</label>
                        <input
                            className="w-full px-5 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900 font-bold placeholder:text-gray-300"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-widest">I am a...</label>
                        <div className="grid grid-cols-2 gap-4">
                            {(['student', 'host'] as const).map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`
                                        py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2
                                        ${role === r
                                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-100'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}
                                    `}
                                >
                                    {r === 'student' ? 'Student' : 'Educator'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-black w-full py-5 text-sm mt-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 tracking-widest"
                    >
                        {loading ? 'CREATING...' : 'START LEARNING'}
                    </button>
                </form>

                <p className="mt-10 text-center text-sm text-gray-400 font-bold uppercase tracking-tight">
                    Already registered?{' '}
                    <Link to="/login" className="text-indigo-500 hover:underline">Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;