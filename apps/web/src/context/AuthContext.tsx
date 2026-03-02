import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AUTH_TOKEN_KEY } from '../services/api';

const USER_DATA_KEY = 'user_data';

interface User {
    email: string;
    name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    loginAsGuest: (name: string, role?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    // Loading is true initially to check for existing token
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_DATA_KEY);

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                // Corrupted data — clear it
                localStorage.removeItem(USER_DATA_KEY);
            }
        }
        setLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
    };

    const loginAsGuest = (name: string, role = 'student') => {
        const guestUser: User = { name, email: '', role };
        const guestToken = 'guest';
        setToken(guestToken);
        setUser(guestUser);
        localStorage.setItem(AUTH_TOKEN_KEY, guestToken);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(guestUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            loginAsGuest,
            logout,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
