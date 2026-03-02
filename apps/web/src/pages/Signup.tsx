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
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    role
                }),
            });

            // data matches the Token model: { access_token, token_type, user_name, role }
            login(data.access_token, {
                email: email,
                name: data.user_name,
                role: data.role
            });

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder-gray-400";

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Create Account</h2>
                    <p className="text-gray-500 mt-2 text-sm">Join the platform to get started</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('student')}
                                className={`py-3 px-4 rounded-xl border transition-all text-sm font-medium ${role === 'student' ? 'bg-primary/5 border-primary text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('host')}
                                className={`py-3 px-4 rounded-xl border transition-all text-sm font-medium ${role === 'host' ? 'bg-primary/5 border-primary text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                Host/Admin
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-full transition-all shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;