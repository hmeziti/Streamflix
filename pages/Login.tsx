import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isMockMode } from '../services/supabase';
import loginBackdrop from '../4pvdbj19xv02.jpg';

const inputClass =
  'h-12 w-full rounded-[10px] border border-line bg-surface-2 px-4 text-foreground outline-hidden transition placeholder:text-subtle focus:border-zinc-400';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isMockMode) {
      // Allow demo access without real auth
      navigate('/');
      return;
    }

    if (!supabase) return;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <img src={loginBackdrop} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover blur-[48px] brightness-[0.35] saturate-[0.6]" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-background/80 p-8 shadow-2xl backdrop-blur md:p-12">
        <p className="mb-8 font-display text-2xl font-extrabold tracking-[-0.02em] text-primary">STREAMFLIX</p>
        <h1 className="mb-6 font-display text-3xl font-extrabold tracking-[-0.02em]">{isLogin ? 'Se connecter' : 'Créer un compte'}</h1>

        {isMockMode && (
          <div className="mb-4 rounded-[10px] border border-amber-700/60 bg-amber-950/50 p-3 text-xs text-amber-200">
            Mode démo : aucun backend connecté. Valide le formulaire pour entrer.
          </div>
        )}

        {error && <div role="alert" className="mb-4 rounded-[10px] bg-primary/15 p-3 text-sm text-primary-text">{error}</div>}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Email
            <input type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Mot de passe
            <input
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="mt-4 h-12 rounded-[10px] bg-primary font-semibold text-white transition hover:bg-primary-hover">
            {isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {isLogin ? 'Nouveau sur StreamFLIX ? ' : 'Déjà un compte ? '}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-medium text-foreground hover:underline">
            {isLogin ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
};
