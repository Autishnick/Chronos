import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import capsulePic from '../assets/capsule.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      // Handle signup where email confirmation might be required in Supabase settings
      if (!isLogin && !data?.session) {
        setError('Success! But you must confirm your email first.');
      } else {
        navigate('/home');
      }
    }
    setLoading(false);
  };

  if (showSplash) {
    return (
      <div className="flex flex-col items-center justify-between h-[100svh] p-8 pb-16">
        <div className="flex-1 flex flex-col items-center justify-center w-full mt-8">
          <h1 className="text-7xl font-serif italic text-brand-light mb-16 drop-shadow-[0_0_20px_rgba(180,228,217,0.7)] tracking-wide">Chronos</h1>

          <div className="w-64 h-64 relative mb-12 flex items-center justify-center">
            {/* Background glow behind capsule */}
            <div className="absolute inset-0 bg-[#624BFF]/30 rounded-full blur-[40px]"></div>

            <img
              src={capsulePic}
              alt="Chronos Capsule"
              className="w-[120%] h-auto max-w-[300px] object-contain animate-float relative z-10"
            />
          </div>
        </div>

        <div className="w-full text-center px-4">
          <button
            type="button"
            onClick={() => setShowSplash(false)}
            className="btn-primary text-xl py-4 mb-6 shadow-[0_0_20px_rgba(98,75,255,0.4)] w-full max-w-[320px]"
          >
            Start your journey
          </button>

          <button
            onClick={() => {
              setIsLogin(true);
              setShowSplash(false);
            }}
            className="text-sm font-medium text-white/90 flex flex-col items-center mx-auto"
          >
            <span>Already have an account?</span>
            <span className="text-[#624BFF] underline mt-1 brightness-125">Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100svh] p-8">
      <div className="flex-1 flex flex-col mt-12 w-full max-w-sm mx-auto">
        <h2 className="text-4xl text-brand-light mb-12 text-center drop-shadow-md">Pack your memories</h2>

        <h3 className="text-center text-sm font-medium mb-6">
          {isLogin ? 'Sign in to your account' : 'Create an account'}
        </h3>

        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="volodevs@gmai.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass-input h-12 text-center w-full shadow-inner"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="glass-input h-12 text-center w-full shadow-inner"
          />

          <div className="flex items-center justify-center my-4 opacity-50">
            <div className="w-16 h-px bg-white"></div>
            <div className="mx-2 rotate-45 w-2 h-2 bg-white"></div>
            <div className="w-16 h-px bg-white"></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mb-3"
          >
            {loading ? 'Wait...' : isLogin ? 'Sign In with Email' : 'Sign Up with Email'}
          </button>


        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-6 text-sm text-center text-slate-400"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
