'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role_title: '',
    bio_notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and Email are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // 1. Send to live n8n Webhook (orchestrator triggers Render Pipeline + Slack Notification)

      let data = null;
      try {
        const n8nRes = await fetch('https://n8n-render-utsav.onrender.com/webhook/new-offline-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_record_id: `applicant-web-${Date.now()}`,
            name: formData.name.trim(),
            email: formData.email.trim(),
            company: formData.company.trim() || undefined,
            role_title: formData.role_title.trim() || undefined,
            bio_notes: formData.bio_notes.trim() || undefined,
            source: 'public_application_form',
          }),
        });

        if (n8nRes.ok) {
          const rawText = await n8nRes.text();
          if (rawText) {
            try {
              data = JSON.parse(rawText);
            } catch (_) {}
          }
        }
      } catch (n8nErr) {
        console.warn('n8n webhook warning, falling back to direct pipeline:', n8nErr);
      }

      // 2. If n8n response was empty or bypassed, ensure direct evaluation from Render Pipeline
      if (!data || !data.fit_score) {
        const res = await fetch('https://offline-os.onrender.com/process-new-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_record_id: `applicant-web-${Date.now()}`,
            name: formData.name.trim(),
            email: formData.email.trim(),
            company: formData.company.trim() || undefined,
            role_title: formData.role_title.trim() || undefined,
            bio_notes: formData.bio_notes.trim() || undefined,
            source: 'public_application_form',
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        data = await res.json();
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }

  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1E201E] font-sans antialiased flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#E0DCD1] bg-[#FFFDF9] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#557A5D] text-white flex items-center justify-center font-serif font-bold text-base">
            O
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#1E201E] tracking-tight">Offline Club</h1>
            <p className="text-xs text-[#5A5E5A]">Membership Application Portal</p>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs font-mono text-[#557A5D] hover:text-[#1E201E] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Operator Console
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto p-6 sm:p-10 my-auto">
        {!result ? (
          <div className="bg-[#FFFDF9] border border-[#E0DCD1] rounded-xl p-8 shadow-sm space-y-6">
            <div className="border-b border-[#E0DCD1] pb-5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A76245] font-semibold">
                Cohort Application
              </span>
              <h2 className="text-2xl font-serif font-normal text-[#1E201E] mt-1">Join the Offline Community</h2>
              <p className="text-xs text-[#5A5E5A] mt-1.5 leading-relaxed">
                We curate high-trust peer networks for exceptional founders, technical leaders, and operators.
                Submit your profile below to undergo instant AI evaluation and synergy matching.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-[#C94A29]/10 border border-[#C94A29]/30 rounded text-xs text-[#C94A29] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-[#1E201E]">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-[#1E201E]">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="priya@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-[#1E201E]">Company / Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Nexus Dynamics"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-[#1E201E]">Current Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Co-Founder & CTO"
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#1E201E]">
                  Bio, Focus Area & What You Are Building
                </label>
                <textarea
                  rows={4}
                  placeholder="Share a short summary of your background, domain expertise, previous wins, and what stage you're currently building..."
                  value={formData.bio_notes}
                  onChange={(e) => setFormData({ ...formData, bio_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F3EE] border border-[#E0DCD1] rounded text-[#1E201E] placeholder:text-[#5A5E5A]/50 focus:outline-none focus:border-[#557A5D] leading-relaxed"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#557A5D] text-white font-medium rounded hover:bg-[#557A5D]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating via Cloud AI Pipeline...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Application for AI Evaluation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Live Result Screen */
          <div className="bg-[#FFFDF9] border border-[#E0DCD1] rounded-xl p-8 shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[#557A5D]">
              <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-serif font-normal text-[#1E201E]">
                  Application Ingested & Processed Live!
                </h2>
                <p className="text-xs text-[#5A5E5A]">
                  Your application has been evaluated by the AI Intelligence Engine and verified.
                </p>

              </div>
            </div>

            {/* AI Evaluation Summary Card */}
            <div className="bg-[#F5F3EE] border border-[#E0DCD1] rounded-lg p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#E0DCD1] pb-3">
                <div>
                  <div className="font-semibold text-sm text-[#1E201E]">{result.name}</div>
                  <div className="text-[#5A5E5A]">{result.role_title || 'Applicant'} at {result.company || 'Stealth'}</div>
                </div>
                {result.fit_score !== null && (
                  <div className="text-right">
                    <span className="font-mono text-[10px] uppercase text-[#5A5E5A]">Fit Score</span>
                    <div className="font-mono font-bold text-base text-[#557A5D]">{result.fit_score}/100</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <span className="text-[#5A5E5A]">Role Classification:</span>{' '}
                  <strong className="text-[#1E201E] uppercase">{result.role_type || 'N/A'} ({result.seniority || 'N/A'})</strong>
                </div>
                <div>
                  <span className="text-[#5A5E5A]">Sector Tags:</span>{' '}
                  <span className="text-[#A76245]">{(result.sector_tags || []).join(', ') || 'general'}</span>
                </div>
              </div>

              {result.fit_score_reasoning && (
                <div className="p-3 bg-[#FFFDF9] border border-[#E0DCD1] rounded text-[11px] text-[#1E201E] italic leading-relaxed">
                  &ldquo;{result.fit_score_reasoning}&rdquo;
                </div>
              )}


              {result.top_introductions && result.top_introductions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="font-mono text-[11px] font-semibold text-[#A76245] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Top Synergistic Introductions Identified:
                  </div>
                  <div className="space-y-1.5">
                    {result.top_introductions.map((intro: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-[#FFFDF9] border border-[#E0DCD1] rounded flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-[#1E201E]">{intro.matched_person_name}</strong>
                          <span className="text-[#5A5E5A] ml-1.5">({intro.shared_context})</span>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#557A5D]/10 text-[#557A5D] uppercase">
                          {intro.match_band} match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setResult(null);
                  setFormData({ name: '', email: '', company: '', role_title: '', bio_notes: '' });
                }}
                className="px-4 py-2 bg-[#FFFDF9] border border-[#E0DCD1] text-xs font-medium rounded hover:bg-[#F5F3EE] transition-colors"
              >
                Submit Another Application
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-[#557A5D] text-white text-xs font-medium rounded hover:bg-[#557A5D]/90 transition-colors"
              >
                Open in Operator Console →
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E0DCD1] py-4 text-center text-xs font-mono text-[#5A5E5A]">
        Offline OS • Real-Time AI Ingestion & Evaluation Engine
      </footer>
    </div>
  );
}
