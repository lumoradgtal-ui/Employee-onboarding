import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { Building2, UserCheck, Sparkles, ArrowRight } from 'lucide-react';

export default function Login() {
  const [portalType, setPortalType] = useState<'organization' | 'employee'>('organization');
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
          options: { data: { full_name: name, portal_type: portalType } },
        });
        if (error) throw error;
        setMessage('Registration successful! Please check your email for confirmation or sign in.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('hrms_last_portal', portalType);
      } else if (mode === 'reset') {
        try {
          const res = await api('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: email.trim() }),
          });
          setMessage(res.message || `Password reset instructions and temporary password dispatched to ${email}. Check your inbox!`);
        } catch (backendErr: any) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
          });
          if (error) throw backendErr?.message || error;
          setMessage('Password reset instructions sent to your email.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative CypherSwift Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#A00142]/15 to-[#3843C1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tl from-[#3843C1]/15 to-[#A00142]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-100 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#A00142]/10 to-[#3843C1]/10 border border-[#A00142]/20 mb-3">
            <Sparkles className="w-4 h-4 text-[#A00142]" />
            <span className="text-xs font-bold text-[#A00142] tracking-wide uppercase">HRMS Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#080809] tracking-tight">
            {mode === 'login' ? (portalType === 'organization' ? 'Organization Portal' : 'Employee Portal') : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            {portalType === 'organization' ? 'Enterprise Management & HR Leadership' : 'Staff Self-Service & Workspace Access'}
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        {mode === 'login' && (
          <div className="grid grid-cols-2 p-1 bg-gray-100/80 rounded-xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => { setPortalType('organization'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
                portalType === 'organization'
                  ? 'bg-gradient-to-r from-[#A00142] to-[#710171] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Organization Login
            </button>
            <button
              type="button"
              onClick={() => { setPortalType('employee'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
                portalType === 'employee'
                  ? 'bg-gradient-to-r from-[#3843C1] to-[#252BA0] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Employee Login
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {portalType === 'organization' ? 'Organization / Admin Email' : 'Employee Work Email'}
            </label>
            <input
              type="email"
              required
              className="input"
              placeholder={portalType === 'organization' ? 'admin@company.com' : 'employee@company.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('reset')} className="text-xs text-[#A00142] hover:underline font-semibold">
                    Forgot?
                  </button>
                )}
              </div>
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              portalType === 'organization'
                ? 'bg-gradient-to-r from-[#A00142] to-[#650036] hover:opacity-95 shadow-[#A00142]/20'
                : 'bg-gradient-to-r from-[#3843C1] to-[#1E258C] hover:opacity-95 shadow-[#3843C1]/20'
            } disabled:opacity-50 cursor-pointer`}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? `Sign in to ${portalType === 'organization' ? 'Organization' : 'Employee Self-Service'}` : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-gray-100">
          {mode === 'login' ? (
            <button onClick={() => setMode('signup')} className="text-xs text-[#A00142] font-semibold hover:underline">
              {portalType === 'organization' ? 'Register New Organization' : "Don't have an account? Sign up"}
            </button>
          ) : (
            <button onClick={() => setMode('login')} className="text-xs text-[#A00142] font-semibold hover:underline">
              Back to sign in
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
