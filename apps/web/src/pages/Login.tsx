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
            // Using URLSearchParams for x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const data = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: formData,
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-panel p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Welcome Back</h2>
                    <p className="text-gray-500 mt-2 text-sm">Sign in to your account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder-gray-400"
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
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-full transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-primary hover:text-primary-hover transition-colors">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
