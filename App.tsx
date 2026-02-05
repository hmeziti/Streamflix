
import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Watch } from './pages/Watch';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';

// Protected Route Component (Simplified for Demo)
// Fix: Use React.FC with explicit children definition to resolve "missing children" property errors when using nested JSX elements.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In a real app, use Supabase session context here
  const isAuthenticated = true; 
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/watch/:slug" element={
          <ProtectedRoute><Watch /></ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><Admin /></ProtectedRoute>
        } />
        <Route path="/title/:slug" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  );
};

export default App;
