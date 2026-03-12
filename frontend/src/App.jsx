import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Generate from './pages/Generate';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="app-content"><div className="skeleton skeleton-card" style={{ height: '200px' }} /></div>;
    if (!user) return <Navigate to="/welcome" replace />;
    return children;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="app-content"><div className="skeleton skeleton-card" style={{ height: '200px' }} /></div>;
    if (!user) return <Navigate to="/welcome" replace />;
    if (user.email !== 'radhamakwana28@gmail.com') return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/welcome" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>} />
            <Route path="/generate" element={<ProtectedRoute><Layout><Generate /></Layout></ProtectedRoute>} />
            <Route path="/quiz/:id" element={<ProtectedRoute><Layout><Quiz /></Layout></ProtectedRoute>} />
            <Route path="/results/:id" element={<ProtectedRoute><Layout><Results /></Layout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Layout><Admin /></Layout></AdminRoute>} />

            {/* Default: landing if not logged in, dashboard if logged in */}
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
