import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setMessage('Password reset instructions sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl shadow-lg border border-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
            {mode === 'login' ? 'Sign in to HRMS' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Enterprise Employee Lifecycle Management
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <div className="rounded-md shadow-sm space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                required
                className="input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <div className="text-danger text-sm text-center">{error}</div>}
          {message && <div className="text-success text-sm text-center">{message}</div>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center space-y-2 mt-4">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('signup')} className="text-sm text-primary hover:text-dark">Don't have an account? Sign up</button>
              <button onClick={() => setMode('reset')} className="text-sm text-secondary hover:text-text">Forgot your password?</button>
            </>
          ) : (
            <button onClick={() => setMode('login')} className="text-sm text-primary hover:text-dark">Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
