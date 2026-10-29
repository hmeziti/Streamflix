
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Watch } from './pages/Watch';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { isMockMode, supabase } from './services/supabase';

// En mode démo tout est accessible ; sinon on exige une session Supabase.
// Les droits admin sont vérifiés côté Worker (profiles.is_admin), pas ici.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'signed-in' | 'signed-out'>(isMockMode ? 'signed-in' : 'loading');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? 'signed-in' : 'signed-out'));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'signed-in' : 'signed-out');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (status === 'loading') return null;
  return status === 'signed-in' ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    // HashRouter : l'URL reflète la page (liens partageables, rechargement, bouton retour) sans config serveur
    <HashRouter>
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
    </HashRouter>
  );
};

export default App;
