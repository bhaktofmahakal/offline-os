'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both operator email and password.');
      return;
    }

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
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccess(true);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/';

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Access denied.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1E201E] font-sans antialiased flex flex-col justify-between selection:bg-[#557A5D]/20">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#E0DCD1] bg-[#FFFDF9] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1E201E] text-white flex items-center justify-center font-mono font-bold text-base shadow-xs">
            N
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#1E201E] tracking-tight flex items-center gap-2">
              NetworkOS
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#557A5D]/10 text-[#557A5D] border border-[#557A5D]/20">
                PRO v2.0
              </span>
            </h1>
            <p className="text-xs text-[#5A5E5A]">Autonomous Community Intelligence & Operator CRM</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#5A5E5A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#557A5D] animate-pulse" />
            <span>Edge Gateway Active</span>
          </div>
          <Link
            href="/apply"
            className="text-xs font-mono text-[#557A5D] hover:text-[#1E201E] flex items-center gap-1 transition-colors border border-[#E0DCD1] hover:border-[#557A5D]/50 px-2.5 py-1.5 rounded bg-[#F5F3EE]"
          >
            Candidate Portal &rarr;
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto p-4 sm:p-6 my-auto">
        <div className="bg-[#FFFDF9] border border-[#E0DCD1] rounded-xl p-7 sm:p-9 shadow-sm space-y-6">
          {/* Header block */}
          <div className="border-b border-[#E0DCD1] pb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A76245] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A76245]" />
                Executive Access Gate
              </span>
              <span className="text-[10px] font-mono text-[#5A5E5A] px-1.5 py-0.5 bg-[#F5F3EE] border border-[#E0DCD1] rounded">
                Restricted
              </span>
            </div>
            <h2 className="text-2xl font-serif font-normal text-[#1E201E] tracking-tight">
              Console Sign In
            </h2>
            <p className="text-xs text-[#5A5E5A] mt-1.5 leading-relaxed">
              Authenticate to unlock the members directory, VIP seating optimizer, deep intelligence lab, and syndicate ledger.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-[#C94A29]/10 border border-[#C94A29]/30 rounded text-xs text-[#C94A29] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-3.5 bg-[#557A5D]/10 border border-[#557A5D]/30 rounded text-xs text-[#557A5D] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Session verified. Unlocking console...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-[#1E201E] flex items-center justify-between">
                <span>Operator Email</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D] focus:ring-1 focus:ring-[#557A5D]/20 font-mono text-xs transition-colors disabled:opacity-50"
                />
                <Mail className="w-3.5 h-3.5 text-[#5A5E5A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-[#1E201E]">Password</label>
                <span className="text-[10px] font-mono text-[#5A5E5A]">case-sensitive</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full pl-9 pr-9 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D] focus:ring-1 focus:ring-[#557A5D]/20 font-mono text-xs transition-colors disabled:opacity-50"
                />
                <Lock className="w-3.5 h-3.5 text-[#5A5E5A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A5E5A] hover:text-[#1E201E] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-2.5 px-4 bg-[#1E201E] hover:bg-[#323632] text-white rounded font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : success ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A7C7A0]" />
                  <span>Access Granted</span>
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footnote inside card */}
          <div className="border-t border-[#E0DCD1] pt-4 flex items-center justify-between text-[11px] font-mono text-[#5A5E5A]">
            <span>Session: 30-Day Encrypted</span>
            <span className="text-[#557A5D] font-medium">HMAC-SHA256</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="border-t border-[#E0DCD1] bg-[#FFFDF9] py-3.5 px-6 text-center text-xs text-[#5A5E5A] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="font-mono text-[11px]">
          NetworkOS • Autonomous Relationship Intelligence & Founder Syndicate CRM
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <Link href="/apply" className="text-[#557A5D] hover:underline">
            Candidate Application
          </Link>
          <span className="text-[#E0DCD1]">|</span>
          <span className="text-[#8A918A]">Air-Gapped Vault</span>
        </div>
      </footer>
    </div>
  );
}
