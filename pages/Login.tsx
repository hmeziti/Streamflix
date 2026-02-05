import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isMockMode } from '../services/supabase';

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
    <div className="min-h-screen bg-cover bg-center flex items-center justify-center relative" style={{ backgroundImage: 'url(https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg)' }}>
      <div className="absolute inset-0 bg-black/60"></div>
      
      <div className="relative z-10 w-full max-w-md bg-black/75 p-16 rounded-md shadow-2xl">
         <h1 className="text-3xl font-bold mb-8">{isLogin ? 'Sign In' : 'Sign Up'}</h1>
         
         {isMockMode && (
           <div className="mb-4 bg-yellow-900/50 p-2 text-xs text-yellow-200 border border-yellow-700 rounded">
             Demo Mode: No backend connected. Click Sign In to enter.
           </div>
         )}

         {error && <div className="bg-orange-600 text-white text-sm p-3 rounded mb-4">{error}</div>}

         <form onSubmit={handleAuth} className="space-y-4">
           <input 
              type="email" 
              placeholder="Email or phone number" 
              className="w-full bg-[#333] rounded px-4 py-3 outline-none focus:bg-[#454545] text-white placeholder-gray-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
           />
           <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-[#333] rounded px-4 py-3 outline-none focus:bg-[#454545] text-white placeholder-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
           />
           <button type="submit" className="w-full bg-primary hover:bg-red-700 transition font-bold py-3 rounded mt-6">
              {isLogin ? 'Sign In' : 'Sign Up'}
           </button>
         </form>

         <div className="mt-6 text-gray-400 text-sm">
            {isLogin ? 'New to StreamFLIX? ' : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-white hover:underline">
              {isLogin ? 'Sign up now.' : 'Sign in.'}
            </button>
         </div>
      </div>
    </div>
  );
};