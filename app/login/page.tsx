'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('utsavmishraa005@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      setSuccess(true);
      // Retrieve redirect query parameter if present
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/';

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Access denied.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0b] text-[#f2f3f5] flex flex-col justify-between items-center p-4 sm:p-6 selection:bg-[#E05A47] selection:text-white relative overflow-hidden font-sans">
      {/* Subtle background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#E05A47]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#141618] border border-[#26282b] flex items-center justify-center shadow-md">
            <span className="font-mono font-bold text-sm text-[#E05A47]">N</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">NetworkOS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1b1e21] border border-[#2b2f33] text-[#8a8f98]">PRO v2.6</span>
            </div>
            <span className="text-[11px] text-[#636873]">Offline Founders Office</span>
          </div>
        </div>

        <Link
          href="/apply"
          className="text-xs text-[#8a8f98] hover:text-white transition-colors flex items-center gap-1 font-mono"
        >
          <span>Public Admissions Desk</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md my-auto py-8 z-10">
        <div className="bg-[#111315]/90 border border-[#232629] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          {/* Top Lock Badge */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#232629]">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#E05A47]">
              <Shield className="w-3.5 h-3.5" />
              <span>Internal Console Access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-[#8a8f98]">AIR-GAPPED AUTH</span>
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Executive Sign In
            </h1>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Enter verified master credentials to unlock member directory, private dossiers, seating optimizer, and intelligence lab.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in-50">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Credentials verified. Decrypting executive workspace...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#636873]" />
                <span>Authorized Operator Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="utsavmishraa005@gmail.com"
                className="w-full px-3.5 py-2.5 bg-[#17191c] border border-[#282c30] rounded-lg text-sm text-white placeholder-[#52565e] focus:outline-none focus:ring-1 focus:ring-[#E05A47] focus:border-[#E05A47] transition-all font-mono"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#636873]" />
                  <span>Master Password</span>
                </span>
                <span className="text-[10px] text-[#636873] lowercase">case sensitive</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#17191c] border border-[#282c30] rounded-lg text-sm text-white placeholder-[#52565e] focus:outline-none focus:ring-1 focus:ring-[#E05A47] focus:border-[#E05A47] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#636873] hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-2.5 px-4 bg-[#E05A47] text-white rounded-lg text-xs font-semibold hover:bg-[#E05A47]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#E05A47]/20 disabled:opacity-50 cursor-pointer font-mono tracking-wide"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Verifying Master Credentials...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Session Authenticated</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Unlock Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security details footnote */}
          <div className="mt-6 pt-4 border-t border-[#232629] flex items-center justify-between text-[11px] font-mono text-[#636873]">
            <span>Session: 30-Day Encrypted</span>
            <span className="text-emerald-500">HMAC-SHA256</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-3 text-center text-xs font-mono text-[#52565e] z-10">
        Confidential Operator Console &bull; Offline Private Syndicate &bull; All Access Logged
      </footer>
    </div>
  );
}
