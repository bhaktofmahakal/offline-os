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
  Save,
  Download,
  Zap,
  Send,
  Globe
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
  const [activeTab, setActiveTab] = useState<'people' | 'duplicates' | 'intros' | 'intelligence'>('people');
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

  // Workspace Environment Mode (Sandbox Benchmark vs Live Production)
  const [workspaceMode, setWorkspaceMode] = useState<'sandbox' | 'live'>('sandbox');
  const [isPurgingLive, setIsPurgingLive] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);

  // 360° AI Enrichment State
  const [isEnrichingPerson, setIsEnrichingPerson] = useState(false);
  const [dossierCache, setDossierCache] = useState<Record<number, any>>({});

  // Warm Intro Dispatcher Modal State
  const [selectedIntroForDispatch, setSelectedIntroForDispatch] = useState<Introduction | null>(null);
  const [dispatchedIntroIds, setDispatchedIntroIds] = useState<Set<number>>(new Set());

  // Airtable Direct Ingestion States
  const [importTab, setImportTab] = useState<'airtable' | 'webhook' | 'csv'>('airtable');
  const [airtableBaseId, setAirtableBaseId] = useState('');
  const [airtableTableName, setAirtableTableName] = useState('Applicants');
  const [autoEnrichAirtable, setAutoEnrichAirtable] = useState(true);
  const [airtableBasesList, setAirtableBasesList] = useState<any[]>([]);
  const [loadingBases, setLoadingBases] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [airtableTablesList, setAirtableTablesList] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [airtableWebhooksList, setAirtableWebhooksList] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  
  // Tavily Deep Intelligence Lab States
  const [intelligenceSubTab, setIntelligenceSubTab] = useState<'research' | 'crawl' | 'extract' | 'search'>('research');
  const [researchPrompt, setResearchPrompt] = useState('Competitor analysis and market landscape for AI coding agents in 2026');
  const [researchModel, setResearchModel] = useState<'mini' | 'pro'>('mini');
  const [researchStatus, setResearchStatus] = useState<'idle' | 'pending' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [researchReport, setResearchReport] = useState<string | null>(null);
  const [researchSources, setResearchSources] = useState<Array<{ title: string; url: string }>>([]);
  const [researchRequestId, setResearchRequestId] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);

  // Crawl State
  const [crawlInputUrl, setCrawlInputUrl] = useState('https://news.ycombinator.com');
  const [crawlLimit, setCrawlLimit] = useState(10);
  const [crawlExtractDepth, setCrawlExtractDepth] = useState<'basic' | 'advanced'>('advanced');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResults, setCrawlResults] = useState<Array<{ url: string; rawContent: string }>>([]);

  // Extract State
  const [extractUrlsInput, setExtractUrlsInput] = useState('https://example.com');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResults, setExtractResults] = useState<Array<{ url: string; rawContent: string }>>([]);

  // Search State
  const [tavilySearchInput, setTavilySearchInput] = useState('Generative AI robotics venture funding 2026');
  const [tavilySearchDepth, setTavilySearchDepth] = useState<'basic' | 'advanced'>('advanced');
  const [tavilySearchDomain, setTavilySearchDomain] = useState('');
  const [isTavilySearching, setIsTavilySearching] = useState(false);
  const [tavilySearchResults, setTavilySearchResults] = useState<any[]>([]);

  // Drawer research state
  const [drawerResearching, setDrawerResearching] = useState(false);
  const [drawerResearchReport, setDrawerResearchReport] = useState<Record<number, { content: string; sources: any[] }>>({});

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
        let res = null;
        try {
          res = await fetch('https://offline-os.onrender.com/process-new-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          });
        } catch (_) {}

        if (!res || !res.ok) {
          // Resilient fallback to local NetworkOS ingest API
          res = await fetch('/api/v1/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...row, source: 'airtable_csv_import' }),
          });
        }

        if (!res.ok) {
          throw new Error(`Pipeline API returned status ${res.status}`);
        }

        const data = await res.json();
        let resultSummary = '';
        if (data.is_duplicate || data.duplicate_detected) {
          resultSummary = `⚠️ Flagged duplicate (${Math.round((data.confidence || 0.95) * 100)}% match)`;
        } else {
          const rec = data.record || data;
          resultSummary = `✨ Saved! Fit: ${rec.fit_score || 80}/100 | ${rec.role_type || 'member'} | ${(rec.sector_tags || []).join(', ') || 'general'}`;
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

  // Airtable Metadata, Schema & Webhook Handlers
  const fetchAirtableTables = async (baseId: string) => {
    if (!baseId) return;
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/airtable/tables?baseId=${encodeURIComponent(baseId)}`);
      const data = await res.json();
      if (data.tables && data.tables.length > 0) {
        setAirtableTablesList(data.tables);
        if (!airtableTableName || airtableTableName === 'Applicants') {
          setAirtableTableName(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load Airtable tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchAirtableWebhooks = async (baseId: string) => {
    if (!baseId) return;
    setLoadingWebhooks(true);
    try {
      const res = await fetch(`/api/airtable/webhooks?baseId=${encodeURIComponent(baseId)}`);
      const data = await res.json();
      if (data.webhooks) {
        setAirtableWebhooksList(data.webhooks);
      }
    } catch (err) {
      console.error('Failed to load Airtable webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!airtableBaseId.trim()) {
      alert('Please select or specify an Airtable Base ID first.');
      return;
    }
    setCreatingWebhook(true);
    try {
      const res = await fetch('/api/airtable/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseId: airtableBaseId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create webhook');
      alert(`✅ Webhook registered successfully!\nID: ${data.webhook?.id}\nExpires in 7 days.`);
      await fetchAirtableWebhooks(airtableBaseId.trim());
    } catch (err: any) {
      alert('Webhook Registration Error: ' + err.message);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleRefreshWebhook = async (webhookId: string) => {
    try {
      const res = await fetch('/api/airtable/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseId: airtableBaseId.trim(), webhookId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refresh webhook');
      alert(data.message || 'Webhook successfully refreshed for another 7 days!');
      await fetchAirtableWebhooks(airtableBaseId.trim());
    } catch (err: any) {
      alert('Error refreshing webhook: ' + err.message);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to unregister and delete this Airtable webhook?')) return;
    try {
      const res = await fetch(`/api/airtable/webhooks?baseId=${encodeURIComponent(airtableBaseId.trim())}&webhookId=${encodeURIComponent(webhookId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete webhook');
      alert(data.message || 'Webhook deleted');
      await fetchAirtableWebhooks(airtableBaseId.trim());
    } catch (err: any) {
      alert('Error deleting webhook: ' + err.message);
    }
  };

  const fetchAirtableBases = async () => {
    setLoadingBases(true);
    try {
      const res = await fetch('/api/airtable/bases');
      const data = await res.json();
      if (data.bases && data.bases.length > 0) {
        setAirtableBasesList(data.bases);
        const targetBaseId = airtableBaseId || data.bases[0].id;
        if (!airtableBaseId) {
          setAirtableBaseId(targetBaseId);
        }
        await Promise.all([
          fetchAirtableTables(targetBaseId),
          fetchAirtableWebhooks(targetBaseId),
        ]);
      }
    } catch (err) {
      console.error('Failed to load Airtable bases:', err);
    } finally {
      setLoadingBases(false);
    }
  };

  const handleSyncAirtable = async () => {
    if (!airtableBaseId.trim() || !airtableTableName.trim()) {
      alert('Please provide both Airtable Base ID and Table Name');
      return;
    }

    setImporting(true);
    setImportProgress({
      current: 0,
      total: 100,
      logs: [
        `🚀 Connecting to Airtable Base [${airtableBaseId}] Table [${airtableTableName}]...`,
        '🔑 Authenticating using official Airtable Personal Access Token (PAT)...',
        '⏳ Fetching paginated records with cursor pagination...'
      ],
    });

    try {
      const res = await fetch('/api/airtable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseId: airtableBaseId.trim(),
          tableIdOrName: airtableTableName.trim(),
          autoEnrich: autoEnrichAirtable,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Airtable sync failed');
      }

      const syncLogs = [
        `✅ Airtable Sync Completed!`,
        `📊 Total rows retrieved: ${data.total_fetched || 0}`,
        `📥 Ingested into Supabase: ${data.new_ingested || 0} new member profiles`,
        `🔍 Duplicates identified & deduplicated: ${data.duplicates_detected || 0}`,
      ];

      if (data.auto_enriched && data.auto_enriched > 0) {
        syncLogs.push(`⚡ Autonomous 360° AI enrichment triggered for ${data.auto_enriched} records (via TinyFish CLI & Tavily)`);
      }

      syncLogs.push('🎉 Sync complete! Live dashboard refreshed.');

      setImportProgress({
        current: 100,
        total: 100,
        logs: syncLogs,
      });

      await fetchData();
    } catch (err: any) {
      setImportProgress(prev => ({
        ...prev,
        logs: [...prev.logs, `❌ Error during Airtable sync: ${err.message}`],
      }));
    } finally {
      setImporting(false);
    }
  };

  // 360° AI Enrichment Handler
  const handleRunEnrichment = async (personId: number) => {
    setIsEnrichingPerson(true);
    try {
      const res = await fetch('/api/people/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId }),
      });

      if (!res.ok) throw new Error('Enrichment API failed');
      const data = await res.json();

      if (data.member) {
        setPeople(prev => prev.map(p => (p.id === personId ? data.member : p)));
        if (selectedPerson?.id === personId) {
          setSelectedPerson(data.member);
        }
      }
      if (data.dossier) {
        setDossierCache(prev => ({ ...prev, [personId]: data.dossier }));
      }
    } catch (err: any) {
      console.error('Enrichment error:', err);
      alert('Enrichment error: ' + err.message);
    } finally {
      setIsEnrichingPerson(false);
    }
  };

  // Live Workspace Purge Handler
  const handlePurgeLive = async () => {
    setIsPurgingLive(true);
    try {
      const res = await fetch('/api/workspace/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_live' }),
      });

      if (!res.ok) throw new Error('Failed to purge live workspace');
      const data = await res.json();
      alert(data.message || 'Live records purged successfully.');
      setShowPurgeModal(false);
      await fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsPurgingLive(false);
    }
  };

  // Tavily AI Core Suite Handlers
  const handleRunTavilyResearch = async (overridePrompt?: string) => {
    const promptToRun = overridePrompt || researchPrompt;
    if (!promptToRun.trim()) {
      alert('Please enter a research topic or question');
      return;
    }
    setIsResearching(true);
    setResearchStatus('pending');
    setResearchReport(null);
    setResearchSources([]);
    try {
      const res = await fetch('/api/tavily/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: promptToRun.trim(), model: researchModel }),
      });
      const data = await res.json();
      if (!res.ok || !data.requestId) {
        throw new Error(data.error || 'Failed to initiate deep research');
      }
      setResearchRequestId(data.requestId);
      setResearchStatus('in_progress');

      // Poll every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/tavily/research?requestId=${encodeURIComponent(data.requestId)}`);
          const pollData = await pollRes.json();
          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setResearchStatus('completed');
            setResearchReport(pollData.content || pollData.report || 'Research report compiled.');
            setResearchSources(pollData.sources || []);
            setIsResearching(false);
          } else if (pollData.status === 'failed') {
            clearInterval(pollInterval);
            setResearchStatus('failed');
            setIsResearching(false);
            alert('Research task encountered an issue: ' + (pollData.error || 'Unknown error'));
          }
        } catch (pollErr) {
          console.error('Research polling error:', pollErr);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Research error:', err);
      setResearchStatus('failed');
      setIsResearching(false);
      alert('Error initiating research: ' + err.message);
    }
  };

  const handleRunTavilyCrawl = async () => {
    if (!crawlInputUrl.trim()) {
      alert('Please enter a website URL to crawl');
      return;
    }
    setIsCrawling(true);
    try {
      const res = await fetch('/api/tavily/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: crawlInputUrl.trim(),
          limit: crawlLimit,
          extractDepth: crawlExtractDepth,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to crawl website');
      setCrawlResults(data.results || []);
    } catch (err: any) {
      console.error('Crawl error:', err);
      alert('Error crawling URL: ' + err.message);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleRunTavilyExtract = async () => {
    if (!extractUrlsInput.trim()) {
      alert('Please enter at least one URL to extract');
      return;
    }
    const urls = extractUrlsInput.split('\n').map(u => u.trim()).filter(Boolean);
    setIsExtracting(true);
    try {
      const res = await fetch('/api/tavily/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract URLs');
      setExtractResults(data.results || []);
    } catch (err: any) {
      console.error('Extract error:', err);
      alert('Error extracting: ' + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRunTavilySearch = async () => {
    if (!tavilySearchInput.trim()) {
      alert('Please enter a search query');
      return;
    }
    setIsTavilySearching(true);
    try {
      const res = await fetch('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: tavilySearchInput.trim(),
          searchDepth: tavilySearchDepth,
          includeDomains: tavilySearchDomain ? tavilySearchDomain.split(',').map(d => d.trim()).filter(Boolean) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run Tavily search');
      setTavilySearchResults(data.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      alert('Error searching: ' + err.message);
    } finally {
      setIsTavilySearching(false);
    }
  };

  const handleDrawerResearch = async (person: Person) => {
    setDrawerResearching(true);
    const query = `Comprehensive background, recent ventures, investments, market reputation, and executive dossier on ${person.name} (${person.role_title || 'Operator'} at ${person.company || 'Tech/Startup ecosystem'}). Bio: ${person.bio_notes || 'Leader'}`;
    try {
      const res = await fetch('/api/tavily/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query, model: 'mini' }),
      });
      const data = await res.json();
      if (!res.ok || !data.requestId) throw new Error(data.error || 'Failed to trigger drawer memo');

      // Poll until complete
      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/tavily/research?requestId=${encodeURIComponent(data.requestId)}`);
          const pollData = await pollRes.json();
          if (pollData.status === 'completed') {
            clearInterval(interval);
            setDrawerResearchReport(prev => ({
              ...prev,
              [person.id]: {
                content: pollData.content || pollData.report || 'Research completed.',
                sources: pollData.sources || [],
              },
            }));
            setDrawerResearching(false);
          } else if (pollData.status === 'failed') {
            clearInterval(interval);
            setDrawerResearching(false);
          }
        } catch {
          // ignore
        }
      }, 3000);
    } catch (err: any) {
      alert('Deep research error: ' + err.message);
      setDrawerResearching(false);
    }
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

  // Helper function to safely escape CSV cell values for Excel, Google Sheets, and LibreOffice
  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    if (Array.isArray(val)) {
      return `"${val.join('; ').replace(/"/g, '""')}"`;
    }
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // 1. Export filtered people dataset to CSV via Server API
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.set('type', 'members');
    params.set('format', 'csv');
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (sectorFilter !== 'ALL') params.set('sector', sectorFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    window.location.href = `/api/export?${params.toString()}`;
  };

  // 2. Export filtered people dataset to JSON via Server API
  const handleExportJSON = () => {
    const params = new URLSearchParams();
    params.set('type', 'members');
    params.set('format', 'json');
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (sectorFilter !== 'ALL') params.set('sector', sectorFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    window.location.href = `/api/export?${params.toString()}`;
  };

  // 3. Export duplicate candidate pairs to CSV via Server API
  const handleExportDuplicatesCSV = () => {
    const params = new URLSearchParams();
    params.set('type', 'duplicates');
    params.set('format', 'csv');
    params.set('dupFilter', duplicateFilter);

    window.location.href = `/api/export?${params.toString()}`;
  };

  // 4. Export approved / filtered introductions to CSV via Server API
  const handleExportIntrosCSV = () => {
    const params = new URLSearchParams();
    params.set('type', 'introductions');
    params.set('format', 'csv');

    window.location.href = `/api/export?${params.toString()}`;
  };

  // Active People based on Workspace Environment Mode
  const activePeople = useMemo(() => {
    if (workspaceMode === 'sandbox') return people;
    return people.filter(p =>
      p.source === 'webhook_ingest' ||
      p.source === 'tally_webhook' ||
      p.source === 'manual_operator_entry' ||
      p.source === 'public_application_form' ||
      p.source === 'n8n_webhook_ingest' ||
      p.source === 'airtable_csv_import' ||
      p.source === 'airtable_sync' ||
      p.source === 'airtable_webhook'
    );
  }, [people, workspaceMode]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = activePeople.length;
    const duplicates = activePeople.filter(p => p.is_duplicate_of !== null && p.review_status !== 'merged' && !mergedIds.has(p.id)).length;
    const resolvedDuplicates = activePeople.filter(p => p.is_duplicate_of !== null && (p.review_status === 'merged' || mergedIds.has(p.id))).length;
    const canonical = total - activePeople.filter(p => p.is_duplicate_of !== null).length;
    const incomplete = activePeople.filter(p => p.is_incomplete).length;
    const totalDuplicates = activePeople.filter(p => p.is_duplicate_of !== null).length;
    const scores = activePeople.map(p => p.fit_score).filter((s): s is number => s !== null);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const pendingIntros = introductions.filter(i => i.status === 'pending').length;
    const approvedIntros = introductions.filter(i => i.status === 'approved').length;

    return { total, duplicates, resolvedDuplicates, totalDuplicates, canonical, incomplete, avgScore, pendingIntros, approvedIntros };
  }, [activePeople, introductions, mergedIds]);

  // Filtered People
  const filteredPeople = useMemo(() => {
    return activePeople.filter(p => {
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
  }, [activePeople, searchQuery, roleFilter, sectorFilter, statusFilter]);

  // Duplicate Pairs
  const duplicatePairs = useMemo(() => {
    const peopleMap = new Map(activePeople.map(p => [p.id, p]));
    return activePeople
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
  }, [activePeople, mergedIds, duplicateFilter]);

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
          {activePeople.length}
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

      <button
        onClick={() => {
          setActiveTab('intelligence');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
          activeTab === 'intelligence'
            ? 'bg-signal-soft text-ink font-semibold border-l-2 border-signal'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-signal" />
          <span>Intelligence Lab</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded bg-signal/15 text-signal border border-signal/30">
          TAVILY AI
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
                    N
                  </div>
                  <h1 className="text-sm font-semibold tracking-tight text-ink flex items-center gap-2">
                    NetworkOS
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20">
                      INTELLIGENCE
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
              N
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-ink flex items-center gap-2">
                NetworkOS
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20">
                  PRO v2.0
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
            {/* Workspace Environment Toggle */}
            <div className="flex items-center bg-surface-raised border border-line rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setWorkspaceMode('sandbox')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  workspaceMode === 'sandbox'
                    ? 'bg-signal text-surface font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title="View Sandbox Benchmark Cohort (90+ curated members)"
              >
                <Database className="w-3 h-3" />
                <span className="hidden lg:inline">Sandbox Demo</span>
                <span className="lg:hidden">Sandbox</span>
              </button>
              <button
                onClick={() => setWorkspaceMode('live')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  workspaceMode === 'live'
                    ? 'bg-signal text-surface font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
                title="View Live Ingested Records (Webhooks, CSVs, n8n)"
              >
                <Terminal className="w-3 h-3" />
                <span className="hidden lg:inline">Live Workspace</span>
                <span className="lg:hidden">Live</span>
              </button>
            </div>

            {/* Ingest Airtable / CSV */}
            <button
              onClick={() => {
                setIsImportModalOpen(true);
                fetchAirtableBases();
              }}
              className="min-h-[40px] px-3 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Airtable Live Sync, Webhook Stream, or CSV Import"
            >
              <UploadCloud className="w-3.5 h-3.5 text-signal" />
              <span className="hidden sm:inline">Sync & Ingest</span>
              <span className="sm:hidden">Ingest</span>
            </button>

            <Link
              href="/apply"
              target="_blank"
              className="min-h-[40px] px-3 text-xs bg-surface-raised border border-line text-ink hover:bg-surface-muted font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <span className="hidden sm:inline">Public Intake</span>
              <span className="sm:hidden">Intake</span>
              <ExternalLink className="w-3 h-3 text-ink-muted" />
            </Link>

            {workspaceMode === 'live' && activePeople.length > 0 && (
              <button
                onClick={() => setShowPurgeModal(true)}
                className="min-h-[40px] px-2.5 text-xs bg-danger-soft/30 text-danger border border-danger/40 hover:bg-danger-soft/60 font-medium rounded flex items-center gap-1 transition-colors"
                title="Purge live records to start with a fresh blank canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Purge Live</span>
              </button>
            )}

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

              <div className="hidden md:flex items-center gap-3">
                <div className="text-xs font-mono text-ink-muted tabular-nums">
                  Showing {filteredPeople.length} of {activePeople.length} members
                </div>
                <div className="flex items-center gap-1.5 border-l border-line pl-3">
                  <a
                    href={`/api/export?type=members&format=csv&role=${encodeURIComponent(roleFilter)}&sector=${encodeURIComponent(sectorFilter)}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`}
                    download={`network_os_members_${new Date().toISOString().slice(0, 10)}.csv`}
                    className="h-7 px-2 bg-surface border border-line hover:border-signal/50 text-ink rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="Export filtered records to CSV"
                  >
                    <Download className="w-3 h-3 text-ink-muted" />
                    <span>CSV</span>
                  </a>
                  <a
                    href={`/api/export?type=members&format=json&role=${encodeURIComponent(roleFilter)}&sector=${encodeURIComponent(sectorFilter)}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`}
                    download={`network_os_members_${new Date().toISOString().slice(0, 10)}.json`}
                    className="h-7 px-2 bg-surface border border-line hover:border-signal/50 text-ink rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="Export filtered records to JSON"
                  >
                    <FileText className="w-3 h-3 text-ink-muted" />
                    <span>JSON</span>
                  </a>
                </div>
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
                    <option value="FOUNDER">Founders & Co-Founders</option>
                    <option value="OPERATOR">Operators & Executives</option>
                    <option value="INVESTOR">Investors & Angels</option>
                    <option value="RESEARCHER">Researchers & Scientists</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-ink-muted block mb-1">Sector Focus</label>
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
                  <label className="text-[11px] font-mono text-ink-muted block mb-1">Quality / Triage Status</label>
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

            {/* 1. DESKTOP DATA TABLE (md+) */}
            <div className="hidden md:block flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface-raised border-b border-line text-ink-muted font-mono text-[11px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold w-12">ID</th>
                    <th className="py-2.5 px-4 font-semibold">Name & Company</th>
                    <th className="py-2.5 px-4 font-semibold">Role & Seniority</th>
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
                      <td colSpan={7} className="py-10 px-6 text-center">
                        {workspaceMode === 'live' && activePeople.length === 0 ? (
                          <div className="max-w-xl mx-auto p-6 bg-surface-raised border border-line rounded-xl text-left space-y-4 shadow-sm">
                            <div className="flex items-center gap-3 border-b border-line pb-3">
                              <div className="w-9 h-9 rounded-lg bg-signal-soft text-signal flex items-center justify-center font-bold font-mono">
                                N
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-ink">Your Live Network Workspace is Ready</h3>
                                <p className="text-xs text-ink-muted">No live members ingested yet. Connect your intake channels or import your existing cohort.</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="p-3 bg-surface border border-line hover:border-signal/50 rounded-lg text-left space-y-1 transition-colors group"
                              >
                                <div className="font-semibold text-ink group-hover:text-signal flex items-center gap-1.5">
                                  <UploadCloud className="w-3.5 h-3.5 text-signal" />
                                  <span>Import Airtable / CSV</span>
                                </div>
                                <p className="text-[11px] text-ink-muted">Upload a spreadsheet or paste raw rows to bulk populate.</p>
                              </button>

                              <Link
                                href="/apply"
                                target="_blank"
                                className="p-3 bg-surface border border-line hover:border-signal/50 rounded-lg text-left space-y-1 transition-colors group block"
                              >
                                <div className="font-semibold text-ink group-hover:text-signal flex items-center gap-1.5">
                                  <ExternalLink className="w-3.5 h-3.5 text-copper" />
                                  <span>Share Public Intake</span>
                                </div>
                                <p className="text-[11px] text-ink-muted">Open the branded applicant portal at /apply.</p>
                              </Link>

                              <div className="p-3 bg-surface border border-line rounded-lg text-left space-y-1 col-span-1 sm:col-span-2">
                                <div className="font-semibold text-ink flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-signal" />
                                    <span>Webhook Endpoint for n8n & Tally:</span>
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard('/api/v1/ingest', -1)}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted hover:bg-surface-raised border border-line text-ink"
                                  >
                                    {copiedIntroId === -1 ? 'Copied!' : 'Copy Path'}
                                  </button>
                                </div>
                                <div className="font-mono text-[11px] text-signal bg-canvas p-1.5 rounded border border-line break-all">
                                  POST /api/v1/ingest
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-ink-muted text-xs">
                            No members match your current filter query.
                          </div>
                        )}
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
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <a
                                href={`/api/export?type=members&id=${person.id}&format=csv`}
                                download={`offline_crm_lead_${person.id}_${person.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-ink-muted hover:text-signal hover:bg-surface-raised rounded border border-transparent hover:border-line transition-colors"
                                title={`Export ${person.name} profile to CSV`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
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
                            </div>
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
                      className="p-4 bg-surface border border-line rounded-lg shadow-xs space-y-3 cursor-pointer hover:border-line-strong transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                            <span>{person.name}</span>
                            <span className="font-mono text-[10px] text-ink-muted">#{person.id}</span>
                          </div>
                          <div className="text-xs text-ink-muted mt-0.5">
                            {person.role_title} • <strong className="text-ink">{person.company || 'Independent'}</strong>
                          </div>
                        </div>
                        {person.fit_score !== null && (
                          <span
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded border shrink-0"
                            style={{
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
                            {person.fit_score}/100
                          </span>
                        )}
                      </div>

                      {person.bio_notes && (
                        <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                          {person.bio_notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                        <div className="flex items-center gap-1.5">
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

                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/export?type=members&id=${person.id}&format=csv`}
                            download={`offline_crm_lead_${person.id}_${person.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`}
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[44px] px-2 text-xs text-ink-muted hover:text-signal inline-flex items-center gap-1"
                            title="Export CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>CSV</span>
                          </a>
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

              {/* View Toggle Tabs & Export Button */}
              <div className="flex flex-wrap items-center gap-2">
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
                    All History ({metrics.totalDuplicates})
                  </button>
                </div>

                <a
                  href={`/api/export?type=duplicates&format=csv&dupFilter=${encodeURIComponent(duplicateFilter)}`}
                  download={`offline_crm_duplicates_${duplicateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`}
                  className="h-8 px-3 bg-surface border border-line hover:border-signal/50 text-ink rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Export duplicate pairs and audit history to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-signal" />
                  <span>Export Duplicates CSV</span>
                </a>
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
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-ink-muted hidden sm:block">
                  Showing {filteredIntros.length} intro matches generated by AI Relationship Matching Engine
                </div>
                <a
                  href="/api/export?type=introductions&format=csv"
                  download={`offline_crm_intros_${new Date().toISOString().slice(0, 10)}.csv`}
                  className="h-8 px-2.5 bg-surface border border-line hover:border-signal/50 text-ink rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Export filtered introduction pairs and draft messages to CSV for outreach"
                >
                  <Download className="w-3.5 h-3.5 text-copper" />
                  <span>Export Outreach CSV</span>
                </a>
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

                      {/* Approval & Dispatch Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isApproved ? (
                          <div className="flex items-center gap-2">
                            <span className="min-h-[38px] px-3 py-1 text-xs rounded bg-signal text-surface font-semibold flex items-center gap-1 shadow-xs">
                              <Check className="w-3.5 h-3.5" /> Approved
                            </span>
                            <button
                              onClick={() => setSelectedIntroForDispatch(intro)}
                              className="min-h-[38px] px-3 py-1 text-xs rounded bg-surface border border-copper text-copper font-medium hover:bg-copper-soft/40 transition-colors flex items-center gap-1.5 shadow-xs"
                              title="Open Warm Intro Dispatcher Modal"
                            >
                              <Send className="w-3.5 h-3.5 text-copper" />
                              <span>Dispatch Email</span>
                            </button>
                          </div>
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

        {/* 2D. TAVILY DEEP INTELLIGENCE LAB */}
        {activeTab === 'intelligence' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Header & Capabilities Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-signal">
                    Autonomous Intelligence Engine
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal/15 text-signal border border-signal/30 font-semibold">
                    @tavily/core v0.7+
                  </span>
                </div>
                <h2 className="text-xl font-bold text-ink tracking-tight">Deep Intelligence Lab</h2>
                <p className="text-xs text-ink-muted mt-1 max-w-2xl">
                  Deploy autonomous web research tasks, recursive domain crawlers, multi-URL content extractors, and real-time neural search directly into your community intelligence pipeline.
                </p>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex items-center gap-1.5 p-1 bg-surface border border-line rounded-lg overflow-x-auto">
                <button
                  onClick={() => setIntelligenceSubTab('research')}
                  className={`px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    intelligenceSubTab === 'research'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Deep Research</span>
                </button>
                <button
                  onClick={() => setIntelligenceSubTab('crawl')}
                  className={`px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    intelligenceSubTab === 'crawl'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Site Crawler</span>
                </button>
                <button
                  onClick={() => setIntelligenceSubTab('extract')}
                  className={`px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    intelligenceSubTab === 'extract'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>URL Extractor</span>
                </button>
                <button
                  onClick={() => setIntelligenceSubTab('search')}
                  className={`px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    intelligenceSubTab === 'search'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Neural Search</span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: AUTONOMOUS DEEP RESEARCH */}
            {intelligenceSubTab === 'research' && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                {/* Research Input Card */}
                <div className="bg-surface border border-line rounded-lg p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-signal" />
                        <span>Autonomous Deep Research Memo Generator</span>
                      </h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Tavily creates a multi-step query plan, executes comprehensive web searches, and compiles an exhaustive cited intelligence memo.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-muted">Model:</span>
                      <div className="flex items-center bg-surface-raised border border-line rounded p-0.5 text-xs">
                        <button
                          onClick={() => setResearchModel('mini')}
                          className={`px-2.5 py-0.5 rounded font-mono transition-colors ${
                            researchModel === 'mini' ? 'bg-signal text-surface font-semibold' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          mini (fast)
                        </button>
                        <button
                          onClick={() => setResearchModel('pro')}
                          className={`px-2.5 py-0.5 rounded font-mono transition-colors ${
                            researchModel === 'pro' ? 'bg-signal text-surface font-semibold' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          pro (deep)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={researchPrompt}
                      onChange={e => setResearchPrompt(e.target.value)}
                      placeholder="Enter a research question, target domain, company competitive analysis, or thesis..."
                      className="w-full p-3 text-sm bg-surface-raised border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-signal leading-relaxed font-sans"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-ink-faint">Suggestions:</span>
                      {[
                        'AI Coding Agents & Autonomous Software in 2026',
                        'Top AI Founders & Builders in Bangalore India',
                        'Creatr DeepBuild Competitive Strategy & Enterprise Landscape',
                        'Decoupling B2B CRM Architecture with Autonomous Scraping',
                      ].map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setResearchPrompt(chip)}
                          className="px-2 py-0.5 rounded text-[11px] bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <div className="text-xs font-mono text-ink-muted">
                      Status: <strong className="text-ink uppercase">{researchStatus}</strong>
                      {researchRequestId && (
                        <span className="ml-2 text-ink-faint">({researchRequestId})</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleRunTavilyResearch()}
                      disabled={isResearching}
                      className="px-4 py-2 bg-signal text-surface rounded-lg text-xs font-semibold hover:bg-signal/90 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin' : ''}`} />
                      <span>{isResearching ? 'Synthesizing Intelligence...' : '🚀 Execute Deep Research'}</span>
                    </button>
                  </div>
                </div>

                {/* Polling / Loading Indicator */}
                {isResearching && (
                  <div className="bg-signal-soft/20 border border-signal/30 rounded-lg p-5 text-center space-y-3 animate-in fade-in-50">
                    <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin mx-auto" />
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        Autonomous Research in Progress...
                      </div>
                      <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
                        Tavily agent is executing real-time web searches, traversing primary sources, extracting full text, and synthesizing an executive report. (Typically takes 10-25 seconds).
                      </p>
                    </div>
                  </div>
                )}

                {/* Research Output Memo */}
                {researchReport && (
                  <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-5 animate-in fade-in-50">
                    <div className="flex items-center justify-between border-b border-line pb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal text-surface font-semibold">
                          SYNTHESIZED REPORT
                        </span>
                        <span className="text-xs font-mono text-ink-muted">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(researchReport, 99999)}
                        className="px-3 py-1 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink rounded flex items-center gap-1.5 transition-colors"
                      >
                        {copiedIntroId === 99999 ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-signal" />
                            <span>Copied Report</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-ink-muted" />
                            <span>Copy Markdown</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Cited Sources List */}
                    {researchSources && researchSources.length > 0 && (
                      <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-2">
                        <span className="text-[11px] font-mono uppercase text-signal font-semibold block">
                          Verified Primary Sources Cited ({researchSources.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {researchSources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-surface border border-line hover:border-signal/50 rounded flex items-center justify-between gap-2 text-ink hover:text-signal transition-colors group truncate"
                            >
                              <span className="truncate font-medium">{src.title || src.url}</span>
                              <ExternalLink className="w-3 h-3 text-ink-muted group-hover:text-signal flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className="prose dark:prose-invert max-w-none text-xs text-ink leading-relaxed font-sans whitespace-pre-wrap p-4 bg-surface-raised rounded-lg border border-line font-mono overflow-x-auto">
                      {researchReport}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: RECURSIVE SITE CRAWLER & MAPPER */}
            {intelligenceSubTab === 'crawl' && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                <div className="bg-surface border border-line rounded-lg p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                      <Globe className="w-4 h-4 text-signal" />
                      <span>Recursive Site Crawler & Schema Mapper</span>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Crawl any website recursively, discover sub-paths, and extract full-fidelity LLM-ready markdown.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Target Website URL</label>
                      <input
                        type="url"
                        value={crawlInputUrl}
                        onChange={e => setCrawlInputUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Page Limit (Max: 50)</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={crawlLimit}
                        onChange={e => setCrawlLimit(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                      <span>Extract Depth:</span>
                      <button
                        onClick={() => setCrawlExtractDepth('basic')}
                        className={`px-2 py-0.5 rounded text-[11px] ${crawlExtractDepth === 'basic' ? 'bg-signal text-surface' : 'bg-surface-raised text-ink-muted'}`}
                      >
                        basic
                      </button>
                      <button
                        onClick={() => setCrawlExtractDepth('advanced')}
                        className={`px-2 py-0.5 rounded text-[11px] ${crawlExtractDepth === 'advanced' ? 'bg-signal text-surface' : 'bg-surface-raised text-ink-muted'}`}
                      >
                        advanced (markdown)
                      </button>
                    </div>

                    <button
                      onClick={handleRunTavilyCrawl}
                      disabled={isCrawling}
                      className="px-4 py-2 bg-signal text-surface rounded-lg text-xs font-semibold hover:bg-signal/90 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCrawling ? 'animate-spin' : ''}`} />
                      <span>{isCrawling ? 'Crawling Domain...' : '🕷️ Execute Domain Crawl'}</span>
                    </button>
                  </div>
                </div>

                {/* Crawl Results */}
                {crawlResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-ink-muted">
                      Crawled <strong className="text-ink">{crawlResults.length}</strong> pages successfully:
                    </div>
                    <div className="space-y-3">
                      {crawlResults.map((item, idx) => (
                        <div key={idx} className="bg-surface border border-line rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-signal hover:underline flex items-center gap-1.5 truncate"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.url}</span>
                            </a>
                            <span className="text-[10px] font-mono text-ink-muted">
                              {(item.rawContent || '').length} characters
                            </span>
                          </div>
                          <div className="p-3 bg-surface-raised rounded text-[11px] font-mono text-ink-muted max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {item.rawContent?.slice(0, 500)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: MULTI-URL CONTENT EXTRACTOR */}
            {intelligenceSubTab === 'extract' && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                <div className="bg-surface border border-line rounded-lg p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                      <FileText className="w-4 h-4 text-signal" />
                      <span>Multi-URL Clean Markdown Extractor</span>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Batch extract clean, structured LLM-ready markdown from up to 20 URLs in parallel.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Target URLs (One per line)</label>
                    <textarea
                      rows={4}
                      value={extractUrlsInput}
                      onChange={e => setExtractUrlsInput(e.target.value)}
                      placeholder="https://news.ycombinator.com&#10;https://github.com/bhaktofmahakal/offline-os"
                      className="w-full p-3 text-xs bg-surface-raised border border-line rounded font-mono text-ink"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-line">
                    <button
                      onClick={handleRunTavilyExtract}
                      disabled={isExtracting}
                      className="px-4 py-2 bg-signal text-surface rounded-lg text-xs font-semibold hover:bg-signal/90 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                      <span>{isExtracting ? 'Extracting Content...' : '📄 Run Content Extraction'}</span>
                    </button>
                  </div>
                </div>

                {/* Extract Results */}
                {extractResults.length > 0 && (
                  <div className="space-y-4">
                    {extractResults.map((item, idx) => (
                      <div key={idx} className="bg-surface border border-line rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <span className="text-xs font-mono font-semibold text-signal truncate">{item.url}</span>
                          <button
                            onClick={() => copyToClipboard(item.rawContent, 88880 + idx)}
                            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="p-3 bg-surface-raised rounded text-[11px] font-mono text-ink max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {item.rawContent}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: NEURAL WEB SEARCH */}
            {intelligenceSubTab === 'search' && (
              <div className="space-y-5 animate-in fade-in-50 duration-150">
                <div className="bg-surface border border-line rounded-lg p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                      <Search className="w-4 h-4 text-signal" />
                      <span>Neural Web Search Engine</span>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Fast, semantic web search tailored specifically for LLMs and autonomous agents.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Search Query</label>
                      <input
                        type="text"
                        value={tavilySearchInput}
                        onChange={e => setTavilySearchInput(e.target.value)}
                        placeholder="Search for companies, founders, breakthroughs..."
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Domain Filter (Optional, comma-separated)</label>
                      <input
                        type="text"
                        value={tavilySearchDomain}
                        onChange={e => setTavilySearchDomain(e.target.value)}
                        placeholder="techcrunch.com, ycombinator.com"
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                      <span>Search Depth:</span>
                      <button
                        onClick={() => setTavilySearchDepth('basic')}
                        className={`px-2 py-0.5 rounded text-[11px] ${tavilySearchDepth === 'basic' ? 'bg-signal text-surface' : 'bg-surface-raised text-ink-muted'}`}
                      >
                        basic
                      </button>
                      <button
                        onClick={() => setTavilySearchDepth('advanced')}
                        className={`px-2 py-0.5 rounded text-[11px] ${tavilySearchDepth === 'advanced' ? 'bg-signal text-surface' : 'bg-surface-raised text-ink-muted'}`}
                      >
                        advanced
                      </button>
                    </div>

                    <button
                      onClick={handleRunTavilySearch}
                      disabled={isTavilySearching}
                      className="px-4 py-2 bg-signal text-surface rounded-lg text-xs font-semibold hover:bg-signal/90 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isTavilySearching ? 'Searching...' : '⚡ Run Search'}</span>
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {tavilySearchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-ink-muted">
                      Found <strong className="text-ink">{tavilySearchResults.length}</strong> verified web results:
                    </div>
                    <div className="space-y-3">
                      {tavilySearchResults.map((result, idx) => (
                        <div key={idx} className="bg-surface border border-line rounded-lg p-4 space-y-2 hover:border-signal/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-ink hover:text-signal transition-colors flex items-center gap-1.5"
                              >
                                <span>{result.title}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0 text-ink-muted" />
                              </a>
                              <div className="text-[11px] font-mono text-ink-muted mt-0.5 truncate">
                                {result.url}
                              </div>
                            </div>
                            {result.score && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal-soft text-signal border border-signal/20 font-semibold flex-shrink-0">
                                {Math.round(result.score * 100)}% match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">
                            {result.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!isEditingMember && (
                  <>
                    <a
                      href={`/api/export?type=members&id=${selectedPerson.id}&format=csv`}
                      download={`offline_crm_lead_${selectedPerson.id}_${selectedPerson.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`}
                      className="h-8 px-2.5 text-xs bg-surface border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1 transition-colors shadow-xs whitespace-nowrap"
                      title="Export this individual lead profile to CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-signal" />
                      <span>CSV</span>
                    </a>
                    <button
                      onClick={handleStartEditMember}
                      className="h-8 px-2.5 text-xs bg-surface border border-line hover:border-signal/50 text-ink font-medium rounded flex items-center gap-1 transition-colors whitespace-nowrap"
                      title="Edit member details, role, tags, fit score"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-signal" />
                      <span>Edit</span>
                    </button>
                  </>
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

                  {/* 360° Autonomous AI Intelligence Dossier */}
                  <div className="p-3.5 bg-surface-raised border border-line rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-signal uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>360° AI Intelligence Dossier</span>
                      </div>
                      <button
                        onClick={() => handleRunEnrichment(selectedPerson.id)}
                        disabled={isEnrichingPerson}
                        className="px-2 py-1 bg-signal text-surface text-[10px] font-mono font-semibold rounded hover:bg-signal/90 flex items-center gap-1 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        <Zap className={`w-3 h-3 ${isEnrichingPerson ? 'animate-spin' : ''}`} />
                        <span>{isEnrichingPerson ? 'Enriching...' : '⚡ Run 360° AI Enrichment'}</span>
                      </button>
                    </div>

                    {dossierCache[selectedPerson.id] ? (
                      <div className="space-y-2.5 pt-1 text-xs animate-in fade-in-50 duration-200">
                        {/* Executive Summary */}
                        <div className="p-2.5 bg-surface rounded border border-line text-[11px] text-ink leading-relaxed">
                          <strong className="text-signal font-mono uppercase text-[10px] block mb-1">Executive Debrief</strong>
                          {dossierCache[selectedPerson.id].executive_summary}
                        </div>

                        {/* Traction Signals */}
                        {dossierCache[selectedPerson.id].traction_signals?.length > 0 && (
                          <div>
                            <span className="font-mono text-[10px] text-ink-muted uppercase block mb-1">Verified Traction Signals</span>
                            <div className="space-y-1">
                              {dossierCache[selectedPerson.id].traction_signals.map((sig: string, sIdx: number) => (
                                <div key={sIdx} className="flex items-center gap-1.5 text-[11px] text-ink">
                                  <CheckCircle2 className="w-3 h-3 text-signal flex-shrink-0" />
                                  <span>{sig}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tech Stack & Key Archetypes */}
                        {dossierCache[selectedPerson.id].tech_stack?.length > 0 && (
                          <div>
                            <span className="font-mono text-[10px] text-ink-muted uppercase block mb-1">Detected Tech Stack</span>
                            <div className="flex flex-wrap gap-1">
                              {dossierCache[selectedPerson.id].tech_stack.map((tech: string, tIdx: number) => (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-signal-soft/40 text-signal border border-signal/20">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-ink-muted italic flex items-center justify-between py-1">
                        <span>Click to scrape GitHub, funding signals & synthesize dossier.</span>
                        <span className="font-mono text-[10px] text-signal font-semibold">Tavily • Firecrawl • Gemini</span>
                      </div>
                    )}
                  </div>

                  {/* Tavily Autonomous Deep Memo Card */}
                  <div className="p-3.5 bg-surface-raised border border-line rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-signal uppercase">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Tavily Deep Intel Memo</span>
                      </div>
                      <button
                        onClick={() => handleDrawerResearch(selectedPerson)}
                        disabled={drawerResearching}
                        className="px-2 py-1 bg-surface border border-signal/40 text-signal hover:bg-signal-soft text-[10px] font-mono font-semibold rounded flex items-center gap-1 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                        title="Generate autonomous executive research report using Tavily Research endpoint"
                      >
                        <RefreshCw className={`w-3 h-3 ${drawerResearching ? 'animate-spin' : ''}`} />
                        <span>{drawerResearching ? 'Synthesizing Memo...' : '🔬 Run Deep Memo'}</span>
                      </button>
                    </div>

                    {drawerResearchReport[selectedPerson.id] ? (
                      <div className="space-y-2 pt-1 text-xs animate-in fade-in-50 duration-200">
                        <div className="p-2.5 bg-surface rounded border border-line text-[11px] text-ink leading-relaxed max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                          {drawerResearchReport[selectedPerson.id].content}
                        </div>
                        {drawerResearchReport[selectedPerson.id].sources?.length > 0 && (
                          <div className="text-[10px] space-y-1">
                            <span className="font-mono text-ink-muted uppercase block">Sources Cited:</span>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {drawerResearchReport[selectedPerson.id].sources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-signal hover:underline flex items-center gap-1 truncate"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate">{src.title || src.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-muted italic">
                        Generate an autonomous deep research memo on {selectedPerson.name} and their market footprint.
                      </p>
                    )}
                  </div>

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

      {/* 5. MULTI-SOURCE INGESTION & AIRTABLE SYNC MODAL */}
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
                  <h3 className="text-sm sm:text-base font-semibold text-ink">Data Ingestion & Sync Hub</h3>
                  <p className="text-xs text-ink-muted">Airtable live pull sync, real-time incoming webhook stream, or CSV spreadsheet import</p>
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

            {/* Ingestion Source Tabs */}
            {importProgress.logs.length === 0 && (
              <div className="px-4 sm:px-6 pt-3 border-b border-line bg-surface-raised flex items-center gap-2 overflow-x-auto text-xs">
                <button
                  onClick={() => {
                    setImportTab('airtable');
                    fetchAirtableBases();
                  }}
                  className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                    importTab === 'airtable'
                      ? 'border-signal text-signal font-semibold'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Airtable Live Pull</span>
                </button>
                <button
                  onClick={() => setImportTab('webhook')}
                  className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                    importTab === 'webhook'
                      ? 'border-signal text-signal font-semibold'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-Time Webhook</span>
                </button>
                <button
                  onClick={() => setImportTab('csv')}
                  className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                    importTab === 'csv'
                      ? 'border-signal text-signal font-semibold'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Spreadsheet</span>
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {importProgress.logs.length === 0 ? (
                <>
                  {/* TAB 1: AIRTABLE DIRECT SYNC */}
                  {importTab === 'airtable' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-surface-raised border border-line rounded-lg flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                        <div className="text-[11px] text-ink-muted leading-relaxed">
                          Connected to Airtable Web API using your configured Personal Access Token (PAT).
                          Synchronizes paginated records with cursor throttling, auto-deduplication, and dynamic column mapping.
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-mono text-[11px] text-ink-muted uppercase">
                              Airtable Base
                            </label>
                            <button
                              onClick={fetchAirtableBases}
                              disabled={loadingBases}
                              className="text-[11px] text-signal hover:underline flex items-center gap-1 font-mono"
                            >
                              <RefreshCw className={`w-3 h-3 ${loadingBases ? 'animate-spin' : ''}`} />
                              <span>{loadingBases ? 'Loading...' : 'Refresh Bases'}</span>
                            </button>
                          </div>

                          {airtableBasesList.length > 0 ? (
                            <select
                              value={airtableBaseId}
                              onChange={e => {
                                const newBaseId = e.target.value;
                                setAirtableBaseId(newBaseId);
                                fetchAirtableTables(newBaseId);
                                fetchAirtableWebhooks(newBaseId);
                              }}
                              className="w-full h-9 px-2.5 bg-surface-raised border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                            >
                              {airtableBasesList.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.id})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={airtableBaseId}
                              onChange={e => {
                                const val = e.target.value;
                                setAirtableBaseId(val);
                                if (val.startsWith('app') && val.length > 10) {
                                  fetchAirtableTables(val);
                                  fetchAirtableWebhooks(val);
                                }
                              }}
                              placeholder="appXXXXXXXXXXXXXX"
                              className="w-full h-9 px-2.5 bg-surface-raised border border-line rounded text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-signal"
                            />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-mono text-[11px] text-ink-muted uppercase">
                              Target Table
                            </label>
                            {loadingTables && (
                              <span className="text-[10px] text-ink-muted font-mono animate-pulse">
                                Fetching tables...
                              </span>
                            )}
                          </div>

                          {airtableTablesList.length > 0 ? (
                            <select
                              value={airtableTableName}
                              onChange={e => setAirtableTableName(e.target.value)}
                              className="w-full h-9 px-2.5 bg-surface-raised border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                            >
                              {airtableTablesList.map(t => (
                                <option key={t.id} value={t.name}>
                                  {t.name} ({t.id}) — {t.fields?.length || 0} fields
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={airtableTableName}
                              onChange={e => setAirtableTableName(e.target.value)}
                              placeholder="e.g. Applicants or tblXXXXXXXXXXXXXX"
                              className="w-full h-9 px-2.5 bg-surface-raised border border-line rounded text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-signal"
                            />
                          )}
                          <p className="text-[10px] text-ink-muted mt-1 font-mono">
                            Auto-maps columns: Name, Email, Company, Role, Bio, LinkedIn, Website, Twitter.
                          </p>
                        </div>

                        {/* Official Webhooks Lifecycle Management */}
                        <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-ink text-xs">
                              <Zap className="w-3.5 h-3.5 text-signal" />
                              <span>Official Airtable Webhooks (7-Day Lifecycle)</span>
                            </div>
                            <button
                              onClick={() => fetchAirtableWebhooks(airtableBaseId)}
                              disabled={loadingWebhooks || !airtableBaseId}
                              className="text-[10px] text-signal hover:underline flex items-center gap-1 font-mono"
                            >
                              <RefreshCw className={`w-3 h-3 ${loadingWebhooks ? 'animate-spin' : ''}`} />
                              <span>Refresh</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-ink-muted leading-relaxed">
                            Official Airtable Webhooks push notifications directly into NetworkOS. As per Airtable API policy, tokens expire in 7 days and can be refreshed anytime.
                          </p>

                          <div className="pt-1">
                            {loadingWebhooks ? (
                              <div className="text-[11px] text-ink-muted font-mono animate-pulse">Checking registered webhooks...</div>
                            ) : airtableWebhooksList.length > 0 ? (
                              <div className="space-y-2">
                                {airtableWebhooksList.map((wh: any) => (
                                  <div key={wh.id} className="p-2.5 bg-surface border border-line rounded text-xs flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <div className="font-mono font-semibold text-ink text-[11px] flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
                                        <span>{wh.id}</span>
                                      </div>
                                      <div className="text-[10px] text-ink-muted font-mono">
                                        Expires: {wh.expirationTime ? new Date(wh.expirationTime).toLocaleString() : 'Never'}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleRefreshWebhook(wh.id)}
                                        className="h-7 px-2 text-[10px] font-medium bg-surface-raised border border-line hover:border-signal/50 text-ink rounded transition-colors"
                                        title="Extend webhook expiration by another 7 days"
                                      >
                                        Refresh (+7d)
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWebhook(wh.id)}
                                        className="h-7 px-2 text-[10px] font-medium bg-danger-soft/20 text-danger border border-danger/30 hover:bg-danger-soft/40 rounded transition-colors"
                                        title="Unregister this webhook"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-ink-muted">No webhooks registered on this base yet.</span>
                                <button
                                  onClick={handleCreateWebhook}
                                  disabled={creatingWebhook || !airtableBaseId}
                                  className="h-7 px-3 text-[11px] font-semibold bg-signal text-surface hover:bg-signal/90 rounded transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>{creatingWebhook ? 'Registering...' : 'Register Webhook'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={autoEnrichAirtable}
                              onChange={e => setAutoEnrichAirtable(e.target.checked)}
                              className="rounded border-line text-signal focus:ring-signal"
                            />
                            <div>
                              <span className="font-medium text-ink">Autonomous 360° AI Enrichment</span>
                              <p className="text-[11px] text-ink-muted">
                                Automatically query live web intelligence via TinyFish CLI & Tavily for deep thesis & executive summaries.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: REAL-TIME WEBHOOK */}
                  {importTab === 'webhook' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                        <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-signal" />
                          <span>Instant Push Webhook (Zero Latency)</span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Airtable Automations, Tally, Typeform, or n8n can stream submissions instantly into your live workspace.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-mono text-[11px] text-ink-muted uppercase block">
                          Ingest Webhook URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== 'undefined' ? `${window.location.origin}/api/v1/ingest` : '/api/v1/ingest'}
                            className="flex-1 h-9 px-2.5 bg-surface-raised border border-line rounded text-xs font-mono text-ink select-all focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/api/v1/ingest`;
                              navigator.clipboard.writeText(url);
                              setCopiedWebhookUrl(true);
                              setTimeout(() => setCopiedWebhookUrl(false), 2000);
                            }}
                            className="h-9 px-3 bg-surface border border-line rounded text-xs hover:bg-surface-muted transition-colors flex items-center gap-1.5"
                          >
                            {copiedWebhookUrl ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-signal" />
                                <span className="font-semibold text-signal">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-[11px] text-ink-muted border border-line p-3 rounded-lg bg-surface-raised">
                        <div className="font-semibold text-ink text-xs mb-1">Quick 3-Step Airtable Automation Setup:</div>
                        <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                          <li>In Airtable, open <strong className="text-ink">Automations</strong> &gt; <strong className="text-ink">When record created</strong>.</li>
                          <li>Add action: <strong className="text-ink">Send a webhook</strong> or <strong className="text-ink">Run a script</strong>.</li>
                          <li>Method: <strong className="text-ink">POST</strong> to the URL above with headers <strong className="text-ink font-mono">Content-Type: application/json</strong>.</li>
                        </ol>

                        <div className="mt-2 pt-2 border-t border-line font-mono text-[10px] text-ink-muted">
                          Payload structure: &#123; &quot;name&quot;: &quot;Name&quot;, &quot;email&quot;: &quot;Email&quot;, &quot;company&quot;: &quot;Company&quot;, &quot;role_title&quot;: &quot;Role&quot;, &quot;bio_notes&quot;: &quot;Bio&quot; &#125;
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          setTestingWebhook(true);
                          try {
                            const res = await fetch('/api/v1/ingest', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: 'Sarah Chen (Webhook Test)',
                                email: 'sarah.chen@prismalabs.test',
                                company: 'Prisma Labs',
                                role_title: 'Founding Engineer',
                                bio_notes: 'Building high-throughput computer vision edge inferencing for robotics. Webhook automation test.',
                                source: 'airtable_webhook',
                              }),
                            });
                            const result = await res.json();
                            alert(`Webhook test succeeded! Ingested: ${result.record?.name || 'Success'}`);
                            await fetchData();
                          } catch (err: any) {
                            alert('Test webhook failed: ' + err.message);
                          } finally {
                            setTestingWebhook(false);
                          }
                        }}
                        disabled={testingWebhook}
                        className="w-full h-9 bg-surface border border-line rounded hover:bg-surface-muted font-medium text-xs text-ink transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-copper" />
                        <span>{testingWebhook ? 'Firing Test Webhook...' : 'Fire Test Payload to Endpoint'}</span>
                      </button>
                    </div>
                  )}

                  {/* TAB 3: CSV SPREADSHEET */}
                  {importTab === 'csv' && (
                    <div className="space-y-4">
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
                          rows={5}
                          className="w-full p-3 font-mono text-xs bg-surface-raised border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal text-ink placeholder:text-ink-faint leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Progress View */
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span>Progress: {importProgress.current} of {importProgress.total}</span>
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
                      <span>NetworkOS Ingestion Engine</span>
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
                    Running pipeline & classification...
                  </span>
                ) : importTab === 'airtable' ? (
                  <span>Ready to pull records from Airtable Base</span>
                ) : importTab === 'webhook' ? (
                  <span>Stream is live on /api/v1/ingest</span>
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

                {!importing && importProgress.logs.length === 0 && (
                  <>
                    {importTab === 'airtable' && (
                      <button
                        onClick={handleSyncAirtable}
                        disabled={!airtableBaseId.trim() || !airtableTableName.trim()}
                        className="min-h-[44px] px-5 py-2 text-xs bg-signal text-surface font-semibold hover:bg-signal/90 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Sync from Airtable Now</span>
                      </button>
                    )}

                    {importTab === 'csv' && (
                      <button
                        onClick={handleExecuteBatchImport}
                        disabled={!importText.trim()}
                        className="min-h-[44px] px-5 py-2 text-xs bg-signal text-surface font-semibold hover:bg-signal/90 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Run CSV Ingestion Pipeline</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PURGE LIVE WORKSPACE CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger-soft text-danger flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">Purge Live Workspace?</h3>
                <p className="text-xs text-ink-muted">Reset your live network to a completely clean slate.</p>
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed bg-surface-muted p-3 rounded border border-line">
              This will permanently delete all incoming webhook submissions, manual applicant entries, and live form applicants from your Supabase database. The Benchmark Sandbox cohort will remain untouched.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                disabled={isPurgingLive}
                className="min-h-[40px] px-4 text-xs font-medium text-ink-muted hover:text-ink border border-line rounded hover:bg-surface-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeLive}
                disabled={isPurgingLive}
                className="min-h-[40px] px-4 text-xs font-semibold bg-danger text-white rounded hover:bg-danger/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurgingLive ? 'Purging...' : 'Confirm Purge (Clean Slate)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. WARM INTRO DISPATCHER MODAL */}
      {selectedIntroForDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl w-full max-w-xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-copper-soft text-copper flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-ink">Autonomous Warm Intro Dispatcher</h3>
                  <p className="text-xs text-ink-muted">Personalized double opt-in email draft</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIntroForDispatch(null)}
                className="p-1 rounded hover:bg-surface-muted text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-surface-raised border border-line rounded">
                <div className="font-mono text-[10px] text-ink-muted uppercase">Founder A</div>
                <div className="font-semibold text-ink">{selectedIntroForDispatch.person_a.name}</div>
                <div className="text-[11px] text-ink-muted truncate">{selectedIntroForDispatch.person_a.email || 'No email on record'}</div>
              </div>
              <div className="p-2.5 bg-surface-raised border border-line rounded">
                <div className="font-mono text-[10px] text-ink-muted uppercase">Founder B</div>
                <div className="font-semibold text-ink">{selectedIntroForDispatch.person_b.name}</div>
                <div className="text-[11px] text-ink-muted truncate">{selectedIntroForDispatch.person_b.email || 'No email on record'}</div>
              </div>
            </div>

            {/* Email Draft Preview */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="font-mono text-[11px] text-ink-muted block mb-1">Subject Line</label>
                <input
                  type="text"
                  readOnly
                  value={`Intro: ${selectedIntroForDispatch.person_a.name} (${selectedIntroForDispatch.person_a.company || 'Founder'}) <> ${selectedIntroForDispatch.person_b.name} (${selectedIntroForDispatch.person_b.company || 'Founder'})`}
                  className="w-full h-8 px-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] text-ink-muted block mb-1">Email Body</label>
                <textarea
                  rows={6}
                  readOnly
                  value={`Hi ${selectedIntroForDispatch.person_a.name} & ${selectedIntroForDispatch.person_b.name},\n\nConnecting you both based on strong synergies in ${selectedIntroForDispatch.shared_context}.\n\n${selectedIntroForDispatch.suggested_intro}\n\nI will let you two take it from here!\n\nBest,\nNetworkOS Team`}
                  className="w-full p-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] leading-relaxed focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div className="text-[11px] font-mono text-ink-muted">
                {dispatchedIntroIds.has(selectedIntroForDispatch.id) ? (
                  <span className="text-signal flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Marked as Dispatched
                  </span>
                ) : (
                  'Ready to dispatch'
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = `Subject: Intro: ${selectedIntroForDispatch.person_a.name} <> ${selectedIntroForDispatch.person_b.name}\n\nHi ${selectedIntroForDispatch.person_a.name} & ${selectedIntroForDispatch.person_b.name},\n\n${selectedIntroForDispatch.suggested_intro}\n\nBest,\nNetworkOS Team`;
                    copyToClipboard(text, selectedIntroForDispatch.id);
                  }}
                  className="min-h-[38px] px-3 text-xs bg-surface border border-line rounded text-ink hover:bg-surface-muted transition-colors flex items-center gap-1.5"
                >
                  {copiedIntroId === selectedIntroForDispatch.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-signal" />
                      <span>Copied Draft</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${selectedIntroForDispatch.person_a.email || ''},${selectedIntroForDispatch.person_b.email || ''}?subject=${encodeURIComponent(`Intro: ${selectedIntroForDispatch.person_a.name} <> ${selectedIntroForDispatch.person_b.name}`)}&body=${encodeURIComponent(`Hi ${selectedIntroForDispatch.person_a.name} & ${selectedIntroForDispatch.person_b.name},\n\n${selectedIntroForDispatch.suggested_intro}\n\nBest,\nNetworkOS Team`)}`}
                  onClick={() => {
                    setDispatchedIntroIds(prev => new Set(prev).add(selectedIntroForDispatch.id));
                  }}
                  className="min-h-[38px] px-4 text-xs font-semibold bg-signal text-surface rounded hover:bg-signal/90 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in Mail Client</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
