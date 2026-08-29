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
  CheckCircle,
  Menu,
  Edit2,
  Trash2,
  Save
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
  review_status?: string;
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
  const [duplicateFilter, setDuplicateFilter] = useState<'PENDING' | 'MERGED' | 'ALL'>('PENDING');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);
  const [copiedIntroId, setCopiedIntroId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mergedIds, setMergedIds] = useState<Set<number>>(new Set());

  // Merge Confirmation Modal State
  const [candidateToMerge, setCandidateToMerge] = useState<{ duplicate: Person; canonical: Person } | null>(null);
  const [mergingInProgress, setMergingInProgress] = useState(false);

  // Mobile drawer & responsive states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // CRUD: Edit Member in Drawer state
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Person>>({});
  const [sectorTagsInput, setSectorTagsInput] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);

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

  const parseCSVRows = (csvContent: string) => {
    const lines = csvContent.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values: string[] = [];
      let currentVal = '';
      let insideQuotes = false;

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const val = (values[idx] || '').replace(/^["']|["']$/g, '').trim();
        rowObj[h] = val;
      });

      const name = rowObj['name'] || rowObj['full name'] || rowObj['applicant name'] || '';
      const email = rowObj['email'] || rowObj['email address'] || '';
      const company = rowObj['company'] || rowObj['organization'] || rowObj['startup'] || '';
      const role = rowObj['role'] || rowObj['role title'] || rowObj['title'] || '';
      const bio = rowObj['bio'] || rowObj['bio notes'] || rowObj['notes'] || rowObj['about'] || '';

      if (name) {
        rows.push({ name, email, company, role_title: role, bio_notes: bio, source: 'airtable_import' });
      }
    }
    return rows;
  };

  const handleExecuteBatchImport = async () => {
    const parsed = parseCSVRows(importText);
    if (parsed.length === 0) {
      alert('Please paste valid CSV records with at least a Name column.');
      return;
    }

    setImporting(true);
    setImportProgress({
      current: 0,
      total: parsed.length,
      logs: [`🚀 Initializing ingestion pipeline for ${parsed.length} Airtable records...`],
    });

    for (let idx = 0; idx < parsed.length; idx++) {
      const row = parsed[idx];
      setImportProgress(prev => ({
        ...prev,
        current: idx + 1,
        logs: [...prev.logs, `[${idx + 1}/${parsed.length}] Processing ${row.name} (${row.company || 'Independent'})...`],
      }));

      try {
        const res = await fetch('https://offline-os.onrender.com/process-new-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });

        if (!res.ok) {
          throw new Error(`Pipeline API returned status ${res.status}`);
        }

        const data = await res.json();
        let resultSummary = '';
        if (data.is_duplicate) {
          resultSummary = `⚠️ Flagged duplicate of #${data.duplicate_of} (${Math.round((data.confidence || 0.95) * 100)}% match)`;
        } else {
          resultSummary = `✨ Saved! Fit: ${data.fit_score}/100 | ${data.role_type || 'member'} | ${data.sector_tags?.join(', ') || 'general'}`;
        }

        setImportProgress(prev => ({
          ...prev,
          logs: [...prev.logs, `[${idx + 1}/${parsed.length}] ${row.name}: ${resultSummary}`],
        }));
      } catch (err: any) {
        setImportProgress(prev => ({
          ...prev,
          current: idx + 1,
          logs: [...prev.logs, `[${idx + 1}/${parsed.length}] ❌ Error processing ${row.name}: ${err.message}`],
        }));
      }
    }

    setImportProgress(prev => ({
      ...prev,
      logs: [...prev.logs, '🎉 Batch processing complete! Refreshing live console...'],
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

  // Live Merge duplicate in Supabase (with confirmation modal flow)
  const handleConfirmMergeExecution = async () => {
    if (!candidateToMerge) return;
    const { duplicate, canonical } = candidateToMerge;

    setMergingInProgress(true);
    try {
      setMergedIds(prev => {
        const next = new Set(prev);
        next.add(duplicate.id);
        return next;
      });
      setPeople(prev =>
        prev.map(p => (p.id === duplicate.id ? { ...p, is_duplicate_of: canonical.id, duplicate_confidence: 1.0, review_status: 'merged' } : p))
      );
      await fetch('/api/people', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: duplicate.id, is_duplicate_of: canonical.id, duplicate_confidence: 1.0, review_status: 'merged' })
      });
      setCandidateToMerge(null);
    } catch (err) {
      console.error('Error merging duplicate record:', err);
    } finally {
      setMergingInProgress(false);
    }
  };

  // Live Dismiss duplicate flag in Supabase (promotes to Canonical)
  const handleDismissDuplicate = async (dupId: number) => {
    try {
      setPeople(prev =>
        prev.map(p => (p.id === dupId ? { ...p, is_duplicate_of: null, duplicate_confidence: null, review_status: 'approved' } : p))
      );
      await fetch('/api/people', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dupId, is_duplicate_of: null, duplicate_confidence: null, review_status: 'approved' })
      });
    } catch (err) {
      console.error('Error dismissing duplicate flag:', err);
    }
  };

  // CRUD: Open Edit Mode in Drawer
  const handleStartEditMember = () => {
    if (!selectedPerson) return;
    setEditFormData({ ...selectedPerson });
    setSectorTagsInput((selectedPerson.sector_tags || []).join(', '));
    setIsEditingMember(true);
  };

  // CRUD: Save Edited Member to Supabase
  const handleSaveEditedMember = async () => {
    if (!selectedPerson || !editFormData.name?.trim()) {
      alert('Member name is required.');
      return;
    }

    setSavingMember(true);
    try {
      const parsedSectors = sectorTagsInput
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

      const payload = {
        id: selectedPerson.id,
        name: editFormData.name.trim(),
        email: editFormData.email?.trim() || null,
        company: editFormData.company?.trim() || null,
        role_title: editFormData.role_title?.trim() || null,
        bio_notes: editFormData.bio_notes?.trim() || null,
        role_type: editFormData.role_type || 'founder',
        seniority: editFormData.seniority || 'senior',
        sector_tags: parsedSectors,
        fit_score: editFormData.fit_score !== undefined && editFormData.fit_score !== null ? Number(editFormData.fit_score) : null,
      };

      const res = await fetch('/api/people', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update record in database');

      const data = await res.json();
      const updatedRecord = data.updated?.[0] || { ...selectedPerson, ...payload };

      // Update local state instantly
      setSelectedPerson(updatedRecord);
      setPeople(prev => prev.map(p => (p.id === selectedPerson.id ? updatedRecord : p)));
      setIsEditingMember(false);
    } catch (err: any) {
      console.error('Error saving member changes:', err);
      alert('Error updating record: ' + err.message);
    } finally {
      setSavingMember(false);
    }
  };

  // CRUD: Delete Member from Supabase
  const handleDeleteMember = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this member record from Supabase?')) {
      return;
    }

    setDeletingMember(true);
    try {
      const res = await fetch(`/api/people?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete member');

      setPeople(prev => prev.filter(p => p.id !== id));
      setSelectedPerson(null);
      setIsEditingMember(false);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      alert('Error deleting member: ' + err.message);
    } finally {
      setDeletingMember(false);
    }
  };

  // Check active filters and clear
  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'ALL' || sectorFilter !== 'ALL' || statusFilter !== 'ALL';
  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setSectorFilter('ALL');
    setStatusFilter('ALL');
  };

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = people.length;
    const duplicates = people.filter(p => p.is_duplicate_of !== null && p.review_status !== 'merged' && !mergedIds.has(p.id)).length;
    const resolvedDuplicates = people.filter(p => p.is_duplicate_of !== null && (p.review_status === 'merged' || mergedIds.has(p.id))).length;
    const canonical = total - people.filter(p => p.is_duplicate_of !== null).length;
    const incomplete = people.filter(p => p.is_incomplete).length;
    const scores = people.map(p => p.fit_score).filter((s): s is number => s !== null);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const pendingIntros = introductions.filter(i => i.status === 'pending').length;
    const approvedIntros = introductions.filter(i => i.status === 'approved').length;

    return { total, duplicates, resolvedDuplicates, canonical, incomplete, avgScore, pendingIntros, approvedIntros };
  }, [people, introductions, mergedIds]);

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
      .filter(p => {
        if (p.is_duplicate_of === null) return false;
        const isMerged = mergedIds.has(p.id) || p.review_status === 'merged';
        if (duplicateFilter === 'PENDING') return !isMerged;
        if (duplicateFilter === 'MERGED') return isMerged;
        return true;
      })
      .map(dup => {
        const canonical = peopleMap.get(dup.is_duplicate_of!);
        return { duplicate: dup, canonical: canonical || null };
      });
  }, [people, mergedIds, duplicateFilter]);

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

  // Nav Items Helper Component
  const NavItems = () => (
    <div className="p-3 space-y-1">
      <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
        Workspace
      </div>
      <button
        onClick={() => {
          setActiveTab('people');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
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
        onClick={() => {
          setActiveTab('duplicates');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
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
        onClick={() => {
          setActiveTab('intros');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
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
  );

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans">
      {/* 1A. MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-72 bg-surface border-r border-line flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Brand Header */}
              <div className="h-14 border-b border-line flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-signal flex items-center justify-center text-surface text-xs font-mono font-bold">
                    O
                  </div>
                  <h1 className="text-sm font-semibold tracking-tight text-ink flex items-center gap-2">
                    Offline OS
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20">
                      CRM
                    </span>
                  </h1>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted text-ink-muted"
                  aria-label="Close Navigation Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <NavItems />
            </div>

            {/* Mobile Footer Meta & Theme Switcher */}
            <div className="p-4 border-t border-line space-y-3">
              <div className="flex items-center justify-between text-xs text-ink-muted font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
                  Database Synced
                </span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted transition-colors text-ink"
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 1B. PERSISTENT DESKTOP NAVIGATION RAIL */}
      <aside className="hidden md:flex md:w-60 lg:w-64 border-r border-line bg-surface flex-col justify-between flex-shrink-0 z-20">
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
          <NavItems />
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
        <header className="min-h-[3.5rem] py-2 px-4 sm:px-6 border-b border-line bg-surface flex flex-wrap md:flex-nowrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-full md:max-w-md">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted text-ink -ml-2"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, company, title, sector..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-surface-raised border border-line rounded focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal text-ink placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Ingest Airtable / CSV */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="min-h-[40px] px-3 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Batch import Airtable CSV export or paste raw rows"
            >
              <UploadCloud className="w-3.5 h-3.5 text-signal" />
              <span className="hidden sm:inline">Import Airtable / CSV</span>
              <span className="sm:hidden">Import CSV</span>
            </button>

            <Link
              href="/apply"
              target="_blank"
              className="min-h-[40px] px-3 text-xs bg-surface-raised border border-line text-ink hover:bg-surface-muted font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <span className="hidden sm:inline">Public Apply</span>
              <span className="sm:hidden">Apply</span>
              <ExternalLink className="w-3 h-3 text-ink-muted" />
            </Link>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="min-h-[40px] px-3 text-xs border border-line hover:bg-surface-muted rounded text-ink flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* KPI Metric Summary Strip (Responsive Grid) */}
        <section className="bg-surface border-b border-line px-4 sm:px-6 py-3 grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-4 overflow-x-auto text-left">
          <div className="border-r border-line pr-2 sm:pr-3">
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Total Ingested</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-ink">{metrics.total}</div>
          </div>
          <div className="border-r border-line pr-2 sm:pr-3">
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Canonical</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-signal">{metrics.canonical}</div>
          </div>
          <div className="border-r-0 sm:border-r border-line pr-2 sm:pr-3">
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Pending Dups</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-warning">{metrics.duplicates}</div>
          </div>
          <div className="border-r border-line pr-2 sm:pr-3">
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Incomplete</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-danger">{metrics.incomplete}</div>
          </div>
          <div className="border-r border-line pr-2 sm:pr-3">
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Avg Fit</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-ink">{metrics.avgScore}</div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-mono text-ink-muted uppercase">Pending Intros</div>
            <div className="text-base sm:text-lg font-semibold tabular-nums text-copper">{metrics.pendingIntros}</div>
          </div>
        </section>

        {/* TAB 1: MEMBERS DIRECTORY VIEW */}
        {activeTab === 'people' && (
          <div className="flex-1 flex flex-col min-h-0 bg-canvas">
            {/* Filter Toolbar Header */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-line bg-surface-muted/50 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {/* Mobile Filter Toggle */}
              <div className="flex items-center gap-2 md:hidden w-full justify-between">
                <button
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  className="min-h-[44px] px-3.5 bg-surface border border-line rounded text-xs font-medium flex items-center gap-2"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters {hasActiveFilters && '(Active)'}</span>
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="min-h-[44px] px-3 bg-danger-soft text-danger border border-danger/30 rounded text-xs font-medium flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <div className="text-xs font-mono text-ink-muted tabular-nums">
                  {filteredPeople.length} / {people.length}
                </div>
              </div>

              {/* Desktop Filters (Always visible on md+) */}
              <div className="hidden md:flex items-center gap-2 overflow-x-auto">
                <span className="text-ink-muted font-mono flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filters:
                </span>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="h-8 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Roles</option>
                  <option value="FOUNDER">Founders</option>
                  <option value="OPERATOR">Operators</option>
                  <option value="INVESTOR">Investors</option>
                  <option value="RESEARCHER">Researchers</option>
                </select>

                {/* Sector Filter */}
                <select
                  value={sectorFilter}
                  onChange={e => setSectorFilter(e.target.value)}
                  className="h-8 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Sectors</option>
                  <option value="climate">Climate & Energy</option>
                  <option value="bio">Bio & Health</option>
                  <option value="fintech">Fintech</option>
                  <option value="consumer">Consumer</option>
                  <option value="ai">AI & Systems</option>
                  <option value="ops">Ops & SaaS</option>
                </select>

                {/* Quality Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Records</option>
                  <option value="CANONICAL">Canonical Only</option>
                  <option value="DUPLICATES">Flagged Duplicates</option>
                  <option value="INCOMPLETE">Incomplete Profiles</option>
                  <option value="HIGH_FIT">High Fit (80+)</option>
                </select>

                {/* Clear Filters Reset Button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="h-8 px-2.5 bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Reset all search and dropdown filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>

              <div className="hidden md:block text-xs font-mono text-ink-muted tabular-nums">
                Showing {filteredPeople.length} of {people.length} members
              </div>
            </div>

            {/* Mobile Expandable Filter Panel */}
            {mobileFiltersOpen && (
              <div className="md:hidden p-4 bg-surface border-b border-line space-y-3 animate-in slide-in-from-top-2 duration-150">
                <div>
                  <label className="text-[11px] font-mono text-ink-muted block mb-1">Role / Seniority</label>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-raised border border-line rounded text-xs text-ink"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="FOUNDER">Founders</option>
                    <option value="OPERATOR">Operators</option>
                    <option value="INVESTOR">Investors</option>
                    <option value="RESEARCHER">Researchers</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-ink-muted block mb-1">Sector Domain</label>
                  <select
                    value={sectorFilter}
                    onChange={e => setSectorFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-raised border border-line rounded text-xs text-ink"
                  >
                    <option value="ALL">All Sectors</option>
                    <option value="climate">Climate & Energy</option>
                    <option value="bio">Bio & Health</option>
                    <option value="fintech">Fintech</option>
                    <option value="consumer">Consumer</option>
                    <option value="ai">AI & Systems</option>
                    <option value="ops">Ops & SaaS</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-ink-muted block mb-1">Record Quality & Fit</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-raised border border-line rounded text-xs text-ink"
                  >
                    <option value="ALL">All Records</option>
                    <option value="CANONICAL">Canonical Only</option>
                    <option value="DUPLICATES">Flagged Duplicates</option>
                    <option value="INCOMPLETE">Incomplete Profiles</option>
                    <option value="HIGH_FIT">High Fit (80+)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 1. TABLE LAYOUT (Desktop & Tablet: md+) */}
            <div className="hidden md:block flex-1 overflow-auto">
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
                          onClick={() => {
                            setSelectedPerson(person);
                            setIsEditingMember(false);
                          }}
                          className="hover:bg-surface-raised transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono text-ink-muted text-[11px]">#{person.id}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink group-hover:text-signal transition-colors">
                              {person.name}
                            </div>
                            <div className="text-ink-muted text-[11px]">
                              {person.company || <span className="text-ink-faint italic">Independent</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-ink">{person.role_title || '—'}</div>
                            <div className="text-[11px] font-mono text-ink-faint capitalize">
                              {person.role_type || '—'} {person.seniority ? `• ${person.seniority}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {person.sector_tags && person.sector_tags.length > 0 ? (
                                person.sector_tags.slice(0, 3).map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-muted text-ink-muted border border-line"
                                  >
                                    #{tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-ink-faint text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {person.fit_score !== null ? (
                              <div
                                onMouseEnter={() => setActiveTooltipId(person.id)}
                                onMouseLeave={() => setActiveTooltipId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltipId(activeTooltipId === person.id ? null : person.id);
                                }}
                                className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded border relative cursor-help"
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

                                {activeTooltipId === person.id && (
                                  <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-surface-raised border border-line-strong rounded-lg shadow-xl text-xs z-30 pointer-events-none text-ink font-sans">
                                    <div className="font-semibold text-ink border-b border-line pb-1 mb-1.5 flex justify-between items-center">
                                      <span>Fit Score Breakdown</span>
                                      <span className="font-mono text-signal">{person.fit_score}/100</span>
                                    </div>
                                    <p className="text-ink-muted text-[11px] leading-relaxed italic">
                                      &ldquo;{person.fit_score_reasoning || 'Deterministic applicant rubric evaluated.'}&rdquo;
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-ink-faint text-[11px]">—</span>
                            )}
                          </td>
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
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPerson(person);
                                setIsEditingMember(false);
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

            {/* 2. MOBILE CARD STACK LAYOUT (<md) */}
            <div className="block md:hidden flex-1 overflow-auto p-3 sm:p-4 space-y-3">
              {loading ? (
                <div className="py-12 text-center text-ink-muted font-mono text-xs">
                  Loading database records from Supabase...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-12 text-center text-ink-muted text-xs">
                  No members match your current filter query.
                </div>
              ) : (
                filteredPeople.map(person => {
                  const isDup = person.is_duplicate_of !== null;
                  return (
                    <div
                      key={person.id}
                      onClick={() => {
                        setSelectedPerson(person);
                        setIsEditingMember(false);
                      }}
                      className="bg-surface border border-line rounded-lg p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-ink">{person.name}</div>
                          <div className="text-xs text-ink-muted mt-0.5">
                            {person.role_title ? `${person.role_title} at ` : ''}
                            <strong className="text-ink">{person.company || 'Independent'}</strong>
                          </div>
                        </div>

                        {person.fit_score !== null && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTooltipId(activeTooltipId === person.id ? null : person.id);
                            }}
                            className="min-h-[36px] min-w-[48px] flex items-center justify-center font-mono font-bold text-xs px-2 py-1 rounded border shadow-xs"
                            style={{
                              backgroundColor: person.fit_score >= 80 ? 'var(--color-signal-soft)' : 'var(--color-surface-muted)',
                              borderColor: person.fit_score >= 80 ? 'var(--color-signal)' : 'var(--color-line-strong)',
                              color: person.fit_score >= 80 ? 'var(--color-signal)' : 'var(--color-ink)',
                            }}
                          >
                            {person.fit_score}/100
                          </div>
                        )}
                      </div>

                      {/* Tap-accessible Fit Score Reasoning Strip */}
                      {activeTooltipId === person.id && person.fit_score_reasoning && (
                        <div className="p-2.5 bg-surface-muted rounded text-[11px] text-ink-muted italic border border-line animate-in zoom-in-95 duration-150">
                          &ldquo;{person.fit_score_reasoning}&rdquo;
                        </div>
                      )}

                      {/* Badges & Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {person.role_type && (
                          <span className="px-2 py-0.5 rounded bg-surface-raised border border-line text-ink-muted font-mono uppercase">
                            {person.role_type}
                          </span>
                        )}
                        {person.sector_tags && person.sector_tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded bg-surface-muted border border-line text-ink-muted font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Status & Details Action Button */}
                      <div className="flex items-center justify-between border-t border-line pt-2.5">
                        <div>
                          {isDup ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-warning-soft text-warning border border-warning/30">
                              <AlertTriangle className="w-3 h-3" /> Duplicate of #{person.is_duplicate_of}
                            </span>
                          ) : person.is_incomplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-danger-soft text-danger border border-danger/30">
                              Incomplete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-signal">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Canonical
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPerson(person);
                            setIsEditingMember(false);
                          }}
                          className="min-h-[44px] px-3 text-xs text-signal font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DUPLICATES REVIEW QUEUE */}
        {activeTab === 'duplicates' && (
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-canvas space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-ink">Duplicates Review Queue</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Side-by-side comparison of candidate duplicate pairs detected by the AI Deduplication Engine.
                </p>
              </div>

              {/* View Toggle Tabs */}
              <div className="flex items-center bg-surface border border-line rounded-lg p-1 text-xs gap-1">
                <button
                  onClick={() => setDuplicateFilter('PENDING')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    duplicateFilter === 'PENDING'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Pending Review ({metrics.duplicates})
                </button>
                <button
                  onClick={() => setDuplicateFilter('MERGED')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    duplicateFilter === 'MERGED'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Resolved Merged ({metrics.resolvedDuplicates})
                </button>
                <button
                  onClick={() => setDuplicateFilter('ALL')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    duplicateFilter === 'ALL'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  All History ({duplicatePairs.length})
                </button>
              </div>
            </div>

            {/* Audit Provenance Notice */}
            <div className="p-3 bg-surface-raised border border-line rounded text-xs text-ink flex items-start gap-2.5">
              <Info className="w-4 h-4 text-signal flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-ink">Audit Provenance Notice:</span> Merging preserves complete source history while consolidating primary relationship records.
              </div>
            </div>

            {/* Duplicate Pair Cards */}
            <div className="space-y-4">
              {duplicatePairs.length === 0 ? (
                <div className="p-12 text-center bg-surface border border-line rounded-lg space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-signal mx-auto" />
                  <div className="text-sm font-semibold text-ink">
                    {duplicateFilter === 'PENDING'
                      ? 'All Duplicate Pairs Resolved!'
                      : 'No duplicates in this view.'}
                  </div>
                  <p className="text-xs text-ink-muted max-w-sm mx-auto">
                    {duplicateFilter === 'PENDING'
                      ? 'There are no pending duplicate records requiring review. All candidate profiles are verified canonical.'
                      : 'Switch tabs above to view pending or resolved pairs.'}
                  </p>
                </div>
              ) : (
                duplicatePairs.map(({ duplicate, canonical }, idx) => {
                  const isMerged = mergedIds.has(duplicate.id) || duplicate.review_status === 'merged';

                  return (
                    <div
                      key={idx}
                      className={`bg-surface border rounded-lg p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
                        isMerged ? 'border-signal/60 bg-signal-soft/10' : 'border-line'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-warning-soft text-warning border border-warning/30">
                            Pair #{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-ink-muted">
                            Confidence: <strong className="text-ink">{Math.round((duplicate.duplicate_confidence || 0.95) * 100)}%</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                          {isMerged ? (
                            <span className="min-h-[44px] px-3.5 py-1 text-xs rounded bg-signal text-surface font-semibold flex items-center gap-1.5 shadow-sm animate-in zoom-in-95">
                              <Check className="w-4 h-4" />
                              <span>Merged into #{canonical?.id || duplicate.is_duplicate_of}</span>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  if (canonical) {
                                    setCandidateToMerge({ duplicate, canonical });
                                  } else {
                                    alert('Canonical record details not loaded.');
                                  }
                                }}
                                className="min-h-[44px] px-4 py-1.5 text-xs rounded bg-signal text-surface font-medium hover:bg-signal/90 transition-colors shadow-sm flex items-center gap-1.5"
                                title="Open verification dialog to review profiles before merging"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Merge into Canonical</span>
                              </button>
                              <button
                                onClick={() => handleDismissDuplicate(duplicate.id)}
                                className="min-h-[44px] px-4 py-1.5 text-xs rounded bg-surface border border-line text-ink hover:bg-surface-muted transition-colors flex items-center gap-1.5"
                                title="Unlink duplicate and promote to Canonical record in database"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Dismiss Flag</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Side-by-side Diff (Responsive Grid: 1 col on mobile, 2 col on md+) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Canonical */}
                        <div className="p-3.5 bg-signal-soft/20 border border-signal/20 rounded">
                          <div className="text-[11px] font-mono font-semibold text-signal uppercase mb-2 flex items-center justify-between">
                            <span>Canonical Record (Primary)</span>
                            <span>#{canonical?.id || '—'}</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div>
                              <span className="text-ink-faint">Name:</span> <strong className="text-ink">{canonical?.name || 'Unknown'}</strong>
                            </div>
                            <div>
                              <span className="text-ink-faint">Company:</span> <span className="text-ink">{canonical?.company || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-ink-faint">Role:</span> <span className="text-ink">{canonical?.role_title || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-ink-faint">Email:</span> <span className="font-mono text-ink-muted text-[11px] break-all">{canonical?.email_normalized || canonical?.email || 'None'}</span>
                            </div>
                            <div className="pt-1 text-[11px] text-ink-muted italic">
                              &ldquo;{canonical?.bio_notes || 'No bio notes'}&rdquo;
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
                              <span className="text-ink-faint">Email:</span> <span className="font-mono text-ink-muted text-[11px] break-all">{duplicate.email_normalized || duplicate.email || 'None'}</span>
                            </div>
                            <div className="pt-1 text-[11px] text-ink-muted italic">
                              &ldquo;{duplicate.bio_notes || 'No bio notes'}&rdquo;
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Reasoning Strip */}
                      <div className="p-2.5 bg-surface-muted rounded text-xs text-ink-muted flex items-start gap-2 font-mono text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-copper flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-ink">Adjudication Rationale:</span> {duplicate.fit_score_reasoning?.replace('Duplicate record - excluded from fit scoring.', '') || `AI Deduplication Engine confirmed match confidence ${Math.round((duplicate.duplicate_confidence || 0.95)*100)}%.`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INTRODUCTIONS WORKSPACE */}
        {activeTab === 'intros' && (
          <div className="flex-1 flex flex-col min-h-0 bg-canvas">
            {/* Introductions Toolbar */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-ink-muted font-mono">Filter Status:</span>
                <select
                  value={introStatusFilter}
                  onChange={e => setIntroStatusFilter(e.target.value)}
                  className="h-8 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Statuses ({introductions.length})</option>
                  <option value="PENDING">Pending Review ({metrics.pendingIntros})</option>
                  <option value="APPROVED">Approved ({metrics.approvedIntros})</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>
              <div className="text-xs font-mono text-ink-muted">
                Showing {filteredIntros.length} intro matches generated by AI Relationship Matching Engine
              </div>
            </div>

            {/* Introductions List */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
              {filteredIntros.map((intro) => {
                const isApproved = intro.status === 'approved';
                const isDismissed = intro.status === 'dismissed';

                return (
                  <div
                    key={intro.id}
                    className={`bg-surface border rounded-lg p-4 sm:p-5 shadow-sm space-y-3.5 transition-all ${
                      isApproved
                        ? 'border-signal/50 bg-signal-soft/10'
                        : isDismissed
                        ? 'opacity-60 border-line'
                        : 'border-line'
                    }`}
                  >
                    {/* Header: Score Band & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                            intro.match_band === 'strong'
                              ? 'bg-signal-soft text-signal border border-signal/30'
                              : intro.match_band === 'good'
                              ? 'bg-info-soft text-info border border-info/30'
                              : 'bg-copper-soft text-copper border border-copper/30'
                          }`}
                        >
                          {intro.match_band} Match ({Math.round(intro.match_score * 100)}%)
                        </span>
                        <span className="text-xs text-ink-muted font-mono hidden sm:inline">
                          &bull; {intro.shared_context}
                        </span>
                      </div>

                      {/* Approval Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isApproved ? (
                          <span className="min-h-[40px] px-3 py-1 text-xs rounded bg-signal text-surface font-semibold flex items-center gap-1 shadow-sm">
                            <Check className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : isDismissed ? (
                          <span className="min-h-[40px] px-3 py-1 text-xs rounded bg-surface-muted text-ink-muted font-medium flex items-center gap-1">
                            Dismissed
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateIntroStatus(intro.id, 'approved')}
                              className="min-h-[44px] px-3.5 py-1 text-xs rounded bg-signal text-surface font-medium hover:bg-signal/90 transition-colors shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve Intro
                            </button>
                            <button
                              onClick={() => handleUpdateIntroStatus(intro.id, 'dismissed')}
                              className="min-h-[44px] px-3.5 py-1 text-xs rounded bg-surface border border-line text-ink hover:bg-surface-muted transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Member A & Member B Cards (Responsive Grid: 1 col on mobile, 2 col on sm+) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                          className="min-h-[36px] px-2 flex items-center gap-1 hover:text-ink transition-colors"
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
                        &ldquo;{intro.suggested_intro}&rdquo;
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

      {/* 3. DETAIL DRAWER (With Real-Time CRUD: Edit & Delete Member) */}
      {selectedPerson && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setSelectedPerson(null);
              setIsEditingMember(false);
            }}
          />
          <aside className="relative w-full sm:w-96 border-l border-line bg-surface flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  {isEditingMember ? 'Edit Member Record' : 'Member Details'}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-line text-ink-muted">
                  #{selectedPerson.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {!isEditingMember && (
                  <button
                    onClick={handleStartEditMember}
                    className="h-8 px-2.5 text-xs bg-surface border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1 transition-colors"
                    title="Edit member details, role, tags, fit score"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-signal" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    setIsEditingMember(false);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted text-ink-muted hover:text-ink"
                  aria-label="Close details drawer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-5 text-xs">
              {isEditingMember ? (
                /* EDIT FORM IN DRAWER */
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Company</label>
                      <input
                        type="text"
                        value={editFormData.company || ''}
                        onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Role Title</label>
                      <input
                        type="text"
                        value={editFormData.role_title || ''}
                        onChange={e => setEditFormData({ ...editFormData, role_title: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Role Type</label>
                      <select
                        value={editFormData.role_type || 'founder'}
                        onChange={e => setEditFormData({ ...editFormData, role_type: e.target.value })}
                        className="w-full h-8 px-2 text-xs bg-surface-raised border border-line rounded text-ink"
                      >
                        <option value="founder">Founder</option>
                        <option value="operator">Operator</option>
                        <option value="investor">Investor</option>
                        <option value="researcher">Researcher</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Seniority</label>
                      <select
                        value={editFormData.seniority || 'senior'}
                        onChange={e => setEditFormData({ ...editFormData, seniority: e.target.value })}
                        className="w-full h-8 px-2 text-xs bg-surface-raised border border-line rounded text-ink"
                      >
                        <option value="executive">Executive</option>
                        <option value="senior">Senior</option>
                        <option value="mid">Mid-level</option>
                        <option value="junior">Junior</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Fit Score (0 - 100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editFormData.fit_score !== undefined && editFormData.fit_score !== null ? editFormData.fit_score : ''}
                      onChange={e => setEditFormData({ ...editFormData, fit_score: Number(e.target.value) })}
                      className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Sector Tags (comma separated)</label>
                    <input
                      type="text"
                      value={sectorTagsInput}
                      onChange={e => setSectorTagsInput(e.target.value)}
                      placeholder="e.g. ai, genomics, climate"
                      className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Bio & Operator Notes</label>
                    <textarea
                      rows={4}
                      value={editFormData.bio_notes || ''}
                      onChange={e => setEditFormData({ ...editFormData, bio_notes: e.target.value })}
                      className="w-full p-2.5 text-xs bg-surface-raised border border-line rounded text-ink leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                /* READ-ONLY VIEW IN DRAWER */
                <>
                  {/* Header Identity */}
                  <div>
                    <h2 className="text-base font-bold text-ink">{selectedPerson.name}</h2>
                    <div className="text-ink-muted mt-0.5">
                      {selectedPerson.role_title} at <strong className="text-ink">{selectedPerson.company || 'Independent'}</strong>
                    </div>
                    <div className="font-mono text-[11px] text-ink-faint mt-1 break-all">
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
                        &ldquo;{selectedPerson.fit_score_reasoning}&rdquo;
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

                  {/* Classification Taxonomy */}
                  <div className="space-y-2">
                    <span className="font-mono text-[11px] uppercase text-ink-muted">Taxonomy & Classification</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-surface-muted/40 border border-line rounded">
                        <div className="text-ink-faint text-[10px] font-mono uppercase">Role Type</div>
                        <div className="font-semibold text-ink capitalize">{selectedPerson.role_type || 'Unclassified'}</div>
                      </div>
                      <div className="p-2.5 bg-surface-muted/40 border border-line rounded">
                        <div className="text-ink-faint text-[10px] font-mono uppercase">Seniority</div>
                        <div className="font-semibold text-ink capitalize">{selectedPerson.seniority || 'Unclassified'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sector Tags */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-[11px] uppercase text-ink-muted">Sector Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPerson.sector_tags && selectedPerson.sector_tags.length > 0 ? (
                        selectedPerson.sector_tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-surface-muted text-ink border border-line"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-faint italic">No sectors assigned.</span>
                      )}
                    </div>
                  </div>

                  {/* Community Fit Tags */}
                  <div className="space-y-1.5">
                    <span className="font-mono text-[11px] uppercase text-ink-muted">Community Fit Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPerson.community_fit_tags && selectedPerson.community_fit_tags.length > 0 ? (
                        selectedPerson.community_fit_tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-signal-soft text-signal border border-signal/30"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-faint italic">No fit tags.</span>
                      )}
                    </div>
                  </div>

                  {/* System Metadata */}
                  <div className="pt-3 border-t border-line space-y-1 text-[11px] font-mono text-ink-muted">
                    <div>Source: {selectedPerson.source}</div>
                    <div>Record ID: {selectedPerson.source_record_id || `rec_${selectedPerson.id}`}</div>
                    <div>Enrichment: {selectedPerson.ai_enrichment_status}</div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-line bg-surface-raised flex items-center justify-between gap-2">
              {isEditingMember ? (
                <>
                  <button
                    onClick={() => setIsEditingMember(false)}
                    disabled={savingMember}
                    className="min-h-[44px] px-3 text-xs rounded bg-surface border border-line text-ink hover:bg-surface-muted transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedMember}
                    disabled={savingMember}
                    className="min-h-[44px] px-4 text-xs rounded bg-signal text-surface font-semibold hover:bg-signal/90 flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingMember ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleDeleteMember(selectedPerson.id)}
                    disabled={deletingMember}
                    className="min-h-[44px] px-3 text-xs rounded text-danger hover:bg-danger-soft/40 border border-danger/30 flex items-center gap-1 transition-colors"
                    title="Delete member record from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={() => setSelectedPerson(null)}
                    className="min-h-[44px] px-4 py-1.5 text-xs rounded bg-surface border border-line text-ink hover:bg-surface-muted"
                  >
                    Close Drawer
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* 4. MERGE CONFIRMATION VERIFICATION MODAL */}
      {candidateToMerge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface border border-line rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-warning-soft flex items-center justify-center text-warning">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-ink">Confirm Record Merge</h3>
                  <p className="text-xs text-ink-muted">Carefully verify both candidate records before consolidating</p>
                </div>
              </div>
              <button
                onClick={() => setCandidateToMerge(null)}
                disabled={mergingInProgress}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted text-ink-muted hover:text-ink disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Side-by-side verification */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-surface-raised border border-line rounded text-ink leading-relaxed">
                You are about to merge <strong>Duplicate #{candidateToMerge.duplicate.id}</strong> ({candidateToMerge.duplicate.name}) into <strong>Canonical Primary #{candidateToMerge.canonical.id}</strong> ({candidateToMerge.canonical.name}).
                All relationship mappings and intros will consolidate to the Canonical profile.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Canonical Preview */}
                <div className="p-3.5 bg-signal-soft/20 border border-signal/30 rounded space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-signal uppercase flex items-center justify-between">
                    <span>Canonical Primary (Preserved)</span>
                    <span>#{candidateToMerge.canonical.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-ink">{candidateToMerge.canonical.name}</div>
                    <div className="text-xs text-ink-muted">{candidateToMerge.canonical.role_title} at {candidateToMerge.canonical.company || 'Independent'}</div>
                    <div className="text-[11px] font-mono text-ink-muted break-all">{candidateToMerge.canonical.email || candidateToMerge.canonical.email_normalized || 'No email'}</div>
                    <div className="text-[11px] text-ink italic pt-1">&ldquo;{candidateToMerge.canonical.bio_notes || 'No bio'}&rdquo;</div>
                  </div>
                </div>

                {/* Duplicate Preview */}
                <div className="p-3.5 bg-warning-soft/20 border border-warning/30 rounded space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-warning uppercase flex items-center justify-between">
                    <span>Duplicate Candidate (Merged)</span>
                    <span>#{candidateToMerge.duplicate.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-ink">{candidateToMerge.duplicate.name}</div>
                    <div className="text-xs text-ink-muted">{candidateToMerge.duplicate.role_title} at {candidateToMerge.duplicate.company || 'Independent'}</div>
                    <div className="text-[11px] font-mono text-ink-muted break-all">{candidateToMerge.duplicate.email || candidateToMerge.duplicate.email_normalized || 'No email'}</div>
                    <div className="text-[11px] text-ink italic pt-1">&ldquo;{candidateToMerge.duplicate.bio_notes || 'No bio'}&rdquo;</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-line bg-surface-raised flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCandidateToMerge(null)}
                disabled={mergingInProgress}
                className="min-h-[44px] px-4 text-xs rounded border border-line text-ink hover:bg-surface-muted disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMergeExecution}
                disabled={mergingInProgress}
                className="min-h-[44px] px-5 text-xs rounded bg-signal text-surface font-semibold hover:bg-signal/90 flex items-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{mergingInProgress ? 'Merging in Supabase...' : 'Confirm & Merge Records'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BATCH AIRTABLE / CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface border border-line rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-signal-soft flex items-center justify-center text-signal">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-ink">Import Airtable / CSV Dataset</h3>
                  <p className="text-xs text-ink-muted">Upload exported CSV or paste rows to run real-time AI ingestion pipeline</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!importing) {
                    setIsImportModalOpen(false);
                    setImportProgress({ current: 0, total: 0, logs: [] });
                  }
                }}
                disabled={importing}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-surface-muted text-ink-muted hover:text-ink disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {importProgress.logs.length === 0 ? (
                <>
                  {/* File Dropzone Area */}
                  <div className="border-2 border-dashed border-line rounded-lg p-5 text-center bg-surface-raised/40 hover:bg-surface-raised transition-colors space-y-2">
                    <FileSpreadsheet className="w-7 h-7 text-ink-muted mx-auto" />
                    <div>
                      <span className="font-semibold text-ink">Upload CSV file</span> or drop file here
                    </div>
                    <p className="text-[11px] text-ink-faint">
                      Accepts Airtable CSV exports with Name, Email, Company, Role, Bio columns
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-signal-soft file:text-signal hover:file:bg-signal-soft/80 cursor-pointer pt-2"
                    />
                  </div>

                  {/* Or Paste CSV Raw Text */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-[11px] text-ink-muted uppercase">
                        Or Paste Raw CSV Data ({parseCSVRows(importText).length} rows detected)
                      </label>
                      <button
                        onClick={handleLoadSampleAirtableData}
                        className="text-xs text-signal hover:underline font-mono font-medium"
                      >
                        + Load Sample Batch (3 Founders)
                      </button>
                    </div>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={`Name,Email,Company,Role,Bio\nDr. Aris Thorne,aris.thorne@deepgen.ai,DeepGen,Founder,Building foundation models for genomics...`}
                      rows={6}
                      className="w-full p-3 font-mono text-xs bg-surface-raised border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal text-ink placeholder:text-ink-faint leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                /* Progress View */
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span>Progress: {importProgress.current} of {importProgress.total} records</span>
                      <span className="font-semibold text-signal">
                        {Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full bg-signal transition-all duration-300 rounded-full"
                        style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Live Progress Logs Terminal */}
                  <div className="bg-zinc-950 text-zinc-100 rounded-lg border border-zinc-800 p-4 font-mono text-xs space-y-2 max-h-72 overflow-y-auto shadow-inner">
                    <div className="text-zinc-500 text-[11px] pb-1 border-b border-zinc-800 flex items-center justify-between">
                      <span>CONSOLE LOG STREAM</span>
                      <span>Offline AI Processing Stream</span>
                    </div>
                    {importProgress.logs.map((log, lIdx) => (
                      <div key={lIdx} className="leading-relaxed flex items-start gap-2">
                        <span className="text-zinc-500 select-none">&gt;</span>
                        <span className="text-emerald-400">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-line bg-surface-raised flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-ink-muted font-mono">
                {importing ? (
                  <span className="flex items-center gap-1.5 text-signal">
                    <span className="w-2 h-2 rounded-full bg-signal animate-ping"></span>
                    Running AI Classification & Semantic Matchmaking...
                  </span>
                ) : (
                  `${parseCSVRows(importText).length} valid rows ready for ingestion`
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportProgress({ current: 0, total: 0, logs: [] });
                  }}
                  disabled={importing}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink rounded-lg border border-line hover:bg-surface-muted transition-colors disabled:opacity-40"
                >
                  {importProgress.logs.length > 0 && !importing ? 'Close & View Dashboard' : 'Cancel'}
                </button>
                {(!importing && importProgress.logs.length === 0) && (
                  <button
                    onClick={handleExecuteBatchImport}
                    disabled={!importText.trim()}
                    className="min-h-[44px] px-5 py-2 text-xs bg-signal text-surface font-semibold hover:bg-signal/90 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 shadow-sm"
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
