import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ReactNode } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import SessionReport from './pages/SessionReport';
import Home from './pages/Home';
import JoinSession from './pages/JoinSession';
import PreJoinLobby from './pages/PreJoinLobby';
import CreateSession from './pages/CreateSession';
import TopicPrep from './pages/TopicPrep';

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

function App() {
  return (
    <AuthProvider>
      <Router>
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
          <Route path="/session/:sessionId/report" element={<ProtectedRoute><SessionReport /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
