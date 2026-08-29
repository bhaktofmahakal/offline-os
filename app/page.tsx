'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {

  Users,
  CopyCheck,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Database,
  Terminal,
  Sun,
  Moon,
  Copy,
  Check,
  Building,
  Briefcase,
  Mail,
  FileText,
  Activity,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  FileSpreadsheet,
  X,
  Play,
  CheckCircle
} from 'lucide-react';


interface Person {
  id: number;
  source_record_id: string;
  name: string;
  email: string | null;
  email_normalized: string | null;
  company: string | null;
  role_title: string | null;
  bio_notes: string | null;
  source: string;
  role_type: string | null;
  seniority: string | null;
  sector_tags: string[];
  community_fit_tags: string[];
  fit_score: number | null;
  fit_score_reasoning: string | null;
  is_duplicate_of: number | null;
  duplicate_confidence: number | null;
  is_incomplete: boolean;
  missing_fields: string[];
  ai_enrichment_status: string;
}

interface Introduction {
  id: number;
  person_a_id: number;
  person_b_id: number;
  match_score: number;
  match_band: 'strong' | 'good' | 'moderate';
  shared_context: string;
  suggested_intro: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'dismissed';
  person_a: Partial<Person>;
  person_b: Partial<Person>;
}

export default function OfflineCRM() {
  const [people, setPeople] = useState<Person[]>([]);
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'duplicates' | 'intros'>('people');
  const [searchQuery, setSearchQuery] = useState('');



  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [introStatusFilter, setIntroStatusFilter] = useState('ALL');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);
  const [copiedIntroId, setCopiedIntroId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Airtable Batch Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; logs: string[] }>({
    current: 0,
    total: 0,
    logs: [],
  });

  const handleLoadSampleAirtableData = () => {
    const sample = `Name,Email,Company,Role,Bio
Dr. Elena Rostova,elena.rostova@biosynthetica.health,BioSynthetica Dynamics,Founder & CEO,Building programmable RNA therapies and synthetic genomics delivery vectors. Ex-Genentech Director of Genomic Medicine.
Marcus Vance,marcus.vance@solaronmicro.energy,Solaron Microgrids,Co-Founder & CTO,Developing solid-state perovskite solar microgrids for autonomous edge computing and remote industrial facilities. Ex-Tesla Solar architect.
Tara Sen,tara.sen@stratalink.dev,Stratalink Systems,Founder,Building AI-native distributed SQL query planners for real-time streaming data lakes. Former senior database engineer at Snowflake.`;
    setImportText(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setImportText(text);
    };
    reader.readAsText(file);
  };

  const parseCSVRows = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
    const records: Array<{ name: string; email: string; company?: string; role_title?: string; bio_notes?: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const record: any = {};
      headers.forEach((h, idx) => {
        const val = parts[idx] || '';
        if (h.includes('name')) record.name = val;
        else if (h.includes('email') || h.includes('mail')) record.email = val;
        else if (h.includes('company') || h.includes('org')) record.company = val;
        else if (h.includes('role') || h.includes('title')) record.role_title = val;
        else if (h.includes('bio') || h.includes('note')) record.bio_notes = val;
      });

      if (!record.name && parts[0]) record.name = parts[0];
      if (!record.email && parts[1]) record.email = parts[1];
      if (!record.company && parts[2]) record.company = parts[2];
      if (!record.role_title && parts[3]) record.role_title = parts[3];
      if (!record.bio_notes && parts[4]) record.bio_notes = parts.slice(4).join(', ');

      if (record.name) records.push(record);
    }
    return records;
  };

  const handleExecuteBatchImport = async () => {
    if (!importText.trim()) return;
    const parsed = parseCSVRows(importText);
    if (parsed.length === 0) {
      alert('Could not parse any valid rows. Ensure format is: Name, Email, Company, Role, Bio');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: parsed.length, logs: [`🚀 Starting batch ingestion of ${parsed.length} Airtable records...`] });

    for (let idx = 0; idx < parsed.length; idx++) {
      const row = parsed[idx];
      try {
        const res = await fetch('https://offline-os.onrender.com/process-new-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_record_id: `airtable-import-${Date.now()}-${idx}`,
            name: row.name,
            email: row.email,
            company: row.company,
            role_title: row.role_title,
            bio_notes: row.bio_notes,
            source: 'airtable_batch_import',
          }),
        });

        const data = await res.json();
        const scoreText = data.fit_score ? `Fit: ${data.fit_score}/100` : 'Duplicate Flagged';
        const introsText = data.top_introductions ? ` | ${data.top_introductions.length} Intros` : '';
        const logMsg = `[${idx + 1}/${parsed.length}] ✅ ${row.name} (${row.company || 'Ind.'}) ➔ ${scoreText}${introsText}`;

        setImportProgress(prev => ({
          ...prev,
          current: idx + 1,
          logs: [...prev.logs, logMsg]
        }));
      } catch (err: any) {
        setImportProgress(prev => ({
          ...prev,
          current: idx + 1,
          logs: [...prev.logs, `[${idx + 1}/${parsed.length}] ❌ Error processing ${row.name}: ${err.message}`]
        }));
      }
    }

    setImportProgress(prev => ({
      ...prev,
      logs: [...prev.logs, '🎉 Batch processing complete! Refreshing live console...']
    }));

    await fetchData();
    setImporting(false);
  };


  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load Data from Supabase API
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [peopleRes, introsRes] = await Promise.all([
        fetch('/api/people'),
        fetch('/api/introductions')
      ]);
      const peopleData = await peopleRes.json();
      const introsData = await introsRes.json();

      if (peopleData.people) setPeople(peopleData.people);
      if (introsData.introductions) setIntroductions(introsData.introductions);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update intro status in Supabase
  const handleUpdateIntroStatus = async (id: number, newStatus: 'approved' | 'dismissed') => {
    try {
      setIntroductions(prev =>
        prev.map(intro => (intro.id === id ? { ...intro, status: newStatus } : intro))
      );
      await fetch('/api/introductions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (err) {
      console.error('Error updating introduction status:', err);
    }
  };

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = people.length;
    const duplicates = people.filter(p => p.is_duplicate_of !== null).length;
    const canonical = total - duplicates;
    const incomplete = people.filter(p => p.is_incomplete).length;
    const scores = people.map(p => p.fit_score).filter((s): s is number => s !== null);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const pendingIntros = introductions.filter(i => i.status === 'pending').length;
    const approvedIntros = introductions.filter(i => i.status === 'approved').length;

    return { total, duplicates, canonical, incomplete, avgScore, pendingIntros, approvedIntros };
  }, [people, introductions]);

  // Filtered People
  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.company && p.company.toLowerCase().includes(query)) ||
        (p.role_title && p.role_title.toLowerCase().includes(query)) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.sector_tags && p.sector_tags.some(t => t.toLowerCase().includes(query))) ||
        (p.community_fit_tags && p.community_fit_tags.some(t => t.toLowerCase().includes(query)));

      // Role Filter
      const matchRole = roleFilter === 'ALL' || (p.role_type && p.role_type.toUpperCase() === roleFilter);

      // Sector Filter
      const matchSector =
        sectorFilter === 'ALL' ||
        (p.sector_tags && p.sector_tags.some(t => t.toLowerCase().includes(sectorFilter.toLowerCase())));

      // Status Filter
      let matchStatus = true;
      if (statusFilter === 'CANONICAL') matchStatus = p.is_duplicate_of === null;
      if (statusFilter === 'DUPLICATES') matchStatus = p.is_duplicate_of !== null;
      if (statusFilter === 'INCOMPLETE') matchStatus = p.is_incomplete;
      if (statusFilter === 'HIGH_FIT') matchStatus = p.fit_score !== null && p.fit_score >= 80;

      return matchSearch && matchRole && matchSector && matchStatus;
    });
  }, [people, searchQuery, roleFilter, sectorFilter, statusFilter]);

  // Duplicate Pairs
  const duplicatePairs = useMemo(() => {
    const peopleMap = new Map(people.map(p => [p.id, p]));
    return people
      .filter(p => p.is_duplicate_of !== null)
      .map(dup => {
        const canonical = peopleMap.get(dup.is_duplicate_of!);
        return { duplicate: dup, canonical };
      });
  }, [people]);

  // Filtered Introductions
  const filteredIntros = useMemo(() => {
    if (introStatusFilter === 'ALL') return introductions;
    return introductions.filter(i => i.status.toUpperCase() === introStatusFilter);
  }, [introductions, introStatusFilter]);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIntroId(id);
    setTimeout(() => setCopiedIntroId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans">
      {/* 1. PERSISTENT LEFT NAVIGATION RAIL (DESIGN.md specification) */}
      <aside className="w-64 border-r border-line bg-surface flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Brand Header */}
          <div className="h-14 border-b border-line flex items-center px-5 gap-3">
            <div className="w-6 h-6 rounded bg-signal flex items-center justify-center text-surface text-xs font-mono font-bold">
              O
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-ink flex items-center gap-2">
                Offline OS
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20">
                  CRM v1.0
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Workspace
            </div>
            <button
              onClick={() => setActiveTab('people')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                activeTab === 'people'
                  ? 'bg-signal-soft text-ink font-semibold border-l-2 border-signal'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Members Directory</span>
              </div>
              <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface border border-line text-ink-muted">
                {people.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('duplicates')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                activeTab === 'duplicates'
                  ? 'bg-signal-soft text-ink font-semibold border-l-2 border-signal'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CopyCheck className="w-4 h-4 text-warning" />
                <span>Duplicates Queue</span>
              </div>
              {metrics.duplicates > 0 && (
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-warning-soft text-warning border border-warning/30">
                  {metrics.duplicates}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('intros')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                activeTab === 'intros'
                  ? 'bg-signal-soft text-ink font-semibold border-l-2 border-signal'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-copper" />
                <span>Introductions</span>
              </div>
              <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface border border-line text-ink-muted">
                {introductions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Meta & Theme Switcher */}

        <div className="p-3 border-t border-line space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-ink-muted font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
              Database Synced
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 rounded hover:bg-surface-muted transition-colors text-ink"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT REGION */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Operational Bar */}
        <header className="h-14 border-b border-line bg-surface px-6 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, company, title, sector, tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-9 pr-3 text-xs bg-surface-raised border border-line rounded focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal text-ink placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-8 px-3 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Batch import Airtable CSV export or paste raw rows"
            >
              <UploadCloud className="w-3.5 h-3.5 text-signal" />
              <span>Import Airtable / CSV</span>
            </button>
            <Link
              href="/apply"
              target="_blank"
              className="h-8 px-3 text-xs bg-signal text-surface font-medium hover:bg-signal/90 rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Public Apply Form</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="h-8 px-3 text-xs border border-line hover:bg-surface-muted rounded text-ink flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="h-4 w-px bg-line"></div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-signal"></span>
              <span>Pipeline Active</span>
            </div>
          </div>


        </header>


        {/* KPI Metric Summary Strip */}
        <section className="bg-surface border-b border-line px-6 py-3 grid grid-cols-6 gap-4">
          <div className="border-r border-line pr-3">
            <div className="text-[11px] font-mono text-ink-muted uppercase">Total Ingested</div>
            <div className="text-lg font-semibold tabular-nums text-ink">{metrics.total}</div>
          </div>
          <div className="border-r border-line pr-3">
            <div className="text-[11px] font-mono text-ink-muted uppercase">Canonical Members</div>
            <div className="text-lg font-semibold tabular-nums text-signal">{metrics.canonical}</div>
          </div>
          <div className="border-r border-line pr-3">
            <div className="text-[11px] font-mono text-ink-muted uppercase">Duplicates Flagged</div>
            <div className="text-lg font-semibold tabular-nums text-warning">{metrics.duplicates}</div>
          </div>
          <div className="border-r border-line pr-3">
            <div className="text-[11px] font-mono text-ink-muted uppercase">Incomplete Profiles</div>
            <div className="text-lg font-semibold tabular-nums text-danger">{metrics.incomplete}</div>
          </div>
          <div className="border-r border-line pr-3">
            <div className="text-[11px] font-mono text-ink-muted uppercase">Avg Fit Score</div>
            <div className="text-lg font-semibold tabular-nums text-ink">{metrics.avgScore} <span className="text-xs text-ink-faint">/ 100</span></div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-ink-muted uppercase">Pending Intros</div>
            <div className="text-lg font-semibold tabular-nums text-copper">{metrics.pendingIntros}</div>
          </div>
        </section>

        {/* TAB 1: MEMBERS DIRECTORY VIEW */}
        {activeTab === 'people' && (
          <div className="flex-1 flex flex-col min-h-0 bg-canvas">
            {/* Filter Toolbar */}
            <div className="px-6 py-2.5 border-b border-line bg-surface-muted/50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-ink-muted font-mono flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filters:
                </span>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="h-7 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Roles</option>
                  <option value="FOUNDER">Founders</option>
                  <option value="OPERATOR">Operators</option>
                  <option value="APPLICANT">Applicants</option>
                  <option value="INVESTOR">Investors</option>
                </select>

                {/* Sector Filter */}
                <select
                  value={sectorFilter}
                  onChange={e => setSectorFilter(e.target.value)}
                  className="h-7 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Sectors</option>
                  <option value="fintech">Fintech</option>
                  <option value="climate">Climate</option>
                  <option value="dev tools">DevTools / Infra</option>
                  <option value="health">Health</option>
                  <option value="consumer">Consumer</option>
                  <option value="ai">AI</option>
                  <option value="ops">Ops / SaaS</option>
                </select>

                {/* Quality Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-7 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Records</option>
                  <option value="CANONICAL">Canonical Only</option>
                  <option value="DUPLICATES">Flagged Duplicates</option>
                  <option value="INCOMPLETE">Incomplete Profiles</option>
                  <option value="HIGH_FIT">High Fit (80+)</option>
                </select>
              </div>

              <div className="text-xs font-mono text-ink-muted tabular-nums">
                Showing {filteredPeople.length} of {people.length} members
              </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-surface border-b border-line text-ink-muted font-mono uppercase text-[11px] z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold w-12">ID</th>
                    <th className="py-2.5 px-4 font-semibold">Member & Company</th>
                    <th className="py-2.5 px-4 font-semibold">Role / Seniority</th>
                    <th className="py-2.5 px-4 font-semibold">Sector Tags</th>
                    <th className="py-2.5 px-4 font-semibold">Fit Score</th>
                    <th className="py-2.5 px-4 font-semibold">Status / Flags</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted font-mono">
                        Loading database records from Supabase...
                      </td>
                    </tr>
                  ) : filteredPeople.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted">
                        No members match your current filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredPeople.map(person => {
                      const isDup = person.is_duplicate_of !== null;
                      return (
                        <tr
                          key={person.id}
                          onClick={() => setSelectedPerson(person)}
                          className={`hover:bg-surface-muted/60 transition-colors cursor-pointer ${
                            isDup ? 'bg-warning-soft/20 opacity-85' : ''
                          }`}
                        >
                          {/* ID */}
                          <td className="py-3 px-4 font-mono text-ink-faint text-[11px] tabular-nums">
                            #{person.id}
                          </td>

                          {/* Member & Company */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                              {person.name}
                              {person.is_incomplete && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-danger inline-block"
                                  title={`Incomplete record: missing ${person.missing_fields?.join(', ')}`}
                                ></span>
                              )}
                            </div>
                            <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                              <span>{person.role_title || 'No Title'}</span>
                              <span className="text-line-strong">•</span>
                              <span className="font-medium text-ink">
                                {person.company || <span className="italic text-ink-faint">Independent</span>}
                              </span>
                            </div>
                          </td>

                          {/* Role / Seniority */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {person.role_type && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-signal-soft text-signal border border-signal/20 font-medium">
                                  {person.role_type}
                                </span>
                              )}
                              {person.seniority && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono capitalize bg-surface-muted text-ink-muted border border-line">
                                  {person.seniority}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sector Tags */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 flex-wrap max-w-xs">
                              {(person.sector_tags || []).slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-info-soft text-info border border-info/20 lowercase"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {(person.sector_tags || []).length > 3 && (
                                <span className="text-[10px] font-mono text-ink-faint">
                                  +{(person.sector_tags || []).length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Fit Score with Popover Reasoning Tooltip */}
                          <td className="py-3 px-4 relative">
                            {person.fit_score !== null ? (
                              <div
                                onMouseEnter={() => setActiveTooltipId(person.id)}
                                onMouseLeave={() => setActiveTooltipId(null)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded font-mono font-semibold text-xs cursor-help border"
                                style={{
                                  backgroundColor:
                                    person.fit_score >= 80
                                      ? 'var(--color-signal-soft)'
                                      : person.fit_score >= 60
                                      ? 'var(--color-info-soft)'
                                      : 'var(--color-surface-muted)',
                                  borderColor:
                                    person.fit_score >= 80
                                      ? 'var(--color-signal)'
                                      : person.fit_score >= 60
                                      ? 'var(--color-info)'
                                      : 'var(--color-line-strong)',
                                  color:
                                    person.fit_score >= 80
                                      ? 'var(--color-signal)'
                                      : person.fit_score >= 60
                                      ? 'var(--color-info)'
                                      : 'var(--color-ink-muted)',
                                }}
                              >
                                <span className="tabular-nums">{person.fit_score}</span>
                                <span className="text-[10px] font-normal opacity-70">/100</span>

                                {/* Hover Tooltip Popover */}
                                {activeTooltipId === person.id && (
                                  <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-surface-raised border border-line-strong rounded-lg shadow-xl text-xs z-30 pointer-events-none text-ink font-sans">
                                    <div className="font-semibold text-ink border-b border-line pb-1 mb-1.5 flex justify-between items-center">
                                      <span>Fit Score Breakdown</span>
                                      <span className="font-mono text-signal">{person.fit_score}/100</span>
                                    </div>
                                    <p className="text-ink-muted text-[11px] leading-relaxed italic">
                                      "{person.fit_score_reasoning || 'Deterministic applicant rubric evaluated.'}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-ink-faint text-[11px]">—</span>
                            )}
                          </td>

                          {/* Quality / Duplicate Flags */}
                          <td className="py-3 px-4">
                            {isDup ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-warning-soft text-warning border border-warning/30">
                                <AlertTriangle className="w-3 h-3" /> Duplicate of #{person.is_duplicate_of}
                              </span>
                            ) : person.is_incomplete ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-danger-soft text-danger border border-danger/30">
                                Incomplete ({person.missing_fields?.length || 0})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-signal">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Canonical
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPerson(person);
                              }}
                              className="text-xs text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-raised border border-transparent hover:border-line"
                            >
                              Details <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DUPLICATES REVIEW QUEUE */}
        {activeTab === 'duplicates' && (
          <div className="flex-1 overflow-auto p-6 bg-canvas space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Duplicates Review Queue</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Side-by-side comparison of candidate duplicate pairs detected by RapidFuzz and adjudicated by Gemini 3.5.
                </p>
              </div>
              <div className="text-xs font-mono px-2.5 py-1 rounded bg-warning-soft text-warning border border-warning/30 font-semibold">
                {duplicatePairs.length} Ambiguous / Duplicate Pairs
              </div>
            </div>

            {/* Prototype Notice Banner */}
            <div className="p-3 bg-info-soft/40 border border-info/30 rounded text-xs text-ink flex items-start gap-2.5">
              <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-info">Prototype Architecture Note:</span> Real destructive record merging is intentionally out of scope to preserve audit provenance. Duplicates are safely linked via foreign key <code className="font-mono text-[11px] bg-surface px-1 rounded">people.is_duplicate_of</code> to prevent accidental data loss.
              </div>
            </div>

            {/* Duplicate Pair Cards */}
            <div className="space-y-4">
              {duplicatePairs.map(({ duplicate, canonical }, idx) => (
                <div
                  key={idx}
                  className="bg-surface border border-line rounded-lg p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-warning-soft text-warning border border-warning/30">
                        Pair #{idx + 1}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">
                        Confidence: <strong className="text-ink">{Math.round((duplicate.duplicate_confidence || 0.95) * 100)}%</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`Stub Action: Merge ${duplicate.name} (#${duplicate.id}) into canonical #${canonical?.id}. Note: Preserving source provenance in prototype.`)}
                        className="px-3 py-1 text-xs rounded bg-signal text-surface font-medium hover:bg-signal/90 transition-colors"
                      >
                        Merge into Canonical
                      </button>
                      <button
                        onClick={() => alert(`Stub Action: Dismiss duplicate flag for #${duplicate.id}.`)}
                        className="px-3 py-1 text-xs rounded bg-surface border border-line text-ink hover:bg-surface-muted transition-colors"
                      >
                        Dismiss Flag
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side Diff */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Canonical */}
                    <div className="p-3.5 bg-signal-soft/20 border border-signal/20 rounded">
                      <div className="text-[11px] font-mono font-semibold text-signal uppercase mb-2 flex items-center justify-between">
                        <span>Canonical Record (Primary)</span>
                        <span>#{canonical?.id || '—'}</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-ink-faint">Name:</span> <strong className="text-ink">{canonical?.name}</strong>
                        </div>
                        <div>
                          <span className="text-ink-faint">Company:</span> <span className="text-ink">{canonical?.company || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-ink-faint">Role:</span> <span className="text-ink">{canonical?.role_title || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-ink-faint">Email:</span> <span className="font-mono text-ink-muted text-[11px]">{canonical?.email_normalized || canonical?.email || 'None'}</span>
                        </div>
                        <div className="pt-1 text-[11px] text-ink-muted italic">
                          "{canonical?.bio_notes || 'No bio notes'}"
                        </div>
                      </div>
                    </div>

                    {/* Right: Duplicate Candidate */}
                    <div className="p-3.5 bg-warning-soft/20 border border-warning/30 rounded">
                      <div className="text-[11px] font-mono font-semibold text-warning uppercase mb-2 flex items-center justify-between">
                        <span>Duplicate Record (Candidate)</span>
                        <span>#{duplicate.id}</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-ink-faint">Name:</span> <strong className="text-ink">{duplicate.name}</strong>
                        </div>
                        <div>
                          <span className="text-ink-faint">Company:</span> <span className="text-ink">{duplicate.company || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-ink-faint">Role:</span> <span className="text-ink">{duplicate.role_title || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-ink-faint">Email:</span> <span className="font-mono text-ink-muted text-[11px]">{duplicate.email_normalized || duplicate.email || 'None'}</span>
                        </div>
                        <div className="pt-1 text-[11px] text-ink-muted italic">
                          "{duplicate.bio_notes || 'No bio notes'}"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning Strip */}
                  <div className="p-2.5 bg-surface-muted rounded text-xs text-ink-muted flex items-start gap-2 font-mono text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-copper flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ink">Adjudication Rationale:</span> {duplicate.fit_score_reasoning?.replace('Duplicate record - excluded from fit scoring.', '') || `RapidFuzz + Gemini confirmed duplicate confidence ${Math.round((duplicate.duplicate_confidence || 0.95)*100)}%.`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INTRODUCTIONS WORKSPACE */}
        {activeTab === 'intros' && (
          <div className="flex-1 flex flex-col min-h-0 bg-canvas">
            {/* Introductions Toolbar */}
            <div className="px-6 py-2.5 border-b border-line bg-surface flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-ink-muted font-mono">Filter Status:</span>
                <select
                  value={introStatusFilter}
                  onChange={e => setIntroStatusFilter(e.target.value)}
                  className="h-7 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Statuses ({introductions.length})</option>
                  <option value="PENDING">Pending Review ({metrics.pendingIntros})</option>
                  <option value="APPROVED">Approved ({metrics.approvedIntros})</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>
              <div className="text-xs font-mono text-ink-muted">
                Showing {filteredIntros.length} intro matches generated by pgvector & Gemini
              </div>
            </div>

            {/* Introductions List */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {filteredIntros.map((intro) => {
                const isApproved = intro.status === 'approved';
                const isDismissed = intro.status === 'dismissed';

                return (
                  <div
                    key={intro.id}
                    className={`bg-surface border rounded-lg p-5 shadow-sm space-y-3.5 transition-all ${
                      isApproved
                        ? 'border-signal bg-signal-soft/10'
                        : isDismissed
                        ? 'border-line opacity-50 bg-surface-muted/30'
                        : 'border-line'
                    }`}
                  >
                    {/* Header: Score Band & Direct Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            intro.match_band === 'strong'
                              ? 'bg-signal-soft text-signal border-signal/30'
                              : intro.match_band === 'good'
                              ? 'bg-info-soft text-info border-info/30'
                              : 'bg-surface-muted text-ink-muted border-line'
                          }`}
                        >
                          {intro.match_band} match • {Math.round(intro.match_score * 100)}% similarity
                        </span>
                        <span className="text-xs font-semibold text-ink px-2 py-0.5 rounded bg-surface-muted border border-line">
                          {intro.shared_context}
                        </span>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateIntroStatus(intro.id, 'approved')}
                          className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1.5 transition-colors ${
                            isApproved
                              ? 'bg-signal text-surface'
                              : 'bg-surface border border-line text-ink hover:bg-signal-soft hover:text-signal'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isApproved ? 'Approved' : 'Approve Intro'}
                        </button>
                        <button
                          onClick={() => handleUpdateIntroStatus(intro.id, 'dismissed')}
                          className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1.5 transition-colors ${
                            isDismissed
                              ? 'bg-danger text-surface'
                              : 'bg-surface border border-line text-ink-muted hover:bg-danger-soft hover:text-danger'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {isDismissed ? 'Dismissed' : 'Dismiss'}
                        </button>
                      </div>
                    </div>

                    {/* Member A & Member B Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-raised border border-line rounded">
                        <div className="text-[11px] font-mono text-ink-faint uppercase">Member A</div>
                        <div className="font-semibold text-sm text-ink">{intro.person_a.name}</div>
                        <div className="text-xs text-ink-muted">
                          {intro.person_a.role_title} at <strong className="text-ink">{intro.person_a.company || 'Independent'}</strong>
                        </div>
                      </div>

                      <div className="p-3 bg-surface-raised border border-line rounded">
                        <div className="text-[11px] font-mono text-ink-faint uppercase">Member B</div>
                        <div className="font-semibold text-sm text-ink">{intro.person_b.name}</div>
                        <div className="text-xs text-ink-muted">
                          {intro.person_b.role_title} at <strong className="text-ink">{intro.person_b.company || 'Independent'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Suggested Icebreaker Draft */}
                    <div className="p-3 bg-surface-muted/60 border-l-2 border-copper rounded-r space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-copper font-semibold">
                        <span>Suggested Intro Draft:</span>
                        <button
                          onClick={() => copyToClipboard(intro.suggested_intro, intro.id)}
                          className="flex items-center gap-1 hover:text-ink transition-colors"
                        >
                          {copiedIntroId === intro.id ? (
                            <>
                              <Check className="w-3 h-3 text-signal" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Draft
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-ink italic font-serif leading-relaxed">
                        "{intro.suggested_intro}"
                      </p>
                    </div>

                    {/* AI Synergy Reasoning */}
                    <div className="text-xs text-ink-muted">
                      <span className="font-semibold text-ink">Mutual Synergy:</span> {intro.reasoning}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>


      {/* 3. DETAIL DRAWER (When a Person is Selected) */}
      {selectedPerson && (
        <aside className="w-96 border-l border-line bg-surface flex flex-col justify-between flex-shrink-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Member Details</h3>
            <button
              onClick={() => setSelectedPerson(null)}
              className="p-1 rounded hover:bg-surface-muted text-ink-muted hover:text-ink"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-5 text-xs">
            {/* Header Identity */}
            <div>
              <h2 className="text-base font-bold text-ink">{selectedPerson.name}</h2>
              <div className="text-ink-muted mt-0.5">
                {selectedPerson.role_title} at <strong className="text-ink">{selectedPerson.company || 'Independent'}</strong>
              </div>
              <div className="font-mono text-[11px] text-ink-faint mt-1">
                {selectedPerson.email_normalized || selectedPerson.email || 'No email provided'}
              </div>
            </div>

            {/* Fit Score & Reasoning */}
            {selectedPerson.fit_score !== null && (
              <div className="p-3.5 bg-signal-soft/30 border border-signal/30 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-signal uppercase text-[11px]">Applicant Fit Score</span>
                  <span className="text-base font-mono font-bold text-signal">{selectedPerson.fit_score}/100</span>
                </div>
                <p className="text-ink text-[11px] leading-relaxed italic">
                  "{selectedPerson.fit_score_reasoning}"
                </p>
              </div>
            )}

            {/* Bio Notes */}
            <div className="space-y-1">
              <span className="font-mono text-[11px] uppercase text-ink-muted">Bio & Operator Notes</span>
              <p className="p-3 bg-surface-muted/60 border border-line rounded text-ink leading-relaxed">
                {selectedPerson.bio_notes || <span className="italic text-ink-faint">No bio notes supplied.</span>}
              </p>
            </div>

            {/* Classification Metadata */}
            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase text-ink-muted">AI Classification</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface-raised border border-line rounded">
                  <div className="text-ink-faint text-[10px]">Role Type</div>
                  <div className="font-mono font-semibold text-ink capitalize">{selectedPerson.role_type || '—'}</div>
                </div>
                <div className="p-2.5 bg-surface-raised border border-line rounded">
                  <div className="text-ink-faint text-[10px]">Seniority</div>
                  <div className="font-mono font-semibold text-ink capitalize">{selectedPerson.seniority || '—'}</div>
                </div>
              </div>
            </div>

            {/* Community Fit Tags */}
            <div className="space-y-1.5">
              <span className="font-mono text-[11px] uppercase text-ink-muted">Community Fit Tags</span>
              <div className="flex items-center gap-1 flex-wrap">
                {(selectedPerson.community_fit_tags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-copper-soft/50 text-copper border border-copper/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Source Provenance */}
            <div className="pt-2 border-t border-line text-[11px] font-mono text-ink-muted space-y-1">
              <div>Source Record ID: <strong className="text-ink">{selectedPerson.source_record_id}</strong></div>
              <div>Source Channel: <strong className="text-ink uppercase">{selectedPerson.source}</strong></div>
            </div>
          </div>
        </aside>
      )}

      {/* 4. AIRTABLE / CSV BATCH IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-lg shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-line flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-signal-soft/40 text-signal">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Import Airtable / CSV Batch</h3>
                  <p className="text-[11px] text-ink-muted">Stream raw Airtable exports directly through the live AI intelligence pipeline</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!importing) setIsImportModalOpen(false);
                }}
                disabled={importing}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {!importing && importProgress.logs.length === 0 ? (
                <>
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-line hover:border-signal/50 rounded-lg p-5 text-center transition-colors bg-surface-raised/40 relative">
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,.json"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileSpreadsheet className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                    <div className="font-medium text-ink">Drag and drop your Airtable CSV file here</div>
                    <div className="text-[11px] text-ink-faint mt-0.5">Supports .csv, .tsv, and raw text with headers (Name, Email, Company, Role, Bio)</div>
                  </div>

                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[11px] uppercase font-mono tracking-wider">Or Paste Raw CSV Data Below</span>
                    <button
                      type="button"
                      onClick={handleLoadSampleAirtableData}
                      className="text-[11px] text-signal hover:underline font-mono"
                    >
                      + Load Sample Batch (3 Founders)
                    </button>
                  </div>

                  <textarea
                    rows={7}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Name,Email,Company,Role,Bio&#10;Dr. Alex Mercer,alex@neuroflow.ai,NeuroFlow AI,Founder & CEO,Building brain-computer interface decoders...&#10;Kavita Raman,kavita@greengrid.in,GreenGrid Power,Co-Founder,Scaling grid-scale energy storage..."
                    className="w-full font-mono text-[11px] p-3 bg-surface-raised border border-line rounded focus:outline-none focus:ring-1 focus:ring-signal text-ink placeholder:text-ink-faint leading-relaxed"
                  />
                </>
              ) : (
                <div className="space-y-4">
                  {/* Ingestion Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-ink font-semibold">AI Ingestion & Vector Pipeline Active</span>
                      <span className="text-signal font-bold">
                        {importProgress.current} / {importProgress.total} records
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-signal transition-all duration-300"
                        style={{
                          width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Progress Logs Terminal */}
                  <div className="bg-ink/90 dark:bg-black/80 rounded border border-line p-3 font-mono text-[11px] text-surface space-y-1.5 max-h-56 overflow-y-auto">
                    {importProgress.logs.map((log, lIdx) => (
                      <div key={lIdx} className="leading-tight">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line bg-surface-raised flex items-center justify-between gap-3">
              <div className="text-[11px] text-ink-faint font-mono">
                {importing ? 'Processing Gemini classification + pgvector...' : `${parseCSVRows(importText).length} rows ready`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportProgress({ current: 0, total: 0, logs: [] });
                  }}
                  disabled={importing}
                  className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink rounded border border-line hover:bg-surface-muted transition-colors disabled:opacity-40"
                >
                  {importProgress.logs.length > 0 && !importing ? 'Close' : 'Cancel'}
                </button>
                {(!importing && importProgress.logs.length === 0) && (
                  <button
                    onClick={handleExecuteBatchImport}
                    disabled={!importText.trim()}
                    className="px-4 py-1.5 text-xs bg-signal text-surface font-medium hover:bg-signal/90 rounded flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run AI Ingestion Pipeline</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

