import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Session = lazy(() => import('./pages/Session'));
const SessionReport = lazy(() => import('./pages/SessionReport'));
const Home = lazy(() => import('./pages/Home'));
const JoinSession = lazy(() => import('./pages/JoinSession'));
const PreJoinLobby = lazy(() => import('./pages/PreJoinLobby'));
const CreateSession = lazy(() => import('./pages/CreateSession'));
const TopicPrep = lazy(() => import('./pages/TopicPrep'));
const Profile = lazy(() => import('./pages/Profile'));

// Protected Route Component
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

import { TranscriptionProvider } from './context/TranscriptionContext';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TranscriptionProvider>
          <Router>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white">Loading EduMeet...</div>}>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/join" element={<JoinSession />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/session/:sessionId" element={
              <ProtectedRoute>
                <Session />
              </ProtectedRoute>
            } />

            {/* Pre-join lobby: camera/mic preview before entering room */}
            <Route path="/lobby" element={<PreJoinLobby />} />
            <Route path="/create-session" element={<ProtectedRoute><CreateSession /></ProtectedRoute>} />
            <Route path="/topic-prep" element={<ProtectedRoute><TopicPrep /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/session/:sessionId/report" element={<ProtectedRoute><SessionReport /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </Router>
        </TranscriptionProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
