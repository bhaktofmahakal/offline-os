'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  ChevronDown,
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
  Globe,
  PanelLeft,
  Plus,
  BookOpen,
  MessageSquare,
  Compass,
  Code2,
  History,
  Utensils,
  LayoutGrid,
  Coffee,
  ShieldCheck,
  Shuffle,
  Columns,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  Award,
  Calendar,
  UserX,
  UserCheck,
  UserPlus,
  BarChart2,
  Eye,
  EyeOff,
  Shield,
  LogOut
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
  ai_classification?: any;
  clean_summary?: string | null;
  ai_model?: string | null;
  ai_generated_at?: string | null;
  source_payload?: any;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
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

function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr || 'source';
  }
}

function cleanWebSnippet(raw: string, maxLen = 320): string {
  if (!raw) return '';
  let cleaned = raw
    // Strip markdown images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Replace markdown links [Anchor](url) with Anchor
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove standalone bracket fragments or cut-off link ends e.g. ](/companies/...) or ](https://...)
    .replace(/\]\([^\)]+\)/g, ' ')
    // Remove cut-off link starts e.g. [Anchor]
    .replace(/\[([^\]]+)\]/g, '$1')
    // Remove relative paths in parentheses e.g. (/companies/...)
    .replace(/\(\/[a-zA-Z0-9_\-\/]+\)/g, ' ')
    // Remove markdown table separator rows e.g. | --- | --- | or |:---:|
    .replace(/\|?\s*[-:]+[-| :]{2,}\|?/g, ' ')
    // Replace individual pipes | with spaces so table text is preserved!
    .replace(/\|/g, ' ')
    // Remove markdown headers
    .replace(/#{1,6}\s+/g, '')
    // Strip fenced code block marks
    .replace(/```[a-zA-Z0-9_-]*/g, ' ')
    .replace(/```/g, ' ')
    // Remove markdown bold / italic / code ticks
    .replace(/`{1,3}/g, '')
    .replace(/(\*\*|__|\*|_)/g, '')
    // Strip HTML pseudo tags e.g. <jobs>, <submit>, <div>
    .replace(/<[^>]+>/g, ' ')
    // Strip standalone bracket artifacts
    .replace(/[\[\]]/g, '')
    // Strip ellipsis bracket leftovers
    .replace(/\s*\.{3,}\s*/g, ' ')
    // Normalize spaces and line breaks
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'No preview excerpt available.';
  if (cleaned.length > maxLen) {
    const slice = cleaned.slice(0, maxLen);
    const lastSpace = slice.lastIndexOf(' ');
    cleaned = (lastSpace > maxLen * 0.7 ? slice.slice(0, lastSpace) : slice).trim() + '...';
  }
  return cleaned;
}

function normalizeScrapedContent(raw: string): string {
  if (!raw) return '';
  let content = raw;

  // 1. Repair multi-line markdown links where [text \n\n text](url) spans multiple lines
  content = content.replace(/\[([\s\S]*?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+|#[^\s)]*)\)/g, (fullMatch, linkText, linkUrl) => {
    if (linkText.includes('\n') || /#+\s/.test(linkText)) {
      const cleanInner = linkText.trim();
      return cleanInner;
    }
    if (linkUrl.startsWith('#') || linkText.toLowerCase().includes('skip to content')) {
      return '';
    }
    return `[${linkText.trim()}](${linkUrl})`;
  });

  // 2. Unwrap nested headers inside brackets: [### Heading] -> ### Heading
  content = content.replace(/\[\s*(#{1,6}\s+[^\]\n]+)\s*\]/g, '$1');

  // 3. Clean up dangling link endings: e.g. text](/path)
  content = content.replace(/([^\n\[]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, (match, prefix, url) => {
    if (prefix.includes('[')) return match;
    return prefix.trim();
  });

  // 4. Clean up isolated opening brackets on lines: e.g. "^[Article - 3 min read$"
  content = content.replace(/^\[([^\]\n]*)$/gm, (match, inner) => inner.trim());

  // 5. Clean up isolated brackets on list items: e.g. "• [" or "* ["
  content = content.replace(/^(\s*[-*•]\s*)\[\s*$/gm, '');

  // 6. Clean up adjacent jammed links: e.g. ](/path)[Next](/next) -> ](/path) [Next](/next)
  content = content.replace(/\)\s*\[/g, ') [');

  // 7. Clean up single bracket artifacts on their own line: e.g. "["
  content = content.replace(/^\s*\[\s*$/gm, '');

  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (result.length > 0 && result[result.length - 1] !== '') result.push('');
      continue;
    }

    // Skip empty pipe frames: | | | | (do not skip valid table separators with dashes)
    if (/^\|[\s|:-]*\|$/.test(trimmed) && !trimmed.includes('-')) continue;

    // Skip boilerplate guidelines / terms / privacy / login lines
    if (/^\[?Guidelines\]?\(.*?\)\s*\|\s*\[?FAQ\]?/i.test(trimmed)) continue;
    if (/^\[?Privacy Policy\]?\(.*?\)\s*\|\s*\[?Terms\]?/i.test(trimmed)) continue;
    if (/^\[?Apply to YC\]?\(.*?\)\s*\|\s*\[?Contact\]?/i.test(trimmed)) continue;
    if (/^(Skip to content|Sign in ContactContact sales Download)$/i.test(trimmed)) continue;

    // Remove empty/badge image markdown ![...](...)
    line = line.replace(/!\[.*?\]\(.*?\)/g, '').trimEnd();
    if (!line.trim()) continue;

    // Remove anchor jump links like [Product](#)
    line = line.replace(/\[([^\]]+)\]\(#[^\)]*\)/g, '$1');

    // PRESERVE markdown tables! Never collapse tables into bullet lines with •
    result.push(line);
  }

  return result.join('\n');
}

interface TelemetryItem {
  label: string;
  barRaw?: string;
  valueStr: string;
  minVal: number;
  maxVal: number;
  avgPercent: number;
}

interface TelemetryChartData {
  title: string;
  items: TelemetryItem[];
  rawText: string;
  badge: string;
}

function parseTelemetryChart(text: string): TelemetryChartData | null {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0);
  if (lines.length < 2) return null;

  let title = '';
  const items: TelemetryItem[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Skip code fences and divider rules
    if (trimmed.startsWith('```') || trimmed === '---' || trimmed === '***' || trimmed === '___') continue;

    // Pattern A: Category [████████    ] 85-88% or Category [====] 50%
    const barMatch = line.match(/^\s*([A-Za-z0-9&/ .,'()_#@+\-]+?)\s*\[([█■#=*.\-░▒▓\s]+)\]\s*([0-9.,%+\-–— ]+)?\s*$/);

    // Pattern B: Category: 85-88% or Category - 75%
    const simplePercentMatch = !barMatch && line.match(/^\s*([A-Za-z0-9&/ .,'()_#@+\-]+?)[:–-]\s*([0-9]+(?:\.[0-9]+)?(?:\s*[-–—]\s*[0-9]+(?:\.[0-9]+)?)?%)\s*$/);

    if (barMatch) {
      const label = barMatch[1].replace(/\*+/g, '').trim();
      const barContent = barMatch[2];
      let valStr = (barMatch[3] || '').trim();

      let minVal = 0;
      let maxVal = 100;
      let avgPercent = 50;

      if (valStr) {
        const nums = valStr.match(/\d+(?:\.\d+)?/g);
        if (nums && nums.length >= 2) {
          minVal = parseFloat(nums[0]);
          maxVal = parseFloat(nums[1]);
          avgPercent = Math.min(Math.max((minVal + maxVal) / 2, 0), 100);
        } else if (nums && nums.length === 1) {
          minVal = parseFloat(nums[0]);
          maxVal = minVal;
          avgPercent = Math.min(Math.max(minVal, 0), 100);
        }
      } else {
        const filledChars = (barContent.match(/[█■#=*▓▒]/g) || []).length;
        const totalChars = barContent.length;
        if (totalChars > 0) {
          avgPercent = Math.min(Math.max((filledChars / totalChars) * 100, 0), 100);
          valStr = `${Math.round(avgPercent)}%`;
        }
      }

      items.push({
        label,
        barRaw: `[${barContent}]`,
        valueStr: valStr || `${Math.round(avgPercent)}%`,
        minVal,
        maxVal,
        avgPercent,
      });
    } else if (simplePercentMatch) {
      const label = simplePercentMatch[1].replace(/\*+/g, '').trim();
      const valStr = simplePercentMatch[2].trim();
      const nums = valStr.match(/\d+(?:\.\d+)?/g);
      let minVal = 0;
      let maxVal = 100;
      let avgPercent = 50;
      if (nums && nums.length >= 2) {
        minVal = parseFloat(nums[0]);
        maxVal = parseFloat(nums[1]);
        avgPercent = (minVal + maxVal) / 2;
      } else if (nums && nums.length === 1) {
        minVal = parseFloat(nums[0]);
        maxVal = minVal;
        avgPercent = minVal;
      }
      items.push({
        label,
        valueStr: valStr,
        minVal,
        maxVal,
        avgPercent: Math.min(Math.max(avgPercent, 0), 100),
      });
    } else {
      if (items.length === 0 && !title && trimmed.length > 0 && !trimmed.startsWith('```')) {
        title = trimmed.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();
      }
    }
  }

  if (items.length >= 2) {
    return {
      title: title || 'Benchmark Telemetry & Adoption Rates',
      items,
      rawText: text.trim(),
      badge: 'TEXT',
    };
  }

  return null;
}

function TelemetryGraphicCard({ data }: { data: TelemetryChartData }) {
  const [mode, setMode] = useState<'visual' | 'ascii'>('visual');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 rounded-xl border border-line bg-surface shadow-2xs overflow-hidden transition-all">
      {/* Top Bar with TEXT tab badge and mode switches */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-raised/80 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-surface border border-line text-ink rounded shadow-2xs">
            {data.badge || 'TEXT'}
          </span>
          <span className="text-xs font-semibold text-ink font-mono sm:font-sans truncate">
            {data.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-surface p-0.5 rounded border border-line text-[10px] font-mono">
            <button
              onClick={() => setMode('visual')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                mode === 'visual' ? 'bg-signal text-surface font-semibold shadow-2xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <BarChart2 className="w-2.5 h-2.5" />
              <span>Bars</span>
            </button>
            <button
              onClick={() => setMode('ascii')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                mode === 'ascii' ? 'bg-signal text-surface font-semibold shadow-2xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Terminal className="w-2.5 h-2.5" />
              <span>ASCII</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1 rounded bg-surface border border-line text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title="Copy Graphic Raw Data"
          >
            {copied ? <Check className="w-3 h-3 text-signal" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="p-3.5 sm:p-4">
        {mode === 'visual' ? (
          <div className="space-y-1.5">
            {data.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 sm:gap-3 py-1 px-1.5 rounded-lg hover:bg-surface-raised/70 transition-colors group"
              >
                {/* Category Name */}
                <div className="w-28 sm:w-44 text-xs font-medium text-ink truncate shrink-0" title={item.label}>
                  {item.label}
                </div>

                {/* Shaded Visual Bar with Brackets & Filled Green Track */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs font-mono text-ink-muted/70 select-none">[</span>
                  <div
                    className="flex-1 h-5 rounded border border-line bg-surface-muted/60 relative overflow-hidden flex items-center px-0.5 shadow-2xs"
                  >
                    <div
                      className="h-3.5 bg-signal rounded-xs shadow-2xs group-hover:bg-signal/90 transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(item.avgPercent, 3)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-ink-muted/70 select-none">]</span>
                </div>

                {/* Percentage / Value */}
                <div className="w-16 sm:w-20 text-right text-xs font-mono font-semibold text-ink shrink-0">
                  {item.valueStr}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <pre className="p-3 text-xs font-mono text-ink bg-surface-raised/40 rounded-lg border border-line/60 overflow-x-auto whitespace-pre leading-relaxed">
            {data.rawText}
          </pre>
        )}
      </div>
    </div>
  );
}

function ExecutiveMarkdownViewer({
  content,
  maxHeightClass = 'max-h-[550px]',
  title = 'Autonomous Intelligence Memo',
}: {
  content: string;
  maxHeightClass?: string;
  title?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize scraped markdown for clean reading experience
  const processedContent = useMemo(() => normalizeScrapedContent(content), [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to parse inline markdown: bold, code, links
  const renderInline = (text: string) => {
    if (!text) return '';
    let sanitized = text;
    // Fix odd number of ** so trailing raw asterisks don't leak
    const starMatches = sanitized.match(/\*\*/g);
    if (starMatches && starMatches.length % 2 !== 0) {
      sanitized = sanitized.replace(/\*\*$/, '');
    }

    const parts = [];
    const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let match;
    let lastIdx = 0;
    let key = 0;

    while ((match = regex.exec(sanitized)) !== null) {
      if (match.index > lastIdx) {
        parts.push(sanitized.substring(lastIdx, match.index));
      }
      if (match[2] && match[3]) {
        // Link [Anchor](url)
        parts.push(
          <a
            key={key++}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline inline-flex items-center gap-0.5 font-medium"
          >
            <span>{match[2]}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          </a>
        );
      } else if (match[4]) {
        // Bold **text**
        parts.push(
          <strong key={key++} className="font-semibold text-ink">
            {match[4]}
          </strong>
        );
      } else if (match[5]) {
        // Code `code`
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 rounded bg-surface-raised border border-line font-mono text-[11px] text-signal">
            {match[5]}
          </code>
        );
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < sanitized.length) {
      parts.push(sanitized.substring(lastIdx));
    }
    return parts.length > 0 ? parts : sanitized;
  };

  // Structured Block Parser for Tables, Code Blocks, Headers, Lists & Paragraphs
  const blocks: Array<{
    type: 'hr' | 'h1' | 'h2' | 'h3' | 'boldHeader' | 'kv' | 'bullet' | 'number' | 'quote' | 'table' | 'code' | 'diagram' | 'chart' | 'paragraph';
    headers?: string[];
    rows?: string[][];
    language?: string;
    code?: string;
    text?: string;
    key?: string;
    value?: string;
    num?: string;
    chartData?: TelemetryChartData;
  }> = [];

  const rawLines = (showRaw ? (content || '') : processedContent).split('\n');
  let i = 0;

  const isTableSeparator = (l: string) => /^\|?\s*[-:]+[-| :]{2,}\|?$/.test(l.trim());
  const parseCells = (l: string) => {
    const t = l.trim();
    let cells = t.split('|').map(c => c.trim());
    if (t.startsWith('|') && cells.length > 0) cells.shift();
    if (t.endsWith('|') && cells.length > 0) cells.pop();
    return cells;
  };

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced Code Block: ```lang (also detects Telemetry Charts & Architecture Diagrams)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      const rawCode = codeLines.join('\n');
      const chart = parseTelemetryChart(rawCode);
      if (chart) {
        blocks.push({
          type: 'chart',
          chartData: chart,
        });
      } else {
        const isDiagram = /[┌┐└┘│─▼▲]/.test(rawCode) || /──>/.test(rawCode) || /\+---/.test(rawCode);
        blocks.push({
          type: isDiagram ? 'diagram' : 'code',
          language: isDiagram ? 'DIAGRAM' : (language || 'text'),
          code: rawCode,
        });
      }
      continue;
    }

    // 1.5 Unfenced Telemetry Chart Block (2+ lines with bracketed bars or percentages)
    if (trimmed.includes('[') && (/[█■#=*.\-░▒▓]{2,}/.test(trimmed) || /%\s*$/.test(trimmed))) {
      const chartCandidateLines: string[] = [];
      let chartIdx = i;
      while (chartIdx < rawLines.length && rawLines[chartIdx].trim().length > 0) {
        chartCandidateLines.push(rawLines[chartIdx]);
        chartIdx++;
      }
      if (chartCandidateLines.length >= 2) {
        const detected = parseTelemetryChart(chartCandidateLines.join('\n'));
        if (detected && detected.items.length >= 2) {
          blocks.push({
            type: 'chart',
            chartData: detected,
          });
          i = chartIdx;
          continue;
        }
      }
    }

    // 2. Strict Markdown Table Detection (MUST have valid header and separator row)
    if (trimmed.includes('|') && i + 1 < rawLines.length && isTableSeparator(rawLines[i + 1])) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().includes('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const sepIdx = tableLines.findIndex(isTableSeparator);
        if (sepIdx > 0) {
          const headers = parseCells(tableLines[0]);
          const rows: string[][] = [];
          for (let r = 1; r < tableLines.length; r++) {
            if (r === sepIdx) continue;
            const cells = parseCells(tableLines[r]);
            if (cells.some(c => c.length > 0)) {
              rows.push(cells);
            }
          }
          if (headers.some(h => h.length > 0) || rows.length > 0) {
            blocks.push({
              type: 'table',
              headers,
              rows,
            });
            continue;
          }
        }
      }
    }

    // 3. Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Headers
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^#{3,4}\s+/, '') });
      i++;
      continue;
    }

    // 5. Bold section title: **Heading Title** or **Heading Title:**
    const boldHeaderMatch = trimmed.match(/^\*\*(.+?)\*\*:?$/);
    if (boldHeaderMatch) {
      blocks.push({ type: 'boldHeader', text: boldHeaderMatch[1] });
      i++;
      continue;
    }

    // 6. Key-Value Attribute line: **Key:** Value
    const kvMatch = trimmed.match(/^\*\*([^*:]+?):\*\*\s*(.+)$/);
    if (kvMatch) {
      blocks.push({ type: 'kv', key: kvMatch[1], value: kvMatch[2] });
      i++;
      continue;
    }

    // 7. Bullet item (- or * or •)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*•]\s+/, '') });
      i++;
      continue;
    }

    // 8. Numbered item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({ type: 'number', num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // 9. Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s+/, '') });
      i++;
      continue;
    }

    // 10. Regular paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  const safeContent = content || '';

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-xs">
      {/* Executive Sub-Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface-raised border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-signal animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-ink font-mono uppercase tracking-wider truncate">{title}</span>
          <span className="text-[10px] font-mono text-ink-muted bg-surface px-2 py-0.5 rounded border border-line shrink-0">
            {safeContent.length.toLocaleString()} chars
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-2 py-1 text-[11px] font-mono rounded bg-surface border border-line text-ink-muted hover:text-ink hover:border-signal/50 transition-colors cursor-pointer"
          >
            {showRaw ? 'Executive View' : 'Raw Markdown'}
          </button>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-signal text-surface font-semibold hover:bg-signal/90 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className={`p-4 sm:p-5 overflow-y-auto ${maxHeightClass} space-y-3`}>
        {showRaw ? (
          <pre className="text-xs font-mono text-ink-muted whitespace-pre-wrap leading-relaxed">
            {safeContent}
          </pre>
        ) : (
          <div className="space-y-3 text-xs text-ink leading-relaxed font-sans">
            {blocks.map((block, idx) => {
              if (block.type === 'hr') {
                return <hr key={idx} className="border-line/70 my-2.5" />;
              }
              if (block.type === 'h1') {
                return (
                  <h2 key={idx} className="text-sm font-bold text-ink pt-2 pb-1 border-b border-line flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-signal rounded-full flex-shrink-0" />
                    <span>{block.text}</span>
                  </h2>
                );
              }
              if (block.type === 'h2') {
                return (
                  <h3 key={idx} className="text-xs font-bold text-ink pt-2 pb-1 border-l-2 border-signal pl-2 text-ink">
                    {block.text}
                  </h3>
                );
              }
              if (block.type === 'h3') {
                return (
                  <h4 key={idx} className="text-xs font-semibold uppercase tracking-wider text-signal pt-1">
                    {block.text}
                  </h4>
                );
              }
              if (block.type === 'boldHeader') {
                return (
                  <h3 key={idx} className="text-xs font-bold text-ink pt-2.5 pb-1 border-l-2 border-signal pl-2.5 flex items-center gap-2">
                    <span>{block.text}</span>
                  </h3>
                );
              }
              if (block.type === 'kv') {
                return (
                  <div key={idx} className="flex flex-wrap items-baseline gap-2 py-0.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-raised border border-line text-ink flex-shrink-0">
                      {block.key}
                    </span>
                    <span className="text-xs text-ink leading-relaxed flex-1">
                      {renderInline(block.value || '')}
                    </span>
                  </div>
                );
              }
              if (block.type === 'bullet') {
                return (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal mt-1.5 flex-shrink-0" />
                    <div className="text-ink text-xs leading-relaxed flex-1">
                      {renderInline(block.text || '')}
                    </div>
                  </div>
                );
              }
              if (block.type === 'number') {
                return (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-surface-raised border border-line rounded text-ink flex-shrink-0">
                      {block.num}
                    </span>
                    <div className="text-ink text-xs leading-relaxed flex-1">
                      {renderInline(block.text || '')}
                    </div>
                  </div>
                );
              }
              if (block.type === 'quote') {
                return (
                  <blockquote key={idx} className="border-l-2 border-signal/60 bg-signal-soft/20 p-2.5 rounded-r-lg text-ink-muted italic text-xs">
                    {renderInline(block.text || '')}
                  </blockquote>
                );
              }
              if (block.type === 'chart' && block.chartData) {
                return (
                  <TelemetryGraphicCard key={idx} data={block.chartData} />
                );
              }
              if (block.type === 'diagram') {
                return (
                  <div key={idx} className="my-3 rounded-xl border border-line bg-[#141614] text-[#E0E2DC] overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1B1F1B] border-b border-[#2B342D] text-[10px] font-mono text-[#A2AAA2]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal" />
                        <span className="uppercase font-bold tracking-wider text-[#A7C7A0]">Architecture Flow</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(block.code || '');
                        }}
                        className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer text-[#A2AAA2]"
                        title="Copy Diagram"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono leading-relaxed text-[#E0E2DC] overflow-x-auto whitespace-pre select-text">
                      {block.code}
                    </pre>
                  </div>
                );
              }
              if (block.type === 'code') {
                return (
                  <div key={idx} className="my-2 rounded-lg border border-line bg-surface-raised overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1 bg-surface border-b border-line text-[10px] font-mono text-ink-muted">
                      <span className="uppercase font-semibold text-signal">{block.language || 'CODE'}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(block.code || '');
                        }}
                        className="hover:text-ink transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy Code"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy Code</span>
                      </button>
                    </div>
                    <pre className="p-3 text-xs font-mono text-ink-muted overflow-x-auto whitespace-pre leading-relaxed">
                      {block.code}
                    </pre>
                  </div>
                );
              }
              if (block.type === 'table') {
                const headers = block.headers || [];
                const rows = block.rows || [];
                return (
                  <div key={idx} className="overflow-x-auto my-2.5 rounded-lg border border-line bg-surface shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      {headers.length > 0 && (
                        <thead className="bg-surface-raised border-b border-line text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                          <tr>
                            {headers.map((h, hIdx) => (
                              <th key={hIdx} className="py-2 px-3 font-semibold border-r border-line last:border-r-0 whitespace-nowrap">
                                {renderInline(h)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody className="divide-y divide-line/70">
                        {rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-surface-muted/40 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 text-ink leading-relaxed border-r border-line/60 last:border-r-0">
                                {renderInline(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return (
                <p key={idx} className="text-xs text-ink leading-relaxed">
                  {renderInline(block.text || '')}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfflineCRM() {
  const [people, setPeople] = useState<Person[]>([]);
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'duplicates' | 'intros' | 'seating' | 'intelligence'>('people');
  const [searchQuery, setSearchQuery] = useState('');

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [introStatusFilter, setIntroStatusFilter] = useState('ALL');
  const [duplicateFilter, setDuplicateFilter] = useState<'PENDING' | 'MERGED' | 'ALL'>('PENDING');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);
  const [copiedIntroId, setCopiedIntroId] = useState<number | null>(null);

  // HubSpot-Style CRM Table Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false);
  const directoryTableContainerRef = useRef<HTMLDivElement>(null);
  const directoryMobileContainerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    directoryTableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    directoryMobileContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // HubSpot-Inspired CRM Directory Views & Toolbar Menus
  const [directoryViewTab, setDirectoryViewTab] = useState<'all' | 'high_fit' | 'duplicates' | 'enriched' | 'incomplete'>('all');
  const [isAddMemberMenuOpen, setIsAddMemberMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: press '/' anywhere to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        e.target instanceof Element &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mergedIds, setMergedIds] = useState<Set<number>>(new Set());

  // Merge Confirmation Modal State
  const [candidateToMerge, setCandidateToMerge] = useState<{ duplicate: Person; canonical: Person } | null>(null);
  const [mergingInProgress, setMergingInProgress] = useState(false);

  // Mobile drawer & responsive states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Collapsible Sidebar Rail state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('networkos_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch (_) {}
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('networkos_sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  // CRUD: Edit Member in Drawer state
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Person> & { linkedin?: string; twitter?: string; website?: string }>({});
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
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isApplyingContact, setIsApplyingContact] = useState(false);
  const [contactApplySuccess, setContactApplySuccess] = useState<string | null>(null);
  const [selectedCandidateEmail, setSelectedCandidateEmail] = useState<string | null>(null);

  // Warm Intro Dispatcher Modal State
  const [selectedIntroForDispatch, setSelectedIntroForDispatch] = useState<Introduction | null>(null);
  const [dispatchedIntroIds, setDispatchedIntroIds] = useState<Set<number>>(new Set());
  const [dispatchToEmail, setDispatchToEmail] = useState('');
  const [dispatchCcEmail, setDispatchCcEmail] = useState('');
  const [dispatchBccEmail, setDispatchBccEmail] = useState('');
  const [dispatchSubject, setDispatchSubject] = useState('');
  const [dispatchBody, setDispatchBody] = useState('');

  const handleOpenDispatchModal = (intro: Introduction) => {
    setSelectedIntroForDispatch(intro);
    const emails = [intro.person_a?.email, intro.person_b?.email].filter(Boolean).join(', ');
    setDispatchToEmail(emails);
    setDispatchCcEmail('');
    setDispatchBccEmail('');
    setDispatchSubject(`Intro: ${intro.person_a?.name || 'Founder A'} (${intro.person_a?.company || 'Founder'}) <> ${intro.person_b?.name || 'Founder B'} (${intro.person_b?.company || 'Founder'})`);
    setDispatchBody(`Hi ${intro.person_a?.name || 'there'} & ${intro.person_b?.name || 'there'},\n\nConnecting you both based on strong synergies in ${intro.shared_context || 'the startup ecosystem'}.\n\n${intro.suggested_intro || ''}\n\nI will let you two take it from here!\n\nBest,\nNetworkOS Team`);
  };

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
  const [intelligenceSubTab, setIntelligenceSubTab] = useState<'research' | 'crawl' | 'extract' | 'search' | 'history'>('research');
  const [intelligenceRecords, setIntelligenceRecords] = useState<any[]>([]);
  const [loadingIntelHistory, setLoadingIntelHistory] = useState(false);
  const [intelHistoryFilter, setIntelHistoryFilter] = useState<'all' | 'search' | 'deep_research' | 'crawl' | 'extract'>('all');
  const [expandedIntelRecordId, setExpandedIntelRecordId] = useState<number | null>(null);
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
  const [rawViewResults, setRawViewResults] = useState<Record<string, boolean>>({});
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);

  // Algorithmic Seating Optimizer State (Blueprint 1)
  const [seatingTableSize, setSeatingTableSize] = useState<number>(8);
  const [seatingCustomSize, setSeatingCustomSize] = useState<string>('8');
  const [seatingCohortFilter, setSeatingCohortFilter] = useState<'all' | 'high_fit' | 'founders' | 'operators'>('all');
  const [selectedSeatingMemberIds, setSelectedSeatingMemberIds] = useState<Set<number>>(new Set());
  const [strictCompetitorAvoidance, setStrictCompetitorAvoidance] = useState<boolean>(true);
  const [generateAiTableCards, setGenerateAiTableCards] = useState<boolean>(true);
  const [isOptimizingSeating, setIsOptimizingSeating] = useState<boolean>(false);
  const [optimizedSeatingResult, setOptimizedSeatingResult] = useState<any | null>(null);
  const [activeBriefingTableNumber, setActiveBriefingTableNumber] = useState<number | null>(null);
  const [copiedTableCardNum, setCopiedTableCardNum] = useState<number | null>(null);

  // Seating Floor Plan & Compact Navigation States
  const [seatingViewMode, setSeatingViewMode] = useState<'grid' | 'focus' | 'list'>('grid');
  const [seatingCurrentPage, setSeatingCurrentPage] = useState<number>(1);
  const [seatingTablesPerPage, setSeatingTablesPerPage] = useState<number>(6);
  const [seatingActiveTableFilter, setSeatingActiveTableFilter] = useState<number | 'all'>('all');
  const [seatingSearchQuery, setSeatingSearchQuery] = useState<string>('');
  const [seatingCollapseAiCards, setSeatingCollapseAiCards] = useState<boolean>(false);
  const [expandedBriefingTables, setExpandedBriefingTables] = useState<Set<number>>(new Set());

  // VIP Dinner Operating System State (Blueprint 1 Deepening)
  const [tableCaptains, setTableCaptains] = useState<Record<number, number>>({}); // tableNumber -> personId
  const [droppedSeatIds, setDroppedSeatIds] = useState<Set<number>>(new Set()); // seat ids marked as flake / dropped
  const [hotSwapTarget, setHotSwapTarget] = useState<{ tableNumber: number; seatId: number; seatNumber: number } | null>(null);
  const [hotSwapSearchQuery, setHotSwapSearchQuery] = useState<string>('');
  const [isHostDossierModalOpen, setIsHostDossierModalOpen] = useState<boolean>(false);
  const [activeDossierTable, setActiveDossierTable] = useState<any | null>(null);
  const [copiedDossierNum, setCopiedDossierNum] = useState<number | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchMethod, setDispatchMethod] = useState<'simulate' | 'resend' | 'n8n_webhook'>('simulate');
  const [dispatchActiveTab, setDispatchActiveTab] = useState<'preview_attendees' | 'preview_captains' | 'audit_log'>('preview_attendees');
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [copiedInviteRecipientId, setCopiedInviteRecipientId] = useState<number | null>(null);
  const [eventDetails, setEventDetails] = useState({
    eventTitle: 'Offline VIP Founder Dinner',
    eventDate: 'Thursday, October 22, 2026',
    eventTime: '7:30 PM PDT',
    venueAddress: 'The Battery, 717 Battery St, San Francisco, CA 94111',
    venueCode: 'OFFLINE-717',
    dressCode: 'Smart Casual / No Suits',
    notes: 'Strict Chatham House Rule. Off the record.',
    testRecipientEmail: 'moviesf14@gmail.com',
  });

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
      logs: [`[INIT] Initializing ingestion pipeline for ${parsed.length} Airtable records...`],
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
          const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://offline-os.onrender.com').trim();
          res = await fetch(`${backendUrl}/process-new-record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
            signal: AbortSignal.timeout(6000),
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
          resultSummary = `[FLAGGED] Duplicate record (${Math.round((data.confidence || 0.95) * 100)}% match)`;
        } else {
          const rec = data.record || data;
          resultSummary = `[SAVED] Fit: ${rec.fit_score || 80}/100 | ${rec.role_type || 'member'} | ${(rec.sector_tags || []).join(', ') || 'general'}`;
        }

        setImportProgress(prev => ({
          ...prev,
          logs: [...prev.logs, `[${idx + 1}/${parsed.length}] ${row.name}: ${resultSummary}`],
        }));
      } catch (err: any) {
        setImportProgress(prev => ({
          ...prev,
          current: idx + 1,
          logs: [...prev.logs, `[${idx + 1}/${parsed.length}] [ERROR] Failed to process ${row.name}: ${err.message}`],
        }));
      }
    }

    setImportProgress(prev => ({
      ...prev,
      logs: [...prev.logs, '[COMPLETE] Batch processing complete! Refreshing live console...'],
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
      alert(`Webhook registered successfully!\nID: ${data.webhook?.id}\nExpires in 7 days.`);
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
        `[CONNECT] Connecting to Airtable Base [${airtableBaseId}] Table [${airtableTableName}]...`,
        '[AUTH] Authenticating using official Airtable Personal Access Token (PAT)...',
        '[FETCH] Fetching paginated records with cursor pagination...'
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
        `[COMPLETE] Airtable Sync Completed`,
        `[TOTAL] Total rows retrieved: ${data.total_fetched || 0}`,
        `[INGESTED] Ingested into Supabase: ${data.new_ingested || 0} new member profiles`,
        `[DEDUP] Duplicates identified & deduplicated: ${data.duplicates_detected || 0}`,
      ];

      if (data.auto_enriched && data.auto_enriched > 0) {
        syncLogs.push(`[ENRICH] Autonomous profile enrichment triggered for ${data.auto_enriched} records`);
      }

      syncLogs.push('[SUCCESS] Sync complete! Live dashboard refreshed.');

      setImportProgress({
        current: 100,
        total: 100,
        logs: syncLogs,
      });

      await fetchData();
    } catch (err: any) {
      setImportProgress(prev => ({
        ...prev,
        logs: [...prev.logs, `[ERROR] Error during Airtable sync: ${err.message}`],
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Enrichment API failed with status ${res.status}`);
      }

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
      alert('Enrichment notice: ' + err.message);
    } finally {
      setIsEnrichingPerson(false);
    }
  };

  // Full-Stack Discovered Contact & Socials Persistence Handler
  const handleApplyDiscoveredContact = async (personId: number, contact: any, selectedEmailOverride?: string) => {
    if (!contact) return;
    setIsApplyingContact(true);
    setContactApplySuccess(null);
    try {
      const updatePayload: Record<string, any> = { id: personId };
      const emailToApply = selectedEmailOverride || contact.discovered_email;
      if (emailToApply) {
        updatePayload.email = emailToApply;
      }
      const existingPerson = people.find(p => p.id === personId) || selectedPerson;
      const existingPayload = existingPerson?.source_payload || {};
      updatePayload.source_payload = {
        ...existingPayload,
        linkedin: contact.discovered_linkedin || existingPayload.linkedin || null,
        website: contact.discovered_website || existingPayload.website || null,
        twitter: contact.discovered_twitter || existingPayload.twitter || null,
        verified_contact: contact,
        candidate_emails: contact.candidate_emails || existingPayload.candidate_emails || [],
      };

      const res = await fetch('/api/people', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update member contact');
      }

      const resData = await res.json();
      const updatedMember = resData.updated?.[0];

      if (updatedMember) {
        setPeople(prev => prev.map(p => (p.id === personId ? { ...p, ...updatedMember } : p)));
        if (selectedPerson?.id === personId) {
          setSelectedPerson(prev => (prev ? { ...prev, ...updatedMember } : null));
        }
      }

      setContactApplySuccess('Profile, verified email & socials updated full-stack in Supabase!');
      setTimeout(() => setContactApplySuccess(null), 4000);
    } catch (err: any) {
      alert('Error updating contact: ' + err.message);
    } finally {
      setIsApplyingContact(false);
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

      // If already completed synchronously (e.g., via synthesis fallback or cache)
      if (data.status === 'completed') {
        setResearchStatus('completed');
        setResearchReport(data.content || data.report || 'Research report compiled.');
        setResearchSources(data.sources || []);
        setIsResearching(false);
        fetchIntelligenceHistory();
        return;
      }

      setResearchStatus('in_progress');

      // Poll every 3 seconds with max attempts guard
      let pollAttempts = 0;
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        if (pollAttempts > 30) {
          clearInterval(pollInterval);
          setIsResearching(false);
          setResearchStatus('failed');
          return;
        }

        try {
          const pollRes = await fetch(`/api/tavily/research?requestId=${encodeURIComponent(data.requestId)}`);
          if (!pollRes.ok) {
            if (pollAttempts > 4) {
              clearInterval(pollInterval);
              setIsResearching(false);
              setResearchStatus('failed');
            }
            return;
          }

          const pollData = await pollRes.json();
          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setResearchStatus('completed');
            setResearchReport(pollData.content || pollData.report || 'Research report compiled.');
            setResearchSources(pollData.sources || []);
            setIsResearching(false);
            fetchIntelligenceHistory();
          } else if (pollData.status === 'failed') {
            clearInterval(pollInterval);
            setResearchStatus('failed');
            setIsResearching(false);
            if (pollData.error) {
              console.warn('Research task note:', pollData.error);
            }
          }
        } catch (pollErr) {
          console.error('Research polling error:', pollErr);
          if (pollAttempts > 4) {
            clearInterval(pollInterval);
            setIsResearching(false);
            setResearchStatus('failed');
          }
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
      fetchIntelligenceHistory();
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
      fetchIntelligenceHistory();
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
      if (!res.ok) throw new Error(data.error || 'Failed to run search');
      setTavilySearchResults(data.results || []);
      fetchIntelligenceHistory();
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
        body: JSON.stringify({ input: query, model: 'mini', personId: person.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.requestId) throw new Error(data.error || 'Failed to trigger drawer memo');

      // If already completed synchronously (e.g., via synthesis fallback or cache)
      if (data.status === 'completed') {
        const memoContent = data.content || data.report || 'Research completed.';
        const memoSources = data.sources || [];
        setDrawerResearchReport(prev => ({
          ...prev,
          [person.id]: {
            content: memoContent,
            sources: memoSources,
          },
        }));
        setPeople(prev => prev.map(p => {
          if (p.id === person.id) {
            const updatedAi = {
              ...(typeof p.ai_classification === 'object' && p.ai_classification !== null ? p.ai_classification : {}),
              deep_memo: {
                content: memoContent,
                sources: memoSources,
                completed_at: new Date().toISOString(),
              },
            };
            return { ...p, ai_classification: updatedAi, clean_summary: memoContent.slice(0, 300) + '...' };
          }
          return p;
        }));
        setDrawerResearching(false);
        fetchIntelligenceHistory();
        return;
      }

      // Poll until complete with max attempts guard
      let drawerAttempts = 0;
      const interval = setInterval(async () => {
        drawerAttempts++;
        if (drawerAttempts > 30) {
          clearInterval(interval);
          setDrawerResearching(false);
          return;
        }

        try {
          const pollRes = await fetch(`/api/tavily/research?requestId=${encodeURIComponent(data.requestId)}&personId=${person.id}`);
          if (!pollRes.ok) {
            if (drawerAttempts > 4) {
              clearInterval(interval);
              setDrawerResearching(false);
            }
            return;
          }

          const pollData = await pollRes.json();
          if (pollData.status === 'completed') {
            clearInterval(interval);
            const memoContent = pollData.content || pollData.report || 'Research completed.';
            const memoSources = pollData.sources || [];
            setDrawerResearchReport(prev => ({
              ...prev,
              [person.id]: {
                content: memoContent,
                sources: memoSources,
              },
            }));
            // Update local member state
            setPeople(prev => prev.map(p => {
              if (p.id === person.id) {
                const updatedAi = {
                  ...(typeof p.ai_classification === 'object' && p.ai_classification !== null ? p.ai_classification : {}),
                  deep_memo: {
                    content: memoContent,
                    sources: memoSources,
                    completed_at: new Date().toISOString(),
                  },
                };
                return { ...p, ai_classification: updatedAi, clean_summary: memoContent.slice(0, 300) + '...' };
              }
              return p;
            }));
            setDrawerResearching(false);
            fetchIntelligenceHistory();
          } else if (pollData.status === 'failed') {
            clearInterval(interval);
            setDrawerResearching(false);
          }
        } catch {
          if (drawerAttempts > 4) {
            clearInterval(interval);
            setDrawerResearching(false);
          }
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

  // Fetch persistent intelligence history from Supabase
  const fetchIntelligenceHistory = async () => {
    setLoadingIntelHistory(true);
    try {
      const res = await fetch('/api/intelligence');
      const data = await res.json();
      if (data.records) setIntelligenceRecords(data.records);
    } catch (err) {
      console.error('Error loading intelligence history:', err);
    } finally {
      setLoadingIntelHistory(false);
    }
  };

  const handleRestoreIntelligenceRecord = (rec: any) => {
    if (rec.record_type === 'search') {
      if (rec.payload?.results) setTavilySearchResults(rec.payload.results);
      if (rec.query_or_url) setTavilySearchInput(rec.query_or_url);
      setIntelligenceSubTab('search');
    } else if (rec.record_type === 'deep_research') {
      if (rec.content) setResearchReport(rec.content);
      if (rec.payload?.sources) setResearchSources(rec.payload.sources);
      const restoredPrompt = rec.parameters?.input || (rec.title ? rec.title.replace(/^Deep Research:\s*/i, '') : '') || rec.query_or_url;
      if (restoredPrompt) setResearchPrompt(restoredPrompt);
      setResearchStatus('completed');
      setIntelligenceSubTab('research');
    } else if (rec.record_type === 'crawl') {
      if (rec.payload?.results) setCrawlResults(rec.payload.results);
      if (rec.query_or_url) setCrawlInputUrl(rec.query_or_url);
      setIntelligenceSubTab('crawl');
    } else if (rec.record_type === 'extract') {
      if (rec.payload?.results) setExtractResults(rec.payload.results);
      if (rec.query_or_url) setExtractUrlsInput(rec.query_or_url);
      setIntelligenceSubTab('extract');
    }
  };

  const handleDeleteIntelligenceRecord = async (recordId: number) => {
    try {
      setIntelligenceRecords(prev => prev.filter(r => r.id !== recordId));
      await fetch(`/api/intelligence?id=${recordId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting intelligence record:', err);
    }
  };

  const filteredIntelRecords = useMemo(() => {
    if (intelHistoryFilter === 'all') return intelligenceRecords;
    return intelligenceRecords.filter(r => r.record_type === intelHistoryFilter);
  }, [intelligenceRecords, intelHistoryFilter]);

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

      if (peopleData.people) {
        setPeople(peopleData.people);

        // Permanently hydrate 360 dossiers and deep intel memos from Supabase!
        const initialDossiers: Record<number, any> = {};
        const initialMemos: Record<number, { content: string; sources: any[] }> = {};

        peopleData.people.forEach((p: any) => {
          if (p.ai_classification && typeof p.ai_classification === 'object') {
            if (p.ai_classification.dossier) {
              initialDossiers[p.id] = p.ai_classification.dossier;
            }
            if (p.ai_classification.deep_memo) {
              initialMemos[p.id] = p.ai_classification.deep_memo;
            }
          }
        });

        setDossierCache(prev => ({ ...initialDossiers, ...prev }));
        setDrawerResearchReport(prev => ({ ...initialMemos, ...prev }));
      }
      if (introsData.introductions) setIntroductions(introsData.introductions);

      // Hydrate persistent intelligence audit history from database
      await fetchIntelligenceHistory();
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

  // Live Merge duplicate in Supabase (with full-stack data consolidation)
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

      // Optimistic update of state
      setPeople(prev =>
        prev.map(p => {
          if (p.id === duplicate.id) {
            return { ...p, is_duplicate_of: canonical.id, duplicate_confidence: 1.0, review_status: 'merged' };
          }
          if (p.id === canonical.id) {
            const mergedTags = Array.from(new Set([...(canonical.sector_tags || []), ...(duplicate.sector_tags || [])]));
            return {
              ...p,
              sector_tags: mergedTags,
              fit_score: Math.max(canonical.fit_score ?? 0, duplicate.fit_score ?? 0),
              bio_notes: canonical.bio_notes || duplicate.bio_notes || p.bio_notes,
            };
          }
          return p;
        })
      );

      // Execute full-stack atomic merge on server
      const res = await fetch('/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalId: canonical.id, duplicateId: duplicate.id })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.canonical && data.duplicate) {
        // Sync full-stack updated canonical & duplicate into frontend state
        setPeople(prev =>
          prev.map(p => {
            if (p.id === data.duplicate.id) return data.duplicate;
            if (p.id === data.canonical.id) return data.canonical;
            return p;
          })
        );
        if (selectedPerson?.id === canonical.id) {
          setSelectedPerson(data.canonical);
        } else if (selectedPerson?.id === duplicate.id) {
          setSelectedPerson(data.duplicate);
        }
      }

      setCandidateToMerge(null);
    } catch (err: any) {
      console.error('Error merging duplicate record:', err);
      alert(`Failed to merge records: ${err.message || String(err)}`);
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
    const existingPayload = selectedPerson.source_payload || {};
    setEditFormData({
      ...selectedPerson,
      linkedin: existingPayload.linkedin || '',
      twitter: existingPayload.twitter || '',
      website: existingPayload.website || '',
    });
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

      const existingPayload = selectedPerson.source_payload || {};
      const updatedSourcePayload = {
        ...existingPayload,
        linkedin: (editFormData as any).linkedin?.trim() || null,
        twitter: (editFormData as any).twitter?.trim() || null,
        website: (editFormData as any).website?.trim() || null,
      };

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
        source_payload: updatedSourcePayload,
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
      if (statusFilter === 'ALL') {
        // Active members view: automatically archive/hide consolidated duplicates
        matchStatus = p.review_status !== 'merged' && !mergedIds.has(p.id);
      } else if (statusFilter === 'CANONICAL') {
        matchStatus = p.is_duplicate_of === null;
      } else if (statusFilter === 'DUPLICATES') {
        matchStatus = p.is_duplicate_of !== null && p.review_status !== 'merged' && !mergedIds.has(p.id);
      } else if (statusFilter === 'MERGED') {
        matchStatus = p.is_duplicate_of !== null && (p.review_status === 'merged' || mergedIds.has(p.id));
      } else if (statusFilter === 'ALL_DUPLICATES') {
        matchStatus = p.is_duplicate_of !== null;
      } else if (statusFilter === 'ALL_WITH_MERGED') {
        matchStatus = true;
      } else if (statusFilter === 'INCOMPLETE') {
        matchStatus = p.is_incomplete;
      } else if (statusFilter === 'HIGH_FIT') {
        matchStatus = p.fit_score !== null && p.fit_score >= 80;
      }

      // HubSpot Quick View Tab Filter
      let matchViewTab = true;
      if (directoryViewTab === 'high_fit') matchViewTab = p.fit_score !== null && p.fit_score >= 80;
      if (directoryViewTab === 'duplicates') matchViewTab = p.is_duplicate_of !== null && p.review_status !== 'merged' && !mergedIds.has(p.id);
      if (directoryViewTab === 'enriched') matchViewTab = p.ai_enrichment_status === 'completed';
      if (directoryViewTab === 'incomplete') matchViewTab = p.is_incomplete;

      return matchSearch && matchRole && matchSector && matchStatus && matchViewTab;
    });
  }, [activePeople, searchQuery, roleFilter, sectorFilter, statusFilter, directoryViewTab, mergedIds]);

  // Dynamic record counts for HubSpot View Tabs
  const tabCounts = useMemo(() => {
    const all = activePeople.length;
    const highFit = activePeople.filter(p => p.fit_score !== null && p.fit_score >= 80).length;
    const dups = activePeople.filter(p => p.is_duplicate_of !== null && p.review_status !== 'merged' && !mergedIds.has(p.id)).length;
    const enriched = activePeople.filter(p => p.ai_enrichment_status === 'completed').length;
    const incomplete = activePeople.filter(p => p.is_incomplete).length;
    return { all, highFit, dups, enriched, incomplete };
  }, [activePeople, mergedIds]);

  // Auto-reset pagination to page 1 whenever any search or filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, sectorFilter, statusFilter, directoryViewTab, pageSize]);

  // HubSpot CRM Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredPeople.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPeople.length);
  const paginatedPeople = useMemo(() => {
    return filteredPeople.slice(startIndex, endIndex);
  }, [filteredPeople, startIndex, endIndex]);

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

  // Seating Optimizer Attendee Selection & Execution Helpers
  const handleSelectAllCanonicalForSeating = () => {
    const canonicalMembers = activePeople.filter(p => p.is_duplicate_of === null);
    setSelectedSeatingMemberIds(new Set(canonicalMembers.map(p => p.id)));
  };

  const handleSelectHighFitForSeating = () => {
    const highFit = activePeople
      .filter(p => p.is_duplicate_of === null && (p.fit_score ?? 0) >= 75)
      .slice(0, 48);
    setSelectedSeatingMemberIds(new Set(highFit.map(p => p.id)));
  };

  const handleToggleSeatingMember = (id: number) => {
    setSelectedSeatingMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSeatingSelection = () => {
    setSelectedSeatingMemberIds(new Set());
  };

  const handleRunSeatingOptimization = async () => {
    let memberIds = Array.from(selectedSeatingMemberIds);
    if (memberIds.length === 0) {
      const canonicalMembers = activePeople.filter(p => p.is_duplicate_of === null);
      if (canonicalMembers.length === 0) {
        alert('No canonical members found in database to seat.');
        return;
      }
      memberIds = canonicalMembers.map(p => p.id);
      setSelectedSeatingMemberIds(new Set(memberIds));
    }

    const effectiveTableSize = seatingTableSize === 0 ? parseInt(seatingCustomSize, 10) || 8 : seatingTableSize;
    if (effectiveTableSize < 2 || effectiveTableSize > 24) {
      alert('Table capacity must be between 2 and 24.');
      return;
    }

    setIsOptimizingSeating(true);
    try {
      const res = await fetch('/api/seating/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds,
          tableSize: effectiveTableSize,
          strictCompetitorAvoidance,
          generateAiCards: generateAiTableCards,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setOptimizedSeatingResult(data);
      if (data.tables && data.tables.length > 0) {
        setActiveBriefingTableNumber(data.tables[0].tableNumber);
        // Auto-nominate Table Captain for each table
        const defaultCaptains: Record<number, number> = {};
        data.tables.forEach((t: any) => {
          const leader = t.seats.find((s: any) =>
            s.seniority === 'c-level' ||
            (s.roleTitle && (s.roleTitle.toLowerCase().includes('founder') || s.roleTitle.toLowerCase().includes('ceo')))
          ) || t.seats[0];
          if (leader) {
            defaultCaptains[t.tableNumber] = leader.id;
          }
        });
        setTableCaptains(defaultCaptains);
        setDroppedSeatIds(new Set());
      }
    } catch (err: any) {
      console.error('Seating optimization failed:', err);
      alert('Seating optimization failed: ' + err.message);
    } finally {
      setIsOptimizingSeating(false);
    }
  };

  const handleExportSeatingCSV = () => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return;
    const rows = [
      ['Table Number', 'Table Name', 'Seat', 'Member Name', 'Company', 'Title', 'Sector', 'Fit Score', 'Bio Notes', 'Conversation Icebreaker']
    ];

    optimizedSeatingResult.tables.forEach((table: any) => {
      table.seats.forEach((seat: any) => {
        rows.push([
          String(table.tableNumber),
          table.tableName || `Table ${table.tableNumber}`,
          String(seat.seatNumber),
          seat.name,
          seat.company || '',
          seat.roleTitle || '',
          (seat.sectorTags || []).join('; '),
          String(seat.fitScore || ''),
          seat.bioNotes || '',
          table.conversationCard?.icebreakerPrompt || ''
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(escapeCSV).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vip_seating_chart_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllTableBriefings = () => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return;
    let md = `# VIP Seating Briefings (${optimizedSeatingResult.totalAttendees} Attendees across ${optimizedSeatingResult.totalTables} Tables)\n\n`;
    optimizedSeatingResult.tables.forEach((t: any) => {
      md += `## Table ${t.tableNumber}: ${t.tableName}\n`;
      md += `Format: ${t.seats.length} Seats | Diversity Score: ${t.metrics?.diversityScore ?? 'High'}\n\n`;
      md += `### Attendees\n`;
      t.seats.forEach((s: any) => {
        md += `- Seat ${s.seatNumber}: ${s.name} (${s.roleTitle || 'Founder'} at ${s.company || 'Stealth'}) - Sectors: ${(s.sectorTags || []).join(', ') || 'N/A'}\n`;
      });
      if (t.conversationCard) {
        md += `\n### Table Theme: ${t.conversationCard.tableTheme}\n`;
        md += `Curator Icebreaker: ${t.conversationCard.icebreakerPrompt}\n`;
        md += `Discussion Spark: ${t.conversationCard.unifyingTopic}\n`;
      }
      md += `\n---\n\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      setCopiedTableCardNum(-1);
      setTimeout(() => setCopiedTableCardNum(null), 3000);
    });
  };

  // Toggle individual table briefing expansion when in collapsed mode
  const handleToggleTableBriefing = (tableNumber: number) => {
    setExpandedBriefingTables(prev => {
      const next = new Set(prev);
      if (next.has(tableNumber)) next.delete(tableNumber);
      else next.add(tableNumber);
      return next;
    });
  };

  // Table Captain & Host Dossier Handlers
  const handleToggleCaptain = (tableNumber: number, personId: number) => {
    setTableCaptains(prev => ({
      ...prev,
      [tableNumber]: personId,
    }));
  };

  const handleOpenHostDossier = (table: any) => {
    setActiveDossierTable(table);
    setIsHostDossierModalOpen(true);
  };

  // Flake Management & Hot-Swap Handlers
  const handleToggleFlake = (seatId: number) => {
    setDroppedSeatIds(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  const handleExecuteHotSwap = (tableNumber: number, oldSeatId: number, newMember: Person) => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return;
    const updatedTables = optimizedSeatingResult.tables.map((table: any) => {
      if (table.tableNumber !== tableNumber) return table;
      const updatedSeats = table.seats.map((seat: any) => {
        if (seat.id !== oldSeatId) return seat;
        return {
          ...seat,
          id: newMember.id,
          name: newMember.name,
          email: newMember.email,
          company: newMember.company,
          roleTitle: newMember.role_title,
          role_title: newMember.role_title,
          roleType: newMember.role_type || 'founder',
          seniority: newMember.seniority || 'senior',
          sectorTags: newMember.sector_tags || [],
          sector_tags: newMember.sector_tags || [],
          fitScore: newMember.fit_score || 95,
          fit_score: newMember.fit_score || 95,
          bioNotes: newMember.clean_summary || newMember.bio_notes,
        };
      });
      return {
        ...table,
        seats: updatedSeats,
      };
    });

    setOptimizedSeatingResult({
      ...optimizedSeatingResult,
      tables: updatedTables,
    });

    // Remove from dropped set
    setDroppedSeatIds(prev => {
      const next = new Set(prev);
      next.delete(oldSeatId);
      return next;
    });

    setHotSwapTarget(null);
    setHotSwapSearchQuery('');
  };

  // Chef & Venue Kitchen Manifest CSV Export
  const handleExportChefDietaryCSV = () => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return;
    const rows = [
      ['Table #', 'Table Name', 'Seat #', 'Guest Name', 'Company', 'Title', 'Role / Captain', 'Dietary Restrictions & Allergies', 'Special Venue Notes']
    ];

    optimizedSeatingResult.tables.forEach((table: any) => {
      const captainId = tableCaptains[table.tableNumber] || table.seats[0]?.id;
      table.seats.forEach((seat: any) => {
        const isDropped = droppedSeatIds.has(seat.id);
        const isCaptain = seat.id === captainId;

        let dietary = 'No Restrictions (Standard Tasting Menu)';
        const bioLower = (seat.bioNotes || '').toLowerCase();
        if (bioLower.includes('vegan')) dietary = 'Vegan / Plant-Based';
        else if (bioLower.includes('vegetarian')) dietary = 'Vegetarian';
        else if (bioLower.includes('gluten') || bioLower.includes('celiac')) dietary = 'Strict Gluten-Free (Celiac Safe)';
        else if (bioLower.includes('pescatarian') || bioLower.includes('fish')) dietary = 'Pescatarian';
        else if (bioLower.includes('dairy') || bioLower.includes('lactose')) dietary = 'Dairy-Free / Lactose Intolerant';
        else if (bioLower.includes('nut') || bioLower.includes('peanut')) dietary = 'Severe Nut Allergy';

        rows.push([
          String(table.tableNumber),
          table.tableName || `Table ${table.tableNumber}`,
          String(seat.seatNumber),
          isDropped ? `${seat.name} (CANCELLED / FLAKED)` : seat.name,
          seat.company || 'Stealth',
          seat.roleTitle || 'Founder',
          isCaptain ? 'TABLE CAPTAIN (HOST)' : 'VIP Attendee',
          isDropped ? 'CANCELLED - DO NOT PREPARE' : dietary,
          isCaptain ? 'VIP Table Host - Priority Service' : ''
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(escapeCSV).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chef_venue_dietary_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // VIP Dinner Invites & Host Dossiers Dispatch Execution
  const handleDispatchVIPInvites = async (overrideMethod?: 'simulate' | 'resend' | 'n8n_webhook') => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return;
    const method = overrideMethod || dispatchMethod;
    setIsDispatching(true);
    try {
      const res = await fetch('/api/seating/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventDetails,
          tables: optimizedSeatingResult.tables.map((t: any) => ({
            ...t,
            seats: t.seats.filter((s: any) => !droppedSeatIds.has(s.id)),
          })),
          tableCaptains,
          dispatchMethod: method,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setDispatchResult(data);
      setDispatchActiveTab('audit_log');
    } catch (err: any) {
      console.error('Invite dispatch failed:', err);
      alert('Invite dispatch failed: ' + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered Seating Tables (by active table chip or attendee/company search)
  const filteredSeatingTables = useMemo(() => {
    if (!optimizedSeatingResult || !optimizedSeatingResult.tables) return [];
    return optimizedSeatingResult.tables.filter((table: any) => {
      // 1. Filter by specific table chip
      if (seatingActiveTableFilter !== 'all' && table.tableNumber !== seatingActiveTableFilter) {
        return false;
      }
      // 2. Filter by attendee name, company, role, sector, or table theme
      if (seatingSearchQuery.trim()) {
        const q = seatingSearchQuery.toLowerCase().trim();
        const matchName = (table.seats || []).some((s: any) => (s.name || '').toLowerCase().includes(q));
        const matchCompany = (table.seats || []).some((s: any) => (s.company || '').toLowerCase().includes(q));
        const matchRole = (table.seats || []).some((s: any) => (s.roleTitle || '').toLowerCase().includes(q));
        const matchSector = (table.seats || []).some((s: any) => (s.sectorTags || []).some((tag: string) => tag.toLowerCase().includes(q)));
        const matchTheme = (table.tableName || '').toLowerCase().includes(q) || (table.conversationCard?.tableTheme || '').toLowerCase().includes(q);
        return matchName || matchCompany || matchRole || matchSector || matchTheme;
      }
      return true;
    });
  }, [optimizedSeatingResult, seatingActiveTableFilter, seatingSearchQuery]);

  // Seating Pagination Computations
  const seatingTotalPages = useMemo(() => {
    if (seatingTablesPerPage === 0) return 1;
    return Math.max(1, Math.ceil(filteredSeatingTables.length / seatingTablesPerPage));
  }, [filteredSeatingTables.length, seatingTablesPerPage]);

  const validSeatingCurrentPage = Math.min(seatingCurrentPage, seatingTotalPages);

  const paginatedSeatingTables = useMemo(() => {
    if (seatingTablesPerPage === 0) return filteredSeatingTables;
    const start = (validSeatingCurrentPage - 1) * seatingTablesPerPage;
    return filteredSeatingTables.slice(start, start + seatingTablesPerPage);
  }, [filteredSeatingTables, validSeatingCurrentPage, seatingTablesPerPage]);

  // Nav Items Helper Component (for expanded sidebar & mobile drawer)
  const NavItems = () => (
    <div className="p-3 space-y-1.5">
      <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
        Workspace
      </div>
      <button
        onClick={() => {
          setActiveTab('people');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[42px] flex items-center justify-between pl-3.5 pr-2.5 py-2 text-sm rounded-lg transition-all relative ${
          activeTab === 'people'
            ? 'bg-surface-raised text-ink font-semibold shadow-xs'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {activeTab === 'people' && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#E05A47] rounded-r-full" />
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'people' ? 'text-[#E05A47]' : 'text-ink-muted'}`} />
          <span className="truncate whitespace-nowrap">Members Directory</span>
        </div>
        <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-surface border border-line text-ink-muted shrink-0 ml-2">
          {activePeople.length}
        </span>
      </button>

      <button
        onClick={() => {
          setActiveTab('duplicates');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[42px] flex items-center justify-between pl-3.5 pr-2.5 py-2 text-sm rounded-lg transition-all relative ${
          activeTab === 'duplicates'
            ? 'bg-surface-raised text-ink font-semibold shadow-xs'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {activeTab === 'duplicates' && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#E05A47] rounded-r-full" />
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <Code2 className={`w-4 h-4 shrink-0 ${activeTab === 'duplicates' ? 'text-[#E05A47]' : 'text-warning'}`} />
          <span className="truncate whitespace-nowrap">Duplicates Queue</span>
        </div>
        {metrics.duplicates > 0 && (
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-warning-soft text-warning border border-warning/30 shrink-0 ml-2">
            {metrics.duplicates}
          </span>
        )}
      </button>

      <button
        onClick={() => {
          setActiveTab('intros');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[42px] flex items-center justify-between pl-3.5 pr-2.5 py-2 text-sm rounded-lg transition-all relative ${
          activeTab === 'intros'
            ? 'bg-surface-raised text-ink font-semibold shadow-xs'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {activeTab === 'intros' && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#E05A47] rounded-r-full" />
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'intros' ? 'text-[#E05A47]' : 'text-copper'}`} />
          <span className="truncate whitespace-nowrap">Introductions</span>
        </div>
        <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-surface border border-line text-ink-muted shrink-0 ml-2">
          {introductions.length}
        </span>
      </button>

      <button
        onClick={() => {
          setActiveTab('seating');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[42px] flex items-center justify-between pl-3.5 pr-2.5 py-2 text-sm rounded-lg transition-all relative ${
          activeTab === 'seating'
            ? 'bg-surface-raised text-ink font-semibold shadow-xs'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {activeTab === 'seating' && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#E05A47] rounded-r-full" />
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <Utensils className={`w-4 h-4 shrink-0 ${activeTab === 'seating' ? 'text-[#E05A47]' : 'text-signal'}`} />
          <span className="truncate whitespace-nowrap">Seating Optimizer</span>
        </div>
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20 shrink-0 ml-2">
          VIP
        </span>
      </button>

      <button
        onClick={() => {
          setActiveTab('intelligence');
          setIsMobileMenuOpen(false);
        }}
        className={`w-full min-h-[42px] flex items-center justify-between pl-3.5 pr-2.5 py-2 text-sm rounded-lg transition-all relative ${
          activeTab === 'intelligence'
            ? 'bg-surface-raised text-ink font-semibold shadow-xs'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        {activeTab === 'intelligence' && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#E05A47] rounded-r-full" />
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <Compass className={`w-4 h-4 shrink-0 ${activeTab === 'intelligence' ? 'text-[#E05A47]' : 'text-signal'}`} />
          <span className="truncate whitespace-nowrap">Intelligence Lab</span>
        </div>
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20 shrink-0 ml-2">
          AI LAB
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
                  <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center text-surface text-xs font-mono font-bold shadow-xs">
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
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface-muted text-ink-muted hover:text-ink"
                  aria-label="Close Navigation Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Action Button in Mobile */}
              <div className="p-3 pb-1">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsImportModalOpen(true);
                    fetchAirtableBases();
                  }}
                  className="w-full min-h-[40px] px-3 py-2 text-xs font-medium rounded-lg bg-surface-raised border border-line/80 hover:border-signal/50 hover:bg-surface-muted text-ink flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4 text-signal" />
                  <span>Sync & Ingest Record</span>
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
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface-muted transition-colors text-ink"
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 1B. ADAPTIVE DESKTOP SIDEBAR: COLLAPSED ICON RAIL VS EXPANDED SIDEBAR */}
      {isSidebarCollapsed ? (
        /* --- COLLAPSED ICON RAIL (Matches Reference Dock Design) --- */
        <aside className="hidden md:flex flex-col justify-between items-center py-3 w-16 border-r border-line bg-surface flex-shrink-0 z-20 transition-all duration-200 select-none">
          <div className="w-full flex flex-col items-center gap-2.5">
            {/* 1. Sidebar Toggle Button (Image 1 & 2) */}
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-line/60 hover:bg-surface-muted hover:border-line text-ink-muted hover:text-ink transition-all shadow-2xs group relative"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Expand Sidebar
              </span>
            </button>

            {/* 2. Quick Add / Ingest Button (Image 2) */}
            <button
              onClick={() => {
                setIsImportModalOpen(true);
                fetchAirtableBases();
              }}
              className="w-10 h-10 rounded-2xl bg-surface-raised border border-line/70 hover:bg-surface-muted hover:border-signal/50 flex items-center justify-center text-ink transition-all shadow-xs group relative"
              title="Sync & Ingest / Add Record"
              aria-label="Sync & Ingest / Add Record"
            >
              <Plus className="w-5 h-5 text-ink" />
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Sync & Ingest Record (+)
              </span>
            </button>

            {/* 3. Search Button (Image 2) */}
            <button
              onClick={() => {
                const input = document.getElementById('global-search-input');
                if (input) input.focus();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-muted text-ink-muted hover:text-ink transition-all group relative"
              title="Search Records"
              aria-label="Search Records"
            >
              <Search className="w-5 h-5" />
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Search Records
              </span>
            </button>

            {/* 4. Subtle Divider Line (Image 2) */}
            <div className="w-8 h-[1px] bg-line/70 my-1" />

            {/* 5. Nav Icons Rail */}
            {/* 1. Members Directory Tab (Open Book) */}
            <button
              onClick={() => setActiveTab('people')}
              className="relative w-full py-1 flex items-center justify-center group transition-colors"
              title={`Members Directory (${activePeople.length})`}
              aria-label="Members Directory"
            >
              {activeTab === 'people' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E05A47] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTab === 'people'
                    ? 'bg-surface-raised border border-line/60 text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted/70'
                }`}
              >
                <BookOpen className={`w-5 h-5 ${activeTab === 'people' ? 'text-ink' : 'text-ink-muted'}`} />
              </div>
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Members Directory ({activePeople.length})
              </span>
            </button>

            {/* 2. Duplicates Queue Tab (Code / Quality) */}
            <button
              onClick={() => setActiveTab('duplicates')}
              className="relative w-full py-1 flex items-center justify-center group transition-colors"
              title={`Duplicates Queue (${metrics.duplicates})`}
              aria-label="Duplicates Queue"
            >
              {activeTab === 'duplicates' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E05A47] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative ${
                  activeTab === 'duplicates'
                    ? 'bg-surface-raised border border-line/60 text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted/70'
                }`}
              >
                <Code2 className={`w-5 h-5 ${activeTab === 'duplicates' ? 'text-ink' : 'text-ink-muted'}`} />
                {metrics.duplicates > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-warning" />
                )}
              </div>
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Duplicates Queue ({metrics.duplicates})
              </span>
            </button>

            {/* 3. Introductions Tab (Chat Bubble) */}
            <button
              onClick={() => setActiveTab('intros')}
              className="relative w-full py-1 flex items-center justify-center group transition-colors"
              title={`Introductions (${introductions.length})`}
              aria-label="Introductions"
            >
              {activeTab === 'intros' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E05A47] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTab === 'intros'
                    ? 'bg-surface-raised border border-line/60 text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted/70'
                }`}
              >
                <MessageSquare className={`w-5 h-5 ${activeTab === 'intros' ? 'text-ink' : 'text-ink-muted'}`} />
              </div>
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Introductions ({introductions.length})
              </span>
            </button>

            {/* 4. Seating Optimizer Tab (Utensils) */}
            <button
              onClick={() => setActiveTab('seating')}
              className="relative w-full py-1 flex items-center justify-center group transition-colors"
              title="VIP Seating Optimizer"
              aria-label="VIP Seating Optimizer"
            >
              {activeTab === 'seating' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E05A47] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTab === 'seating'
                    ? 'bg-surface-raised border border-line/60 text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted/70'
                }`}
              >
                <Utensils className={`w-5 h-5 ${activeTab === 'seating' ? 'text-ink' : 'text-ink-muted'}`} />
              </div>
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Seating Optimizer
              </span>
            </button>

            {/* 5. Intelligence Lab Tab (Compass) */}
            <button
              onClick={() => setActiveTab('intelligence')}
              className="relative w-full py-1 flex items-center justify-center group transition-colors"
              title="Intelligence Lab"
              aria-label="Intelligence Lab"
            >
              {activeTab === 'intelligence' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E05A47] rounded-r-full" />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  activeTab === 'intelligence'
                    ? 'bg-surface-raised border border-line/60 text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted/70'
                }`}
              >
                <Compass className={`w-5 h-5 ${activeTab === 'intelligence' ? 'text-ink' : 'text-ink-muted'}`} />
              </div>
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Intelligence Lab
              </span>
            </button>
          </div>

          {/* Rail Bottom Actions */}
          <div className="w-full flex flex-col items-center gap-2 pt-2 border-t border-line/60">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-muted text-ink-muted hover:text-ink transition-all group relative"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                {darkMode ? 'Light Theme' : 'Dark Theme'}
              </span>
            </button>
            <div
              className="w-2.5 h-2.5 rounded-full bg-signal animate-pulse my-1 group relative cursor-help"
              title="Database Synced"
            >
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-ink text-surface text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                Supabase & n8n Synced
              </span>
            </div>
          </div>
        </aside>
      ) : (
        /* --- EXPANDED FULL SIDEBAR --- */
        <aside className="hidden md:flex md:w-60 lg:w-64 border-r border-line bg-surface flex-col justify-between flex-shrink-0 z-20 transition-all duration-200">
          <div>
            {/* Brand Header with Collapse Toggle */}
            <div className="h-14 border-b border-line flex items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center text-surface text-xs font-mono font-bold shadow-xs">
                  N
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight text-ink flex items-center gap-1.5">
                    NetworkOS
                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-signal-soft text-signal border border-signal/20">
                      PRO v2.0
                    </span>
                  </h1>
                </div>
              </div>
              {/* Sidebar Collapse Button */}
              <button
                onClick={toggleSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line/60 hover:bg-surface-muted hover:border-line text-ink-muted hover:text-ink transition-all"
                title="Collapse to Icon Rail"
                aria-label="Collapse to Icon Rail"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Button in Expanded Mode */}
            <div className="p-3 pb-1">
              <button
                onClick={() => {
                  setIsImportModalOpen(true);
                  fetchAirtableBases();
                }}
                className="w-full min-h-[38px] px-3 py-2 text-xs font-medium rounded-lg bg-surface-raised border border-line/80 hover:border-signal/50 hover:bg-surface-muted text-ink flex items-center justify-center gap-2 transition-all shadow-2xs group"
              >
                <Plus className="w-4 h-4 text-signal group-hover:scale-110 transition-transform" />
                <span>Sync & Ingest Record</span>
              </button>
            </div>

            {/* Navigation Links with Active Orange Accent */}
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
                className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-ink"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MAIN CONTENT REGION */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Operational Bar */}
        <header className="min-h-[3.5rem] py-2 px-4 sm:px-6 border-b border-line bg-surface flex flex-wrap md:flex-nowrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-full md:max-w-md">
            {/* Sidebar Toggle on Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-line/60 hover:bg-surface-muted text-ink -ml-1"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <PanelLeft className="w-5 h-5" />
            </button>



            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="global-search-input"
                type="text"
                placeholder="Search name, company, title, sector..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-surface-raised border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-signal focus:border-signal text-ink placeholder:text-ink-faint"
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
                title="View Live Ingested Records (Webhooks, CSVs, Automations)"
              >
                <Terminal className="w-3 h-3" />
                <span className="hidden lg:inline">Live Workspace</span>
                <span className="lg:hidden">Live</span>
              </button>
            </div>

            {/* Enterprise Primary Action: [ Add Members ▾ ] */}
            <div className="relative">
              <div className="inline-flex rounded shadow-xs border border-line overflow-hidden">
                <button
                  onClick={() => {
                    setIsImportModalOpen(true);
                    setImportTab('csv');
                  }}
                  className="min-h-[38px] px-3.5 text-xs bg-signal text-surface hover:bg-signal/90 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Members</span>
                </button>
                <button
                  onClick={() => setIsAddMemberMenuOpen(prev => !prev)}
                  className="min-h-[38px] px-2 text-xs bg-signal text-surface hover:bg-signal/90 border-l border-white/20 flex items-center justify-center transition-colors"
                  title="More ingestion options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {isAddMemberMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAddMemberMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-surface-raised border border-line-strong rounded-lg shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-ink-muted uppercase border-b border-line">
                      Member Ingestion
                    </div>
                    <button
                      onClick={() => {
                        setIsAddMemberMenuOpen(false);
                        setIsImportModalOpen(true);
                        setImportTab('csv');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-muted text-ink transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-signal" />
                      <div>
                        <div className="font-medium">Import CSV File</div>
                        <div className="text-[10px] text-ink-muted">Upload cohort spreadsheet</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddMemberMenuOpen(false);
                        setIsImportModalOpen(true);
                        setImportTab('airtable');
                        fetchAirtableBases();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-muted text-ink transition-colors"
                    >
                      <Database className="w-4 h-4 text-info" />
                      <div>
                        <div className="font-medium">Sync Airtable Base</div>
                        <div className="text-[10px] text-ink-muted">Direct API integration</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddMemberMenuOpen(false);
                        setIsImportModalOpen(true);
                        setImportTab('webhook');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-surface-muted text-ink transition-colors"
                    >
                      <Zap className="w-4 h-4 text-copper" />
                      <div>
                        <div className="font-medium">Webhook Realtime Intake</div>
                        <div className="text-[10px] text-ink-muted">Automated HTTP payload</div>
                      </div>
                    </button>
                    <div className="border-t border-line my-1" />
                    <Link
                      href="/apply"
                      target="_blank"
                      onClick={() => setIsAddMemberMenuOpen(false)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-muted text-ink transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-warning" />
                        <div>
                          <div className="font-medium">Public Intake Form</div>
                          <div className="text-[10px] text-ink-muted">External application link</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                    </Link>
                  </div>
                </>
              )}
            </div>

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

            {/* Operator Lock / Sign Out */}
            <button
              onClick={async () => {
                if (confirm('Lock executive console and sign out?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }
              }}
              className="min-h-[40px] px-2.5 sm:px-3 text-xs border border-line hover:border-signal/50 hover:bg-surface-muted rounded text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Lock Console / Sign Out (utsavmishraa005@gmail.com)"
            >
              <Shield className="w-3.5 h-3.5 text-signal" />
              <span className="hidden xl:inline text-[11px] font-mono">utsavmishraa005@gmail.com</span>
              <LogOut className="w-3.5 h-3.5" />
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
            {/* HubSpot-Inspired View Tabs */}
            <div className="border-b border-line bg-surface px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto select-none">
              <button
                onClick={() => setDirectoryViewTab('all')}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  directoryViewTab === 'all'
                    ? 'border-signal text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Members</span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-surface-raised border border-line text-ink-muted tabular-nums">
                  {tabCounts.all}
                </span>
              </button>

              <button
                onClick={() => setDirectoryViewTab('high_fit')}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  directoryViewTab === 'high_fit'
                    ? 'border-signal text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-signal" />
                <span>High Fit (80+)</span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-signal-soft text-signal border border-signal/30 tabular-nums">
                  {tabCounts.highFit}
                </span>
              </button>

              <button
                onClick={() => setDirectoryViewTab('duplicates')}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  directoryViewTab === 'duplicates'
                    ? 'border-signal text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span>Duplicates Queue</span>
                {tabCounts.dups > 0 && (
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-warning-soft text-warning border border-warning/30 tabular-nums font-semibold">
                    {tabCounts.dups}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDirectoryViewTab('enriched')}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  directoryViewTab === 'enriched'
                    ? 'border-signal text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-info" />
                <span>Enriched Profiles</span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-info-soft text-info border border-info/30 tabular-nums">
                  {tabCounts.enriched}
                </span>
              </button>

              <button
                onClick={() => setDirectoryViewTab('incomplete')}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  directoryViewTab === 'incomplete'
                    ? 'border-signal text-ink font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-danger" />
                <span>Needs Details</span>
                {tabCounts.incomplete > 0 && (
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-danger-soft text-danger border border-danger/30 tabular-nums font-semibold">
                    {tabCounts.incomplete}
                  </span>
                )}
              </button>
            </div>

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
                  {filteredPeople.length > 0 ? `${startIndex + 1}–${endIndex}` : '0'} / {filteredPeople.length}
                </div>
              </div>

              {/* Desktop Search & Filter Pills (Always visible on md+) */}
              <div className="hidden md:flex items-center gap-2 overflow-x-auto flex-1 mr-2">
                {/* Search Bar with Keyboard Shortcut Hint (HubSpot style) */}
                <div className="relative min-w-[220px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search members (/ to focus)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-surface border border-line rounded text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="h-4 w-px bg-line mx-1" />

                <span className="text-ink-muted font-mono flex items-center gap-1 text-[11px]">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>

                {/* Role Filter Pill */}
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

                {/* Sector Filter Pill */}
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

                {/* Quality Status Filter Pill */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-8 px-2 bg-surface border border-line rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ALL">All Active Members</option>
                  <option value="CANONICAL">Canonical Only</option>
                  <option value="DUPLICATES">Pending Duplicates</option>
                  <option value="MERGED">Merged Records (Archive)</option>
                  <option value="ALL_WITH_MERGED">All Records (Include Merged)</option>
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

              {/* Right Side: Range Summary & Unified Export Menu */}
              <div className="hidden md:flex items-center gap-3 shrink-0">
                <div className="text-xs font-mono text-ink-muted tabular-nums">
                  Showing <span className="text-ink font-semibold">{filteredPeople.length > 0 ? `${startIndex + 1}–${endIndex}` : '0'}</span> of <span className="text-ink font-semibold">{filteredPeople.length}</span> members
                </div>

                {/* Unified Export Menu (HubSpot style) */}
                <div className="relative border-l border-line pl-3">
                  <button
                    onClick={() => setIsExportMenuOpen(prev => !prev)}
                    className="h-8 px-2.5 bg-surface border border-line hover:border-line-strong text-ink rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Export dataset"
                  >
                    <Download className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 text-ink-muted" />
                  </button>

                  {isExportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface-raised border border-line-strong rounded-lg shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-[10px] font-mono text-ink-muted uppercase border-b border-line mb-1">
                          Export Format
                        </div>
                        <a
                          href={`/api/export?type=members&format=csv&role=${encodeURIComponent(roleFilter)}&sector=${encodeURIComponent(sectorFilter)}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`}
                          download={`network_os_members_${new Date().toISOString().slice(0, 10)}.csv`}
                          onClick={() => setIsExportMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-surface-muted text-ink transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-signal" />
                          <span>CSV Spreadsheet</span>
                        </a>
                        <a
                          href={`/api/export?type=members&format=json&role=${encodeURIComponent(roleFilter)}&sector=${encodeURIComponent(sectorFilter)}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`}
                          download={`network_os_members_${new Date().toISOString().slice(0, 10)}.json`}
                          onClick={() => setIsExportMenuOpen(false)}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-surface-muted text-ink transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-info" />
                          <span>JSON Schema</span>
                        </a>
                      </div>
                    </>
                  )}
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
                    <option value="ALL">All Active Members</option>
                    <option value="CANONICAL">Canonical Only</option>
                    <option value="DUPLICATES">Pending Duplicates</option>
                    <option value="MERGED">Merged Records (Archive)</option>
                    <option value="ALL_WITH_MERGED">All Records (Include Merged)</option>
                    <option value="INCOMPLETE">Incomplete Profiles</option>
                    <option value="HIGH_FIT">High Fit (80+)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 1. DESKTOP DATA TABLE (md+) */}
            <div ref={directoryTableContainerRef} className="hidden md:block flex-1 overflow-auto">
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
                                    <span>Webhook Endpoint for Automations:</span>
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
                          <div className="py-12 max-w-sm mx-auto text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-surface-muted border border-line flex items-center justify-center mx-auto text-ink-muted">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-ink">No matching members found</h4>
                              <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                                No records match your active search or filter criteria in this view.
                              </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              {hasActiveFilters && (
                                <button
                                  onClick={handleClearFilters}
                                  className="px-3 py-1.5 bg-surface border border-line hover:border-signal/50 rounded text-xs font-medium text-ink transition-colors"
                                >
                                  Clear Filters
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsImportModalOpen(true);
                                  setImportTab('csv');
                                }}
                                className="px-3 py-1.5 bg-signal text-surface rounded text-xs font-medium hover:bg-signal/90 transition-colors"
                              >
                                Add Members
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedPeople.map((person, pIdx) => {
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
                                  <div
                                    className={`absolute left-0 ${
                                      pIdx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'
                                    } w-72 p-3 bg-surface-raised border border-line-strong rounded-lg shadow-2xl text-xs z-50 pointer-events-none text-ink font-sans`}
                                  >
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
                              person.review_status === 'merged' || mergedIds.has(person.id) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-raised text-ink-muted border border-line" title={`Consolidated into canonical member #${person.is_duplicate_of}`}>
                                  <CheckCircle2 className="w-3 h-3 text-signal" /> Merged with #{person.is_duplicate_of}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-warning-soft text-warning border border-warning/30" title={`Pending operator review: Duplicate of #${person.is_duplicate_of}`}>
                                  <AlertTriangle className="w-3 h-3" /> Duplicate of #{person.is_duplicate_of}
                                </span>
                              )
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
            <div ref={directoryMobileContainerRef} className="block md:hidden flex-1 overflow-auto p-3 sm:p-4 space-y-3">
              {loading ? (
                <div className="py-12 text-center text-ink-muted font-mono text-xs">
                  Loading database records from Supabase...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-12 max-w-sm mx-auto text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-surface-muted border border-line flex items-center justify-center mx-auto text-ink-muted">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink">No matching members found</h4>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      No records match your active search or filter criteria in this view.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="px-3 py-1.5 bg-surface border border-line hover:border-signal/50 rounded text-xs font-medium text-ink transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsImportModalOpen(true);
                        setImportTab('csv');
                      }}
                      className="px-3 py-1.5 bg-signal text-surface rounded text-xs font-medium hover:bg-signal/90 transition-colors"
                    >
                      Add Members
                    </button>
                  </div>
                </div>
              ) : (
                paginatedPeople.map(person => {
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
                            person.review_status === 'merged' || mergedIds.has(person.id) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-raised text-ink-muted border border-line">
                                <CheckCircle2 className="w-3 h-3 text-signal" /> Merged with #{person.is_duplicate_of}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-warning-soft text-warning border border-warning/30">
                                <AlertTriangle className="w-3 h-3" /> Duplicate of #{person.is_duplicate_of}
                              </span>
                            )
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

            {/* HubSpot-Style CRM Table Pagination Footer Bar */}
            <div className="border-t border-line bg-surface px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
              {/* Left: Range Summary */}
              <div className="text-xs font-mono text-ink-muted tabular-nums flex items-center gap-2">
                <span>
                  Showing <strong className="text-ink font-semibold">{filteredPeople.length > 0 ? startIndex + 1 : 0}–{endIndex}</strong> of <strong className="text-ink font-semibold">{filteredPeople.length}</strong> members
                </span>
                {filteredPeople.length > 0 && (
                  <span className="hidden sm:inline text-ink-faint">
                    &bull; Page {validCurrentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Right: Controls (< Prev  [1, 2, 3..]  Next >  [25 per page ▾]) */}
              <div className="flex items-center gap-2 sm:gap-3 relative">
                {/* Prev Button */}
                <button
                  onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))}
                  disabled={validCurrentPage <= 1}
                  className="h-8 px-2.5 sm:px-3 rounded border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink text-xs font-medium inline-flex items-center gap-1 transition-all shadow-xs"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {/* Numeric Page Pills (for quick jump) */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) => {
                      if (p === '...') {
                        return <span key={`ellipsis-${idx}`} className="px-1 text-ink-muted font-mono">…</span>;
                      }
                      const isCurrent = p === validCurrentPage;
                      return (
                        <button
                          key={`page-${p}`}
                          onClick={() => handlePageChange(Number(p))}
                          className={`min-w-[28px] h-8 px-2 rounded text-xs font-mono font-medium transition-all ${
                            isCurrent
                              ? 'bg-signal text-white font-bold shadow-xs'
                              : 'text-ink-muted hover:text-ink hover:bg-surface-raised border border-transparent hover:border-line'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="h-8 px-2.5 sm:px-3 rounded border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink text-xs font-medium inline-flex items-center gap-1 transition-all shadow-xs"
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* HubSpot-Style Per Page Popover Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsPageSizeMenuOpen(prev => !prev)}
                    className="h-8 px-2.5 sm:px-3 rounded border border-line bg-surface hover:bg-surface-raised text-ink text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-xs focus:ring-1 focus:ring-signal"
                    title="Select records per page"
                  >
                    <span>{pageSize} per page</span>
                    <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                  </button>

                  {/* HubSpot Popover Dropdown Menu */}
                  {isPageSizeMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsPageSizeMenuOpen(false)}
                      />
                      <div className="absolute right-0 bottom-full mb-2.5 w-40 bg-surface-raised border border-line-strong rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                        {/* Popover Arrow Pointer pointing down to button */}
                        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-surface-raised border-r border-b border-line-strong rotate-45" />

                        <div className="px-3 py-1 text-[10px] font-mono text-ink-muted uppercase border-b border-line mb-1">
                          Records per page
                        </div>
                        {[25, 50, 100].map(size => {
                          const isSelected = pageSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => {
                                setPageSize(size);
                                handlePageChange(1);
                                setIsPageSizeMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-signal-soft text-signal font-semibold'
                                  : 'text-ink hover:bg-surface-muted'
                              }`}
                            >
                              <span>{size} per page</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-signal" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
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
                        <div className="p-4 bg-signal-soft/20 border border-signal/30 rounded-xl space-y-2">
                          <div className="text-[11px] font-mono font-semibold text-signal uppercase flex items-center justify-between">
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
                        <div className="p-4 bg-warning-soft/20 border border-warning/30 rounded-xl space-y-2">
                          <div className="text-[11px] font-mono font-semibold text-warning uppercase flex items-center justify-between">
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
                              onClick={() => handleOpenDispatchModal(intro)}
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
                      <div className="p-3.5 bg-surface-raised border border-line/80 rounded-xl space-y-1">
                        <div className="text-[11px] font-mono text-ink-faint uppercase">Member A</div>
                        <div className="font-semibold text-sm text-ink">{intro.person_a.name}</div>
                        <div className="text-xs text-ink-muted">
                          {intro.person_a.role_title} at <strong className="text-ink">{intro.person_a.company || 'Independent'}</strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-surface-raised border border-line/80 rounded-xl space-y-1">
                        <div className="text-[11px] font-mono text-ink-faint uppercase">Member B</div>
                        <div className="font-semibold text-sm text-ink">{intro.person_b.name}</div>
                        <div className="text-xs text-ink-muted">
                          {intro.person_b.role_title} at <strong className="text-ink">{intro.person_b.company || 'Independent'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Suggested Icebreaker Draft */}
                    <div className="p-4 bg-surface-muted/60 border-l-2 border-copper rounded-r-xl space-y-1.5">
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

        {/* 2C. ALGORITHMIC SEATING OPTIMIZER (VIP RETREATS & DINNERS - APARNA PANDE) */}
        {activeTab === 'seating' && (
          <div className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-200">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header & Controls Strip */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-signal">
                      VIP Retreats & Intimate Dinners Curator
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal-soft text-signal border border-signal/30 font-semibold">
                      ALGORITHMIC SEATING
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                    VIP Seating Optimizer
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
                    Constraint satisfaction engine for curated dining pods, founder roundtables, and retreats. Enforces zero direct-competitor clashes, stratifies seniority stages, and synthesizes server-side AI conversation cards.
                  </p>
                </div>

                {/* Top Action Buttons (Dispatch, Chef Sheet, CSV Export & Markdown Copy) */}
                {optimizedSeatingResult && optimizedSeatingResult.tables && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsDispatchModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-signal text-surface hover:bg-signal/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Open VIP dinner invitation dispatch & table host briefing engine"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Dispatch VIP Invites</span>
                    </button>

                    <button
                      onClick={handleExportChefDietaryCSV}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-copper/50 text-ink hover:text-copper transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Export chef kitchen briefing with dietary restrictions, allergies, and table assignments"
                    >
                      <Utensils className="w-3.5 h-3.5 text-copper" />
                      <span>Chef Dietary Sheet</span>
                    </button>

                    <button
                      onClick={handleExportSeatingCSV}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-signal/50 text-ink hover:text-signal transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Export full seating arrangement to CSV spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5 text-signal" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={handleCopyAllTableBriefings}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line hover:border-signal/50 text-ink hover:text-signal transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Copy all table briefings and icebreakers as markdown"
                    >
                      {copiedTableCardNum === -1 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-signal" />
                          <span>Briefings Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-ink-muted" />
                          <span>Copy All Briefings</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Main Workspace Layout (Left: Controls & Selection, Right: Seating Canvas) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT CONFIGURATION PANEL (4 Cols) */}
                <div className="lg:col-span-4 bg-surface border border-line rounded-xl p-4 sm:p-5 space-y-5 shadow-xs">
                  {/* 1. Format & Capacity Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-signal" />
                      <span>Table Format & Capacity</span>
                    </label>
                    <p className="text-[11px] text-ink-muted">
                      Select dining pod size or configure custom capacity.
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {[
                        { size: 2, label: '1:1 Mastermind', desc: '2 seats' },
                        { size: 4, label: 'Coffee Pod', desc: '4 seats' },
                        { size: 6, label: 'Private Dining', desc: '6 seats' },
                        { size: 8, label: 'Flagship Retreat', desc: '8 seats' },
                        { size: 12, label: 'Boardroom Banquet', desc: '12 seats' },
                        { size: 0, label: 'Custom Capacity', desc: 'Custom' },
                      ].map(preset => {
                        const isSelected = seatingTableSize === preset.size;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setSeatingTableSize(preset.size)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'bg-signal-soft border-signal text-signal font-semibold shadow-xs'
                                : 'bg-surface-raised border-line/80 hover:border-line hover:bg-surface-muted text-ink'
                            }`}
                          >
                            <div className="text-xs leading-snug">{preset.label}</div>
                            <div className="text-[10px] font-mono text-ink-muted">{preset.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    {seatingTableSize === 0 && (
                      <div className="pt-2">
                        <label className="text-[11px] font-mono text-ink-muted block mb-1">
                          Custom Seats Per Table (2–24):
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={24}
                          value={seatingCustomSize}
                          onChange={e => setSeatingCustomSize(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded font-mono text-ink"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-line" />

                  {/* 2. Algorithm Constraints */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                      <span>Optimization Constraints</span>
                    </div>

                    {/* Strict Competitor Avoidance Toggle */}
                    <div className="flex items-start justify-between gap-3 p-2.5 bg-surface-raised border border-line/80 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-ink">Strict Competitor Isolation</div>
                        <div className="text-[10px] text-ink-muted leading-relaxed">
                          Isolates direct rival founders and same company members across separate tables.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStrictCompetitorAvoidance(!strictCompetitorAvoidance)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                          strictCompetitorAvoidance ? 'bg-signal' : 'bg-line-strong'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            strictCompetitorAvoidance ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Gemini AI Conversation Cards Toggle */}
                    <div className="flex items-start justify-between gap-3 p-2.5 bg-surface-raised border border-line/80 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-ink">AI Table Conversation Cards</div>
                        <div className="text-[10px] text-ink-muted leading-relaxed">
                          Server-side Gemini 3.6 Flash generates table theme, unifying topic, and icebreakers.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGenerateAiTableCards(!generateAiTableCards)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                          generateAiTableCards ? 'bg-signal' : 'bg-line-strong'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            generateAiTableCards ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-line" />

                  {/* 3. Attendee Pool Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-signal" />
                        <span>Attendee Pool</span>
                      </label>
                      <span className="text-[11px] font-mono text-ink-muted tabular-nums">
                        {selectedSeatingMemberIds.size > 0
                          ? `${selectedSeatingMemberIds.size} selected`
                          : `All Canonical (${metrics.canonical})`}
                      </span>
                    </div>

                    {/* Quick Cohort Selection Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllCanonicalForSeating}
                        className="px-2 py-1 text-[11px] rounded bg-surface-raised border border-line hover:border-line-strong text-ink transition-colors"
                      >
                        Select All Canonical ({metrics.canonical})
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectHighFitForSeating}
                        className="px-2 py-1 text-[11px] rounded bg-surface-raised border border-line hover:border-line-strong text-ink transition-colors"
                      >
                        Top 48 High Fit
                      </button>
                      {selectedSeatingMemberIds.size > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSeatingSelection}
                          className="px-2 py-1 text-[11px] rounded bg-danger-soft text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Expected Tables Estimation Pill */}
                    <div className="p-2.5 rounded-lg bg-surface-muted/60 border border-line text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                        <span>Expected Tables:</span>
                        <span className="text-ink font-semibold">
                          ~{Math.ceil((selectedSeatingMemberIds.size || metrics.canonical || 8) / (seatingTableSize === 0 ? parseInt(seatingCustomSize, 10) || 8 : seatingTableSize))} Tables
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        Constraint optimizer will balance seniority tiers and cross-pollinate sectors evenly.
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Run Button */}
                  <button
                    type="button"
                    onClick={handleRunSeatingOptimization}
                    disabled={isOptimizingSeating || metrics.canonical === 0}
                    className="w-full py-2.5 px-4 rounded-lg bg-signal text-surface font-semibold text-xs hover:bg-signal/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isOptimizingSeating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Optimizing Seating & Generating Cards...</span>
                      </>
                    ) : (
                      <>
                        <Utensils className="w-4 h-4" />
                        <span>Run Seating Optimization</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT CANVAS: LIVE SEATING CHART & TABLE CARDS (8 Cols) */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Empty State: Not Yet Run */}
                  {!optimizedSeatingResult && !isOptimizingSeating && (
                    <div className="bg-surface border border-line rounded-xl p-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-signal-soft border border-signal/30 text-signal flex items-center justify-center mx-auto shadow-xs">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-sm font-semibold text-ink">Ready to Optimize Dinner Seating</h3>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Choose your desired table size (2, 4, 6, 8, 12, or custom), select attendees from your canonical database, and launch the constraint satisfaction optimizer.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-2">
                        <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                            <span>Zero Rivalry</span>
                          </div>
                          <div className="text-[11px] text-ink-muted leading-snug">
                            Voice AI, crypto, and direct rivals isolated across separate tables.
                          </div>
                        </div>

                        <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-info" />
                            <span>Tier Stratification</span>
                          </div>
                          <div className="text-[11px] text-ink-muted leading-snug">
                            Stages and seniority balanced so no table is top-heavy.
                          </div>
                        </div>

                        <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-copper" />
                            <span>AI Conversation</span>
                          </div>
                          <div className="text-[11px] text-ink-muted leading-snug">
                            Gemini 3.6 Flash curates bespoke icebreakers and themes for hosts.
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleRunSeatingOptimization}
                          className="px-4 py-2 rounded-lg bg-signal text-surface text-xs font-semibold hover:bg-signal/90 transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run with All Canonical Members</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {isOptimizingSeating && (
                    <div className="bg-surface border border-line rounded-xl p-10 text-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-signal animate-spin mx-auto" />
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-ink">Optimizing Seating Chart</h3>
                        <p className="text-xs text-ink-muted max-w-sm mx-auto">
                          Evaluating constraint matrix, executing local swap refinement, and generating server-side Gemini 3.6 Flash conversation cards...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Results State */}
                  {optimizedSeatingResult && optimizedSeatingResult.tables && (
                    <div className="space-y-4">
                      {/* 1. Metric Summary Strip */}
                      <div className="bg-surface border border-line rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-left">
                        <div className="border-r border-line pr-2">
                          <div className="text-[10px] font-mono text-ink-muted uppercase">Total Seated</div>
                          <div className="text-base font-semibold text-ink tabular-nums">
                            {optimizedSeatingResult.totalAttendees} members
                          </div>
                        </div>

                        <div className="border-r border-line pr-2">
                          <div className="text-[10px] font-mono text-ink-muted uppercase">Dining Tables</div>
                          <div className="text-base font-semibold text-signal tabular-nums">
                            {optimizedSeatingResult.totalTables} tables
                          </div>
                        </div>

                        <div className="border-r border-line pr-2">
                          <div className="text-[10px] font-mono text-ink-muted uppercase">Pod Format</div>
                          <div className="text-base font-semibold text-ink">
                            {optimizedSeatingResult.tableSize} seats/table
                          </div>
                        </div>

                        <div className="border-r border-line pr-2">
                          <div className="text-[10px] font-mono text-ink-muted uppercase">Direct Conflicts</div>
                          <div className="text-base font-semibold text-signal flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-signal" />
                            <span>{optimizedSeatingResult.totalConflicts} detected</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-ink-muted uppercase">Diversity Score</div>
                          <div className="text-base font-semibold text-ink font-mono">
                            {optimizedSeatingResult.averageDiversityScore}%
                          </div>
                        </div>
                      </div>

                      {/* 2. Floor Plan Controls & In-Canvas Navigation Bar */}
                      <div className="bg-surface border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        {/* Left: View Mode Segmented Controls */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center bg-surface-raised border border-line rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setSeatingViewMode('grid')}
                              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                seatingViewMode === 'grid'
                                  ? 'bg-signal text-surface font-semibold shadow-xs'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                              title="2-Column Floor Plan Grid (Side-by-Side)"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Floor Plan Grid</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSeatingViewMode('focus');
                                if (seatingActiveTableFilter === 'all' && filteredSeatingTables.length > 0) {
                                  setSeatingActiveTableFilter(filteredSeatingTables[0].tableNumber);
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                seatingViewMode === 'focus'
                                  ? 'bg-signal text-surface font-semibold shadow-xs'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                              title="Focus Pod Mode (Inspect 1 Table at a Time)"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Focus Pod</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSeatingViewMode('list')}
                              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                seatingViewMode === 'list'
                                  ? 'bg-signal text-surface font-semibold shadow-xs'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                              title="Full Vertical Roster"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Full List</span>
                            </button>
                          </div>

                          {/* Collapse / Expand AI Cards Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setSeatingCollapseAiCards(!seatingCollapseAiCards);
                              setExpandedBriefingTables(new Set());
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                              seatingCollapseAiCards
                                ? 'bg-signal-soft border-signal/40 text-signal font-semibold'
                                : 'bg-surface-raised border-line hover:border-line-strong text-ink'
                            }`}
                            title="Toggle Compact Card view (collapses AI briefing cards to reduce vertical scroll)"
                          >
                            <ChevronsUpDown className="w-3.5 h-3.5" />
                            <span>{seatingCollapseAiCards ? 'Briefings Minimized' : 'Compact Cards'}</span>
                          </button>
                        </div>

                        {/* Right: Attendee / Company In-Canvas Search & Per Page Selector */}
                        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
                          {/* Search Input */}
                          <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={seatingSearchQuery}
                              onChange={e => {
                                setSeatingSearchQuery(e.target.value);
                                setSeatingCurrentPage(1);
                              }}
                              placeholder="Find founder or company..."
                              className="w-full h-8 pl-8 pr-7 text-xs bg-surface-raised border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-signal"
                            />
                            {seatingSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSeatingSearchQuery('');
                                  setSeatingCurrentPage(1);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Tables Per Page Dropdown (Only in Grid/List mode) */}
                          {seatingViewMode !== 'focus' && (
                            <select
                              value={seatingTablesPerPage}
                              onChange={e => {
                                setSeatingTablesPerPage(Number(e.target.value));
                                setSeatingCurrentPage(1);
                              }}
                              className="h-8 px-2 bg-surface-raised border border-line rounded-lg text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                              title="Tables shown per page"
                            >
                              <option value={6}>6 tables / page</option>
                              <option value={12}>12 tables / page</option>
                              <option value={0}>All tables</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* 3. Sticky Room Radar: Quick Jump Pill Bar */}
                      <div className="bg-surface border border-line rounded-xl p-2.5 flex items-center gap-1.5 overflow-x-auto select-none scrollbar-thin">
                        <span className="text-[10px] font-mono uppercase text-ink-muted px-1 shrink-0 font-semibold">
                          Quick Jump:
                        </span>

                        {/* All Tables Chip */}
                        <button
                          type="button"
                          onClick={() => {
                            setSeatingActiveTableFilter('all');
                            setSeatingCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium shrink-0 transition-all ${
                            seatingActiveTableFilter === 'all'
                              ? 'bg-signal text-surface font-bold shadow-xs'
                              : 'bg-surface-raised border border-line hover:border-line-strong text-ink'
                          }`}
                        >
                          All ({optimizedSeatingResult.tables.length})
                        </button>

                        {/* Individual Table Chips */}
                        {optimizedSeatingResult.tables.map((t: any) => {
                          const isSelected = seatingActiveTableFilter === t.tableNumber;
                          return (
                            <button
                              key={t.tableNumber}
                              type="button"
                              onClick={() => {
                                setSeatingActiveTableFilter(t.tableNumber);
                                setSeatingCurrentPage(1);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono shrink-0 transition-all flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-signal text-surface font-bold shadow-xs'
                                  : 'bg-surface-raised border border-line hover:border-line-strong text-ink-muted hover:text-ink'
                              }`}
                              title={`Table ${t.tableNumber}: ${t.tableName} (${t.seats?.length || 0} seats)`}
                            >
                              <span>T{t.tableNumber}</span>
                              <span className="text-[9px] opacity-70">({t.seats?.length || 0})</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Filter Notice (if table or search query is filtered) */}
                      {(seatingActiveTableFilter !== 'all' || seatingSearchQuery) && (
                        <div className="flex items-center justify-between p-2.5 bg-signal-soft/40 border border-signal/20 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-signal">Active Filter:</span>
                            {seatingActiveTableFilter !== 'all' && (
                              <span className="px-2 py-0.5 rounded bg-signal-soft text-signal border border-signal/30 font-mono text-[11px]">
                                Table {seatingActiveTableFilter}
                              </span>
                            )}
                            {seatingSearchQuery && (
                              <span className="px-2 py-0.5 rounded bg-surface border border-line text-ink font-mono text-[11px]">
                                Matching &ldquo;{seatingSearchQuery}&rdquo; ({filteredSeatingTables.length} tables)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSeatingActiveTableFilter('all');
                              setSeatingSearchQuery('');
                              setSeatingCurrentPage(1);
                            }}
                            className="text-xs text-signal hover:underline font-medium"
                          >
                            Reset to All Tables
                          </button>
                        </div>
                      )}

                      {/* Empty Search Result State */}
                      {filteredSeatingTables.length === 0 && (
                        <div className="bg-surface border border-line rounded-xl p-8 text-center space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-raised border border-line text-ink-muted flex items-center justify-center mx-auto">
                            <Search className="w-5 h-5" />
                          </div>
                          <div className="text-xs text-ink font-semibold">
                            No tables found matching &ldquo;{seatingSearchQuery}&rdquo;
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Try searching for another founder name, company, sector, or reset the filter.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSeatingSearchQuery('');
                              setSeatingActiveTableFilter('all');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-line text-xs font-medium text-ink hover:bg-surface-muted"
                          >
                            Clear Search
                          </button>
                        </div>
                      )}

                      {/* 4. FOCUS POD VIEW MODE */}
                      {seatingViewMode === 'focus' && filteredSeatingTables.length > 0 && (() => {
                        const currentTableIndex = filteredSeatingTables.findIndex(
                          (t: any) => t.tableNumber === seatingActiveTableFilter
                        );
                        const activeTable = currentTableIndex >= 0 ? filteredSeatingTables[currentTableIndex] : filteredSeatingTables[0];
                        const isCopied = copiedTableCardNum === activeTable.tableNumber;

                        return (
                          <div className="space-y-3">
                            {/* Focus Pod Stepper Bar */}
                            <div className="flex items-center justify-between bg-surface border border-line rounded-xl p-3 text-xs">
                              <button
                                type="button"
                                disabled={currentTableIndex <= 0}
                                onClick={() => {
                                  const prevTable = filteredSeatingTables[Math.max(0, currentTableIndex - 1)];
                                  if (prevTable) setSeatingActiveTableFilter(prevTable.tableNumber);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink font-medium inline-flex items-center gap-1.5 transition-all shadow-xs"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>Previous Table</span>
                              </button>

                              <div className="text-xs font-mono text-ink flex items-center gap-2">
                                <span className="font-semibold text-signal">Table {activeTable.tableNumber}</span>
                                <span className="text-ink-muted">of {optimizedSeatingResult.tables.length}</span>
                              </div>

                              <button
                                type="button"
                                disabled={currentTableIndex >= filteredSeatingTables.length - 1}
                                onClick={() => {
                                  const nextTable = filteredSeatingTables[Math.min(filteredSeatingTables.length - 1, currentTableIndex + 1)];
                                  if (nextTable) setSeatingActiveTableFilter(nextTable.tableNumber);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink font-medium inline-flex items-center gap-1.5 transition-all shadow-xs"
                              >
                                <span>Next Table</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Focused Table Card (Full Width) */}
                            <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
                              <div className="p-4 bg-surface-raised border-b border-line flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-lg bg-signal/10 border border-signal/30 text-signal font-mono text-sm font-bold flex items-center justify-center">
                                    T{activeTable.tableNumber}
                                  </span>
                                  <div>
                                    <h4 className="text-base font-semibold text-ink">
                                      {activeTable.tableName || `Table ${activeTable.tableNumber}`}
                                    </h4>
                                    <div className="text-xs text-ink-muted font-mono">
                                      {activeTable.seats.length} of {activeTable.capacity} seats filled &bull; Diversity: {activeTable.metrics?.diversityScore ?? 92}%
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal-soft text-signal border border-signal/20 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Zero Rival Clashes
                                  </span>

                                  {/* Table Captain Host Dossier Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHostDossier(activeTable)}
                                    className="px-2.5 py-1 rounded text-xs font-medium bg-copper/10 hover:bg-copper/20 text-copper border border-copper/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Open confidential Table Captain facilitation sheet"
                                  >
                                    <Award className="w-3.5 h-3.5 text-copper" />
                                    <span>Host Dossier</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const mdCard = `Table ${activeTable.tableNumber}: ${activeTable.tableName}\nTheme: ${activeTable.conversationCard?.tableTheme || ''}\nIcebreaker: ${activeTable.conversationCard?.icebreakerPrompt || ''}\nAttendees:\n${activeTable.seats.map((s: any) => `- ${s.name} (${s.roleTitle || 'Founder'} at ${s.company || 'Stealth'})`).join('\n')}`;
                                      navigator.clipboard.writeText(mdCard);
                                      setCopiedTableCardNum(activeTable.tableNumber);
                                      setTimeout(() => setCopiedTableCardNum(null), 2000);
                                    }}
                                    className="p-1.5 rounded-lg border border-line hover:bg-surface text-ink-muted hover:text-ink transition-colors"
                                    title="Copy Table Briefing Card"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-signal" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Attendees Seating Grid */}
                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activeTable.seats.map((seat: any) => {
                                  const isCaptain = (tableCaptains[activeTable.tableNumber] || activeTable.seats[0]?.id) === seat.id;
                                  const isDropped = droppedSeatIds.has(seat.id);

                                  return (
                                    <div
                                      key={seat.id}
                                      className={`p-3 border rounded-lg flex flex-col gap-2 transition-all ${
                                        isDropped
                                          ? 'bg-rose-500/5 border-rose-500/30'
                                          : isCaptain
                                          ? 'bg-amber-500/5 border-amber-500/30'
                                          : 'bg-canvas border-line/70'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <span className={`w-6 h-6 rounded-full border text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                          isDropped
                                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                                            : isCaptain
                                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                                            : 'bg-surface-raised border-line text-ink-muted'
                                        }`}>
                                          {seat.seatNumber}
                                        </span>

                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className={`text-xs font-semibold truncate ${isDropped ? 'line-through text-ink-muted' : 'text-ink'}`}>
                                                {seat.name}
                                              </span>
                                              {isCaptain && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-600 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                                                  <Award className="w-2.5 h-2.5" /> Host
                                                </span>
                                              )}
                                            </div>

                                            {/* Seat Actions: Captain Toggle + Flake Toggle */}
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleCaptain(activeTable.tableNumber, seat.id)}
                                                className={`p-1 rounded transition-colors ${
                                                  isCaptain
                                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                                    : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                                                }`}
                                                title={isCaptain ? 'Designated Table Captain' : 'Nominate as Table Captain'}
                                              >
                                                <Award className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleToggleFlake(seat.id)}
                                                className={`p-1 rounded transition-colors ${
                                                  isDropped
                                                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                                                    : 'text-ink-muted hover:text-rose-500 hover:bg-surface-raised'
                                                }`}
                                                title={isDropped ? 'Restore Guest (Cancel Flake)' : 'Mark as Last-Minute Flake'}
                                              >
                                                {isDropped ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                              </button>
                                            </div>
                                          </div>

                                          <div className="text-[11px] text-ink-muted truncate">
                                            {seat.roleTitle || 'Founder'} at <strong className="text-ink">{seat.company || 'Stealth'}</strong>
                                          </div>

                                          {seat.sectorTags && seat.sectorTags.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap pt-1">
                                              {seat.sectorTags.slice(0, 4).map((tag: string) => (
                                                <span
                                                  key={tag}
                                                  className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-raised text-ink-muted border border-line/60"
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Flaked State Alert & Hot-Swap Trigger */}
                                      {isDropped && (
                                        <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-mono font-semibold text-rose-500 uppercase">
                                            Cancelled / No-Show
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setHotSwapTarget({ tableNumber: activeTable.tableNumber, seatId: seat.id, seatNumber: seat.seatNumber })}
                                            className="px-2.5 py-1 rounded bg-signal text-surface text-xs font-semibold hover:bg-signal/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                            title="Hot-swap an unseated founder into this empty seat"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Hot-Swap Seat</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* AI Table Conversation Card */}
                              {activeTable.conversationCard && (
                                <div className="m-4 mt-0 p-4 bg-surface-raised border border-line rounded-lg space-y-2.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-ink flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-copper" />
                                      <span>Table Briefing & Host Icebreaker</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-copper bg-copper/10 px-2.5 py-0.5 rounded font-medium">
                                      {activeTable.conversationCard.tableTheme}
                                    </span>
                                  </div>

                                  <div className="text-xs text-ink-muted leading-relaxed">
                                    <strong className="text-ink font-medium">Unifying Spark:</strong> {activeTable.conversationCard.unifyingTopic}
                                  </div>

                                  <div className="p-3 bg-surface border-l-2 border-copper rounded-r text-xs italic font-serif text-ink leading-relaxed">
                                    &ldquo;{activeTable.conversationCard.icebreakerPrompt}&rdquo;
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 5. GRID FLOOR PLAN OR LIST VIEW MODE */}
                      {seatingViewMode !== 'focus' && filteredSeatingTables.length > 0 && (
                        <div
                          className={
                            seatingViewMode === 'grid'
                              ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 items-start'
                              : 'space-y-4'
                          }
                        >
                          {paginatedSeatingTables.map((table: any) => {
                            const isCopied = copiedTableCardNum === table.tableNumber;
                            const isCardCollapsed = seatingCollapseAiCards && !expandedBriefingTables.has(table.tableNumber);

                            return (
                              <div
                                key={table.tableNumber}
                                className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs space-y-0 transition-all hover:border-line-strong"
                              >
                                {/* Table Header Strip */}
                                <div className="p-3.5 bg-surface-raised border-b border-line flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-6 h-6 rounded-md bg-signal/10 border border-signal/30 text-signal font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                      T{table.tableNumber}
                                    </span>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-semibold text-ink truncate">
                                        {table.tableName || `Table ${table.tableNumber}`}
                                      </h4>
                                      <div className="text-[10px] text-ink-muted font-mono">
                                        {table.seats.length}/{table.capacity} seats &bull; Diversity: {table.metrics?.diversityScore ?? 92}%
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-signal-soft text-signal border border-signal/20 font-medium flex items-center gap-1">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      Zero Rivalry
                                    </span>

                                    {/* Table Captain Host Dossier Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenHostDossier(table)}
                                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-copper/10 hover:bg-copper/20 text-copper border border-copper/30 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Open confidential Table Captain facilitation sheet"
                                    >
                                      <Award className="w-3 h-3 text-copper" />
                                      <span>Host Dossier</span>
                                    </button>

                                    {table.conversationCard && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const mdCard = `Table ${table.tableNumber}: ${table.tableName}\nTheme: ${table.conversationCard.tableTheme}\nIcebreaker: ${table.conversationCard.icebreakerPrompt}\nUnifying Topic: ${table.conversationCard.unifyingTopic}\nAttendees:\n${table.seats.map((s: any) => `- ${s.name} (${s.roleTitle || 'Founder'} at ${s.company || 'Stealth'})`).join('\n')}`;
                                          navigator.clipboard.writeText(mdCard);
                                          setCopiedTableCardNum(table.tableNumber);
                                          setTimeout(() => setCopiedTableCardNum(null), 2000);
                                        }}
                                        className="p-1 rounded-md border border-line hover:bg-surface text-ink-muted hover:text-ink transition-colors"
                                        title="Copy Table Briefing"
                                      >
                                        {isCopied ? <Check className="w-3 h-3 text-signal" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Attendees Seating Grid (Compact) */}
                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {table.seats.map((seat: any) => {
                                    const isCaptain = (tableCaptains[table.tableNumber] || table.seats[0]?.id) === seat.id;
                                    const isDropped = droppedSeatIds.has(seat.id);

                                    return (
                                      <div
                                        key={seat.id}
                                        className={`p-2 border rounded-md flex flex-col gap-1.5 transition-all ${
                                          isDropped
                                            ? 'bg-rose-500/5 border-rose-500/30'
                                            : isCaptain
                                            ? 'bg-amber-500/5 border-amber-500/30'
                                            : 'bg-canvas border-line/70'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className={`w-4 h-4 rounded-full border text-[9px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                            isDropped
                                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                                              : isCaptain
                                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                                              : 'bg-surface-raised border-line text-ink-muted'
                                          }`}>
                                            {seat.seatNumber}
                                          </span>

                                          <div className="min-w-0 flex-1 space-y-0.2">
                                            <div className="flex items-center justify-between gap-1">
                                              <div className="flex items-center gap-1 min-w-0">
                                                <span className={`text-[11px] font-semibold truncate ${isDropped ? 'line-through text-ink-muted' : 'text-ink'}`}>
                                                  {seat.name}
                                                </span>
                                                {isCaptain && (
                                                  <span className="px-1 py-0.1 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30 shrink-0">
                                                    Host
                                                  </span>
                                                )}
                                              </div>

                                              {/* Seat Action Buttons */}
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleCaptain(table.tableNumber, seat.id)}
                                                  className={`p-0.5 rounded transition-colors ${
                                                    isCaptain
                                                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                                      : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
                                                  }`}
                                                  title={isCaptain ? 'Designated Table Captain' : 'Nominate as Table Captain'}
                                                >
                                                  <Award className="w-3 h-3" />
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleFlake(seat.id)}
                                                  className={`p-0.5 rounded transition-colors ${
                                                    isDropped
                                                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                                                      : 'text-ink-muted hover:text-rose-500 hover:bg-surface-raised'
                                                  }`}
                                                  title={isDropped ? 'Restore Guest' : 'Mark as Flake / Drop'}
                                                >
                                                  {isDropped ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                                </button>
                                              </div>
                                            </div>

                                            <div className="text-[10px] text-ink-muted truncate">
                                              {seat.roleTitle || 'Founder'} &bull; <strong className="text-ink">{seat.company || 'Stealth'}</strong>
                                            </div>

                                            {seat.sectorTags && seat.sectorTags.length > 0 && (
                                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                {seat.sectorTags.slice(0, 2).map((tag: string) => (
                                                  <span
                                                    key={tag}
                                                    className="text-[8px] font-mono px-1 py-0.1 rounded bg-surface-raised text-ink-muted border border-line/60"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Flaked Alert & Hot-Swap Trigger */}
                                        {isDropped && (
                                          <div className="pt-1 border-t border-rose-500/20 flex items-center justify-between gap-1">
                                            <span className="text-[8px] font-mono font-semibold text-rose-500 uppercase">
                                              Flaked / Open Seat
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setHotSwapTarget({ tableNumber: table.tableNumber, seatId: seat.id, seatNumber: seat.seatNumber })}
                                              className="px-1.5 py-0.5 rounded bg-signal text-surface text-[9px] font-semibold hover:bg-signal/90 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                              title="Hot-swap an available alternate founder into this seat"
                                            >
                                              <RefreshCw className="w-2.5 h-2.5" />
                                              <span>Hot-Swap</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* AI Table Conversation Card (Collapsible Accordion) */}
                                {table.conversationCard && (
                                  <div className="m-3 mt-0">
                                    {isCardCollapsed ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTableBriefing(table.tableNumber)}
                                        className="w-full px-2.5 py-1.5 bg-surface-raised border border-line rounded-md flex items-center justify-between text-[11px] hover:bg-surface-muted transition-colors"
                                      >
                                        <span className="flex items-center gap-1.5 text-copper font-medium truncate">
                                          <Sparkles className="w-3 h-3 shrink-0" />
                                          <span className="truncate">{table.conversationCard.tableTheme}</span>
                                        </span>
                                        <span className="text-[10px] font-mono text-ink-muted hover:text-ink shrink-0 ml-2">
                                          Show Briefing ▾
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="p-3 bg-surface-raised border border-line rounded-md space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-ink flex items-center gap-1 text-[11px]">
                                            <Sparkles className="w-3 h-3 text-copper" />
                                            <span>Briefing & Icebreaker</span>
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-copper bg-copper/10 px-1.5 py-0.2 rounded font-medium">
                                              {table.conversationCard.tableTheme}
                                            </span>
                                            {seatingCollapseAiCards && (
                                              <button
                                                type="button"
                                                onClick={() => handleToggleTableBriefing(table.tableNumber)}
                                                className="text-[10px] font-mono text-ink-muted hover:text-ink"
                                              >
                                                Hide ▴
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-[11px] text-ink-muted leading-relaxed">
                                          <strong className="text-ink font-medium">Spark:</strong> {table.conversationCard.unifyingTopic}
                                        </div>

                                        <div className="p-2 bg-surface border-l-2 border-copper rounded-r text-[11px] italic font-serif text-ink leading-relaxed">
                                          &ldquo;{table.conversationCard.icebreakerPrompt}&rdquo;
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 6. HubSpot-Style Table Pagination Footer Bar */}
                      {seatingViewMode !== 'focus' && seatingTablesPerPage > 0 && seatingTotalPages > 1 && (
                        <div className="border-t border-line bg-surface px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                          {/* Range Summary */}
                          <div className="text-xs font-mono text-ink-muted tabular-nums">
                            Showing Tables <strong className="text-ink font-semibold">{(validSeatingCurrentPage - 1) * seatingTablesPerPage + 1}–{Math.min(validSeatingCurrentPage * seatingTablesPerPage, filteredSeatingTables.length)}</strong> of <strong className="text-ink font-semibold">{filteredSeatingTables.length}</strong> tables
                          </div>

                          {/* Controls (< Prev  [1, 2, 3..]  Next >) */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => setSeatingCurrentPage(Math.max(1, validSeatingCurrentPage - 1))}
                              disabled={validSeatingCurrentPage <= 1}
                              className="h-7 px-2.5 rounded border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink text-xs font-medium inline-flex items-center gap-1 transition-all shadow-xs"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span>Prev</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {Array.from({ length: seatingTotalPages }, (_, i) => i + 1).map(p => {
                                const isCurrent = p === validSeatingCurrentPage;
                                return (
                                  <button
                                    key={`page-${p}`}
                                    type="button"
                                    onClick={() => setSeatingCurrentPage(p)}
                                    className={`min-w-[26px] h-7 px-1.5 rounded text-xs font-mono font-medium transition-all ${
                                      isCurrent
                                        ? 'bg-signal text-white font-bold shadow-xs'
                                        : 'text-ink-muted hover:text-ink hover:bg-surface-raised border border-transparent hover:border-line'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSeatingCurrentPage(Math.min(seatingTotalPages, validSeatingCurrentPage + 1))}
                              disabled={validSeatingCurrentPage >= seatingTotalPages}
                              className="h-7 px-2.5 rounded border border-line bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:pointer-events-none text-ink text-xs font-medium inline-flex items-center gap-1 transition-all shadow-xs"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2D. DEEP INTELLIGENCE LAB */}
        {activeTab === 'intelligence' && (
          <div className="flex-1 overflow-y-auto bg-canvas p-6 sm:p-8 lg:p-10 animate-in fade-in-50 duration-200">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Header & Capabilities Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-signal">
                      Autonomous Intelligence Engine
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-signal-soft text-signal border border-signal/30 font-semibold">
                      LIVE
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">Deep Intelligence Lab</h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
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
                <button
                  onClick={() => setIntelligenceSubTab('history')}
                  className={`px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    intelligenceSubTab === 'history'
                      ? 'bg-signal text-surface font-semibold shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Ledger</span>
                  {intelligenceRecords.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      intelligenceSubTab === 'history' ? 'bg-surface/20 text-surface' : 'bg-surface-raised text-ink-muted border border-line'
                    }`}>
                      {intelligenceRecords.length}
                    </span>
                  )}
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
                        Creates a multi-step query plan, executes comprehensive web searches, and compiles an exhaustive cited intelligence memo.
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
                      <span className="text-[11px] font-mono text-ink-faint">GTM & Strategy Presets:</span>
                      {[
                        'Enterprise AI Agent Adoption: 2026 Buyer Personas, Budget Allocation & Vendor Selection',
                        'B2B GTM Outbound Playbook: Replacing Clay + Apollo with Custom Syndicate Networks',
                        'Series A-to-B SaaS Valuations, Burn Multiples & Net Revenue Retention Standards 2026',
                        'Private Founder Networks & Syndicates: Retention & Monetization Playbook (Chief, Offline, Tiger 21)',
                        'GTM Engineering & Product-Led Sales Motions for AI Developer Tools',
                      ].map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setResearchPrompt(chip)}
                          className="px-2 py-0.5 rounded text-[11px] bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
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
                      <span>{isResearching ? 'Synthesizing Intelligence...' : 'Execute Deep Research'}</span>
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
                        AI agent is executing real-time web searches, traversing primary sources, extracting full text, and synthesizing an executive report. (Typically takes 10-25 seconds).
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
                    <ExecutiveMarkdownViewer
                      content={researchReport}
                      maxHeightClass="max-h-[650px]"
                      title="Deep Synthesis Intelligence Memo"
                    />
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
                        placeholder="https://stripe.com/newsroom or https://ramp.com/blog"
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

                  {/* GTM Target Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono text-ink-faint">Company & GTM Targets:</span>
                    {[
                      { label: 'Stripe Newsroom (Product & GTM)', url: 'https://stripe.com/newsroom' },
                      { label: 'Ramp Blog (Fintech GTM Playbook)', url: 'https://ramp.com/blog' },
                      { label: 'Clay Blog (Automated GTM Outbound)', url: 'https://clay.com/blog' },
                      { label: 'Attio Blog (Next-Gen CRM Strategy)', url: 'https://attio.com/blog' },
                      { label: 'Databricks AI & Partner Co-Sell', url: 'https://www.databricks.com/blog' },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setCrawlInputUrl(preset.url)}
                        className="px-2 py-0.5 rounded text-[11px] bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
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
                      <span>{isCrawling ? 'Crawling Domain...' : 'Execute Domain Crawl'}</span>
                    </button>
                  </div>
                </div>

                {/* Crawl Results */}
                {crawlResults.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                      <div className="text-xs font-mono text-ink-muted">
                        Recursive Crawl Completed: <strong className="text-ink font-semibold">{crawlResults.length}</strong> pages mapped
                      </div>
                      <span className="text-[11px] font-mono text-signal bg-signal-soft px-2.5 py-0.5 rounded-full border border-signal/20 font-medium">
                        Structured LLM Payload
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {crawlResults.map((item, idx) => {
                        const domain = extractDomain(item.url);
                        const charCount = (item.rawContent || '').length;
                        const wordCount = (item.rawContent || '').split(/\s+/).filter(Boolean).length;

                        return (
                          <div key={idx} className="bg-surface border border-line rounded-xl p-5 space-y-3.5 hover:border-signal/40 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                              <div className="flex items-center gap-2 truncate max-w-xl">
                                <span className="text-[10px] font-mono font-bold text-ink-faint px-1.5 py-0.5 rounded bg-surface-raised border border-line">
                                  #{idx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-surface-raised border border-line text-ink">
                                  <Globe className="w-3.5 h-3.5 text-signal flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">{domain}</span>
                                </span>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-signal hover:underline flex items-center gap-1 truncate"
                                >
                                  <span className="truncate">{item.url}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-ink-muted px-2 py-0.5 rounded bg-surface-raised border border-line">
                                  {wordCount.toLocaleString()} words • {charCount.toLocaleString()} chars
                                </span>
                                <button
                                  onClick={() => {
                                    copyToClipboard(item.rawContent, 66600 + idx);
                                    setCopiedResultId(`crawl-${idx}`);
                                    setTimeout(() => setCopiedResultId(null), 2000);
                                  }}
                                  className="px-2.5 py-1 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedResultId === `crawl-${idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-signal" />
                                      <span className="text-[11px] text-signal font-medium">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-ink-muted" />
                                      <span className="text-[11px]">Copy Markdown</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Rich Executive Markdown Viewer */}
                            <ExecutiveMarkdownViewer
                              content={item.rawContent || 'No extracted content.'}
                              maxHeightClass="max-h-[380px]"
                              title={`Page ${idx + 1}: ${domain}`}
                            />
                          </div>
                        );
                      })}
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
                      placeholder="https://clay.com/pricing&#10;https://attio.com/pricing&#10;https://www.apollo.io/pricing"
                      className="w-full p-3 text-xs bg-surface-raised border border-line rounded font-mono text-ink"
                    />
                  </div>

                  {/* Batch Tearsheet Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono text-ink-faint">Batch Company Tearsheets:</span>
                    {[
                      {
                        label: 'CRM Pricing Teardown (Clay vs Attio vs Apollo)',
                        urls: 'https://clay.com/pricing\nhttps://attio.com/pricing\nhttps://www.apollo.io/pricing',
                      },
                      {
                        label: 'Fintech Corporate Card GTM (Ramp vs Brex)',
                        urls: 'https://ramp.com/corporate-card\nhttps://www.brex.com/product/spend-management',
                      },
                      {
                        label: 'AI Code Assistant Enterprise Terms (Cursor vs Cognition)',
                        urls: 'https://www.cursor.com/pricing\nhttps://www.cognition.ai/blog',
                      },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => setExtractUrlsInput(preset.urls)}
                        className="px-2 py-0.5 rounded text-[11px] bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-line">
                    <button
                      onClick={handleRunTavilyExtract}
                      disabled={isExtracting}
                      className="px-4 py-2 bg-signal text-surface rounded-lg text-xs font-semibold hover:bg-signal/90 flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                      <span>{isExtracting ? 'Extracting Content...' : 'Run Content Extraction'}</span>
                    </button>
                  </div>
                </div>

                {/* Extract Results */}
                {extractResults.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                      <div className="text-xs font-mono text-ink-muted">
                        Extraction Completed: <strong className="text-ink font-semibold">{extractResults.length}</strong> target URLs parsed
                      </div>
                      <span className="text-[11px] font-mono text-signal bg-signal-soft px-2.5 py-0.5 rounded-full border border-signal/20 font-medium">
                        Structured Clean Markdown
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {extractResults.map((item, idx) => {
                        const domain = extractDomain(item.url);
                        const charCount = (item.rawContent || '').length;

                        return (
                          <div key={idx} className="bg-surface border border-line rounded-xl p-5 space-y-3.5 hover:border-signal/40 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                              <div className="flex items-center gap-2 truncate max-w-xl">
                                <span className="text-[10px] font-mono font-bold text-ink-faint px-1.5 py-0.5 rounded bg-surface-raised border border-line">
                                  #{idx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-surface-raised border border-line text-ink">
                                  <Globe className="w-3.5 h-3.5 text-signal flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">{domain}</span>
                                </span>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-signal hover:underline flex items-center gap-1 truncate"
                                >
                                  <span className="truncate">{item.url}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>

                              <button
                                onClick={() => {
                                  copyToClipboard(item.rawContent, 88880 + idx);
                                  setCopiedResultId(`extract-${idx}`);
                                  setTimeout(() => setCopiedResultId(null), 2000);
                                }}
                                className="px-2.5 py-1 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {copiedResultId === `extract-${idx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-signal" />
                                    <span className="text-[11px] text-signal font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-ink-muted" />
                                    <span className="text-[11px]">Copy Markdown</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Rich Executive Markdown Viewer */}
                            <ExecutiveMarkdownViewer
                              content={item.rawContent || 'No extracted content.'}
                              maxHeightClass="max-h-[380px]"
                              title={`Extracted: ${domain}`}
                            />
                          </div>
                        );
                      })}
                    </div>
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
                        placeholder="e.g. Perplexity Enterprise GTM Strategy & B2B Sales Motion 2026"
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Domain Filter (Optional, comma-separated)</label>
                      <input
                        type="text"
                        value={tavilySearchDomain}
                        onChange={e => setTavilySearchDomain(e.target.value)}
                        placeholder="theinformation.com, sacra.com, techcrunch.com"
                        className="w-full h-9 px-3 text-xs bg-surface-raised border border-line rounded text-ink font-mono"
                      />
                    </div>
                  </div>

                  {/* Company & GTM Query Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-ink-faint">Company & GTM Queries:</span>
                      {[
                        'Perplexity Enterprise GTM Strategy & B2B Sales Motion 2026',
                        'Ramp vs Brex Enterprise Pricing, ICP & Channel Teardown',
                        'Q1 2026 Series A/B AI Infrastructure ARR Benchmarks & Funding',
                        'Attio vs Clay Autonomous CRM Differentiation & Enterprise Churn',
                        'Databricks Partner Co-Sell & Ecosystem Expansion Playbook',
                      ].map((query, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => setTavilySearchInput(query)}
                          className="px-2 py-0.5 rounded text-[11px] bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          {query}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-ink-faint">GTM Sources:</span>
                      {[
                        { label: 'Market & Tech Intelligence', domains: 'theinformation.com, sacra.com, techcrunch.com' },
                        { label: 'Venture & Growth Signals', domains: 'bloomberg.com, reuters.com' },
                        { label: 'Regulatory & SEC Filings', domains: 'sec.gov' },
                      ].map((source, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => setTavilySearchDomain(source.domains)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          {source.label}
                        </button>
                      ))}
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
                      <span>{isTavilySearching ? 'Searching...' : 'Run Search'}</span>
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {tavilySearchResults.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-ink-muted">
                          Verified Intelligence: <strong className="text-ink font-semibold">{tavilySearchResults.length}</strong> sources retrieved
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-signal bg-signal-soft px-2.5 py-0.5 rounded-full border border-signal/20 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Ranked by Neural Relevance
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {tavilySearchResults.map((result, idx) => {
                        const domain = extractDomain(result.url);
                        const matchPct = result.score ? Math.round(result.score * 100) : null;
                        const isHighMatch = matchPct ? matchPct >= 85 : false;

                        return (
                          <div
                            key={idx}
                            className="bg-surface border border-line rounded-xl p-5 space-y-3.5 hover:border-signal/50 hover:shadow-md transition-all duration-200 group"
                          >
                            {/* Header row: Source Badge, Domain, Relevance Score, Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-ink-faint px-1.5 py-0.5 rounded bg-surface-raised border border-line">
                                  #{idx + 1}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-surface-raised border border-line text-ink">
                                  <Globe className="w-3.5 h-3.5 text-signal flex-shrink-0" />
                                  <span className="truncate max-w-[220px]">{domain}</span>
                                </span>

                                {matchPct !== null && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
                                      isHighMatch
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>{matchPct}% Relevancy</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    copyToClipboard(result.url, 77700 + idx);
                                    setCopiedResultId(`url-${idx}`);
                                    setTimeout(() => setCopiedResultId(null), 2000);
                                  }}
                                  title="Copy URL"
                                  className="px-2.5 py-1 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedResultId === `url-${idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-signal" />
                                      <span className="text-[11px] text-signal font-medium">Copied Link</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="text-[11px]">Copy Link</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    copyToClipboard(cleanWebSnippet(result.content, 1000), 77800 + idx);
                                    setCopiedResultId(`snippet-${idx}`);
                                    setTimeout(() => setCopiedResultId(null), 2000);
                                  }}
                                  title="Copy Excerpt"
                                  className="px-2.5 py-1 text-xs bg-surface-raised border border-line hover:border-signal/50 text-ink-muted hover:text-ink rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedResultId === `snippet-${idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-signal" />
                                      <span className="text-[11px] text-signal font-medium">Copied Text</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-3 h-3" />
                                      <span className="text-[11px]">Copy Excerpt</span>
                                    </>
                                  )}
                                </button>

                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-ink-muted hover:text-signal hover:bg-signal-soft/30 rounded-md transition-colors"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>

                            {/* Title Link */}
                            <div>
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm sm:text-base font-semibold text-ink hover:text-signal transition-colors group-hover:text-signal flex items-center gap-1.5 leading-snug"
                              >
                                <span>{result.title || domain}</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-signal flex-shrink-0" />
                              </a>
                            </div>

                            {/* Rich Executive Markdown Viewer */}
                            <ExecutiveMarkdownViewer
                              content={result.content || 'No content snippet available.'}
                              maxHeightClass="max-h-[260px]"
                              title={`Neural Intelligence: ${domain}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 5: INTELLIGENCE AUDIT LEDGER & PERSISTENT HISTORY */}
            {intelligenceSubTab === 'history' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-signal" />
                        <h3 className="text-base font-semibold text-ink">Intelligence Audit Ledger</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-signal-soft border border-signal/20 text-signal font-semibold">
                          {intelligenceRecords.length} Persistent Records
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        All autonomous intelligence runs, deep web searches, scraped datasets, and research memos permanently recorded in Supabase PostgreSQL.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filter chips */}
                      <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-lg border border-line text-xs">
                        {(['all', 'search', 'deep_research', 'crawl', 'extract'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setIntelHistoryFilter(type)}
                            className={`px-2.5 py-1 rounded capitalize transition-colors text-xs font-medium cursor-pointer ${
                              intelHistoryFilter === type
                                ? 'bg-signal text-surface font-semibold shadow-xs'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {type === 'deep_research' ? 'Research' : type}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={fetchIntelligenceHistory}
                        disabled={loadingIntelHistory}
                        className="p-2 rounded-lg border border-line hover:bg-surface-raised text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        title="Refresh History from Database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingIntelHistory ? 'animate-spin text-signal' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* List of records */}
                  {loadingIntelHistory && intelligenceRecords.length === 0 ? (
                    <div className="py-16 text-center text-ink-muted text-sm flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-signal" />
                      <span>Syncing persistent intelligence records from Supabase...</span>
                    </div>
                  ) : filteredIntelRecords.length === 0 ? (
                    <div className="py-16 text-center text-ink-muted text-sm space-y-2">
                      <Database className="w-8 h-8 text-line mx-auto" />
                      <p className="font-medium text-ink">No intelligence records found in database.</p>
                      <p className="text-xs text-ink-faint">Run any Neural Search, Deep Research run, Site Crawl, or URL Extractor to generate persistent records.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-line/60 mt-3">
                      {filteredIntelRecords.map((rec: any) => {
                        const isSearch = rec.record_type === 'search';
                        const isResearch = rec.record_type === 'deep_research';
                        const isCrawl = rec.record_type === 'crawl';
                        const isExpanded = expandedIntelRecordId === rec.id;

                        return (
                          <div
                            key={rec.id}
                            className={`py-3.5 px-3 sm:px-4 rounded-xl border transition-all ${
                              isExpanded
                                ? 'bg-surface border-signal/40 shadow-xs'
                                : 'border-transparent hover:border-line/70 hover:bg-surface-raised/40'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                    isSearch ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                    isResearch ? 'bg-signal-soft text-signal border border-signal/20' :
                                    isCrawl ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {rec.record_type === 'deep_research' ? 'Deep Research' : rec.record_type}
                                  </span>
                                  <span className="text-[11px] font-mono text-ink-faint">
                                    {new Date(rec.created_at).toLocaleString()}
                                  </span>
                                  {rec.results_count > 0 && (
                                    <span className="text-[11px] font-mono text-signal bg-signal-soft/80 border border-signal/20 px-1.5 py-0.2 rounded font-semibold">
                                      {rec.results_count} {rec.record_type === 'crawl' ? 'pages' : 'sources'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-ink truncate">
                                  {rec.title || rec.query_or_url}
                                </p>
                                <p className="text-xs text-ink-muted font-mono truncate max-w-2xl">
                                  {rec.query_or_url}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                                {rec.content && (
                                  <button
                                    onClick={() => setExpandedIntelRecordId(isExpanded ? null : rec.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                      isExpanded
                                        ? 'bg-signal text-surface border-signal font-bold'
                                        : 'bg-surface-raised border-line hover:border-signal/50 text-ink hover:text-signal'
                                    }`}
                                  >
                                    {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    <span>{isExpanded ? 'Hide Output' : 'Inspect Output'}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRestoreIntelligenceRecord(rec)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised border border-line hover:border-signal/50 text-ink hover:text-signal transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Restore to View</span>
                                </button>
                                {rec.content && (
                                  <button
                                    onClick={() => copyToClipboard(rec.content, rec.id)}
                                    className="p-1.5 rounded-lg border border-line hover:bg-surface-raised text-ink-muted hover:text-ink transition-colors cursor-pointer"
                                    title="Copy Output"
                                  >
                                    {copiedIntroId === rec.id ? <Check className="w-3.5 h-3.5 text-signal" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteIntelligenceRecord(rec.id)}
                                  className="p-1.5 rounded-lg border border-line hover:bg-red-500/10 text-ink-muted hover:text-red-500 transition-colors cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Expandable Executive Output */}
                            {isExpanded && (
                              <div className="mt-3.5 pt-3.5 border-t border-line/70 animate-in fade-in-50 duration-150">
                                <ExecutiveMarkdownViewer
                                  content={rec.content || 'No content recorded.'}
                                  maxHeightClass="max-h-[420px]"
                                  title={`Historical Record: ${rec.title || rec.query_or_url}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
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
          <aside className="relative w-full sm:w-[480px] md:w-[520px] max-w-full border-l border-line bg-surface flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  {isEditingMember ? 'Edit Member Record' : 'Member Details'}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-line text-ink-muted">
                  #{selectedPerson.id}
                </span>
                {selectedPerson.is_duplicate_of !== null ? (
                  selectedPerson.review_status === 'merged' || mergedIds.has(selectedPerson.id) ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-line text-ink-muted inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-signal" /> Merged with #{selectedPerson.is_duplicate_of}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning-soft border border-warning/30 text-warning inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Duplicate of #{selectedPerson.is_duplicate_of}
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-signal-soft border border-signal/20 text-signal inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Canonical
                  </span>
                )}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">LinkedIn Profile URL</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={(editFormData as any).linkedin || ''}
                        onChange={e => setEditFormData({ ...editFormData, linkedin: e.target.value } as any)}
                        className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-ink-muted block mb-1">Twitter / X Handle or URL</label>
                      <input
                        type="text"
                        placeholder="@handle or https://x.com/..."
                        value={(editFormData as any).twitter || ''}
                        onChange={e => setEditFormData({ ...editFormData, twitter: e.target.value } as any)}
                        className="w-full h-8 px-2.5 text-xs bg-surface-raised border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-signal font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-muted block mb-1">Company / Personal Website</label>
                    <input
                      type="url"
                      placeholder="https://company.ai"
                      value={(editFormData as any).website || ''}
                      onChange={e => setEditFormData({ ...editFormData, website: e.target.value } as any)}
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
                  {/* Header Identity Hero */}
                  <div className="flex items-start gap-3.5 pb-2">
                    <div className="w-12 h-12 rounded-xl bg-signal/15 text-signal flex items-center justify-center font-bold text-base flex-shrink-0 shadow-2xs border border-signal/20">
                      {selectedPerson.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold tracking-tight text-ink truncate">{selectedPerson.name}</h2>
                      <div className="text-xs text-ink-muted mt-0.5 truncate">
                        {selectedPerson.role_title ? `${selectedPerson.role_title} at ` : ''}
                        <strong className="text-ink font-semibold">{selectedPerson.company || 'Independent'}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[11px] text-ink-faint truncate">
                          {selectedPerson.email_normalized || selectedPerson.email || 'No email provided'}
                        </span>
                        {(selectedPerson.email_normalized || selectedPerson.email) && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const emailToCopy = selectedPerson.email_normalized || selectedPerson.email || '';
                                navigator.clipboard.writeText(emailToCopy);
                                setCopiedEmail(true);
                                setTimeout(() => setCopiedEmail(false), 2000);
                              }}
                              className="p-1 text-ink-faint hover:text-ink hover:bg-surface-raised rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Copy email address"
                            >
                              {copiedEmail ? (
                                <Check className="w-3.5 h-3.5 text-signal animate-in zoom-in duration-150" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {copiedEmail && (
                              <span className="text-[10px] font-mono font-semibold text-signal bg-signal-soft px-1.5 py-0.5 rounded border border-signal/20 animate-in fade-in duration-150">
                                Copied!
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Social & Web Footprint Badges */}
                      {(() => {
                        const activeDossier = dossierCache[selectedPerson.id] || selectedPerson.ai_classification?.dossier;
                        const lk = selectedPerson.source_payload?.linkedin || activeDossier?.discovered_contact?.discovered_linkedin;
                        const tw = selectedPerson.source_payload?.twitter || activeDossier?.discovered_contact?.discovered_twitter;
                        const wb = selectedPerson.source_payload?.website || activeDossier?.discovered_contact?.discovered_website;

                        if (!lk && !tw && !wb) return null;

                        return (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {lk && (
                              <a
                                href={lk}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 transition-colors"
                                title="Open verified LinkedIn profile"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>LinkedIn</span>
                              </a>
                            )}
                            {tw && (
                              <a
                                href={tw.startsWith('http') ? tw : `https://x.com/${tw.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-black/5 dark:bg-white/10 text-ink hover:bg-surface-raised border border-line transition-colors"
                                title="Open verified X / Twitter profile"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>X (Twitter)</span>
                              </a>
                            )}
                            {wb && (
                              <a
                                href={wb}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-raised text-ink-muted hover:text-signal border border-line transition-colors"
                                title="Open verified website"
                              >
                                <Globe className="w-3 h-3" />
                                <span>Website</span>
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Fit Score & Reasoning */}
                  {selectedPerson.fit_score !== null && (
                    <div className="p-3.5 bg-signal-soft/40 border border-signal/30 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-signal uppercase tracking-wider">Applicant Fit Score</span>
                        <span className="text-sm font-mono font-bold px-2 py-0.5 rounded-md bg-signal text-surface shadow-2xs">
                          {selectedPerson.fit_score}/100
                        </span>
                      </div>
                      {selectedPerson.fit_score_reasoning && (
                        <p className="text-ink text-xs leading-relaxed italic opacity-90">
                          &ldquo;{selectedPerson.fit_score_reasoning}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* 360° Autonomous AI Intelligence Dossier */}
                  <div className="p-4 bg-surface-raised border border-line/80 rounded-xl space-y-3 shadow-2xs hover:border-line transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-signal-soft flex items-center justify-center text-signal flex-shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-ink truncate">Intelligence Dossier</h4>
                          <p className="text-[10px] text-ink-muted truncate">Public footprint & signals</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRunEnrichment(selectedPerson.id)}
                        disabled={isEnrichingPerson}
                        className="h-8 px-3 bg-signal hover:bg-signal/90 text-surface text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-2xs cursor-pointer flex-shrink-0"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isEnrichingPerson ? 'animate-spin' : ''}`} />
                        <span>{isEnrichingPerson ? 'Enriching...' : 'Enrich Profile'}</span>
                      </button>
                    </div>

                    {(() => {
                      const activeDossier = dossierCache[selectedPerson.id] || selectedPerson.ai_classification?.dossier;
                      if (!activeDossier) {
                        return (
                          <p className="text-xs text-ink-muted leading-relaxed pt-0.5">
                            Scrape public footprint, verified traction, and generate an autonomous executive debrief.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3 pt-1 text-xs animate-in fade-in-50 duration-200">
                          {/* Executive Summary */}
                          <div className="p-3 bg-surface rounded-lg border border-line text-xs text-ink leading-relaxed">
                            <span className="text-signal font-semibold uppercase text-[10px] tracking-wider block mb-1.5">Executive Debrief</span>
                            <p>{activeDossier.executive_summary}</p>
                          </div>

                          {/* Verified Contact Discovery & Identity Footprint */}
                          {activeDossier.discovered_contact && (
                            <div className="p-3.5 bg-surface rounded-xl border border-line space-y-3 text-xs shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-signal uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-signal" />
                                  Verified Contact & Socials Footprint
                                </span>
                                <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                                  activeDossier.discovered_contact.verification_status === 'verified'
                                    ? 'bg-signal-soft text-signal border-signal/20'
                                    : 'bg-surface-raised text-ink-muted border-line'
                                }`}>
                                  {activeDossier.discovered_contact.verification_status === 'verified' ? 'Verified Match' : 'Not Publicly Found'}
                                </span>
                              </div>

                              <p className="text-[11px] text-ink-muted leading-relaxed">
                                {activeDossier.discovered_contact.verification_notes || 'Cross-referenced against verified company and executive footprint.'}
                              </p>

                              {/* Discovered Socials & Web Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                                <div className="p-2 rounded-lg bg-surface-raised border border-line/60">
                                  <span className="text-[10px] uppercase text-ink-muted block mb-0.5">LinkedIn Profile</span>
                                  {activeDossier.discovered_contact.discovered_linkedin ? (
                                    <a
                                      href={activeDossier.discovered_contact.discovered_linkedin}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#0A66C2] hover:underline break-all truncate block"
                                    >
                                      {activeDossier.discovered_contact.discovered_linkedin.replace('https://www.linkedin.com/in/', 'in/')}
                                    </a>
                                  ) : (
                                    <span className="text-ink-faint italic font-sans text-xs">Not found</span>
                                  )}
                                </div>

                                <div className="p-2 rounded-lg bg-surface-raised border border-line/60">
                                  <span className="text-[10px] uppercase text-ink-muted block mb-0.5">Twitter / X</span>
                                  {activeDossier.discovered_contact.discovered_twitter ? (
                                    <a
                                      href={activeDossier.discovered_contact.discovered_twitter.startsWith('http') ? activeDossier.discovered_contact.discovered_twitter : `https://x.com/${activeDossier.discovered_contact.discovered_twitter.replace('@', '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-ink hover:text-signal hover:underline break-all truncate block"
                                    >
                                      {activeDossier.discovered_contact.discovered_twitter.replace('https://x.com/', '@').replace('https://twitter.com/', '@')}
                                    </a>
                                  ) : (
                                    <span className="text-ink-faint italic font-sans text-xs">Not found</span>
                                  )}
                                </div>

                                <div className="p-2 rounded-lg bg-surface-raised border border-line/60">
                                  <span className="text-[10px] uppercase text-ink-muted block mb-0.5">Company / Web</span>
                                  {activeDossier.discovered_contact.discovered_website ? (
                                    <a
                                      href={activeDossier.discovered_contact.discovered_website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-signal hover:underline break-all truncate block"
                                    >
                                      {activeDossier.discovered_contact.discovered_website.replace('https://', '').replace('http://', '')}
                                    </a>
                                  ) : (
                                    <span className="text-ink-faint italic font-sans text-xs">Not found</span>
                                  )}
                                </div>
                              </div>

                              {/* Multi-Email Deliverability & Freshness Matrix */}
                              {activeDossier.discovered_contact.candidate_emails && activeDossier.discovered_contact.candidate_emails.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-line/60">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-signal" />
                                      Email Deliverability & Freshness Verification
                                    </span>
                                    <span className="text-[10px] font-mono text-ink-faint">
                                      {activeDossier.discovered_contact.candidate_emails.length} candidates analyzed
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {activeDossier.discovered_contact.candidate_emails.map((candidate: any, cIdx: number) => {
                                      const isChosen = (selectedCandidateEmail || activeDossier.discovered_contact.discovered_email) === candidate.email;
                                      const isCurrent = (selectedPerson.email || '').toLowerCase() === candidate.email.toLowerCase();

                                      return (
                                        <div
                                          key={cIdx}
                                          onClick={() => setSelectedCandidateEmail(candidate.email)}
                                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                                            isChosen
                                              ? 'bg-signal-soft/40 border-signal shadow-2xs'
                                              : 'bg-surface-raised border-line/70 hover:border-line'
                                          }`}
                                        >
                                          <div className="flex items-start gap-2.5 min-w-0">
                                            <input
                                              type="radio"
                                              name="candidateEmailSelect"
                                              checked={isChosen}
                                              onChange={() => setSelectedCandidateEmail(candidate.email)}
                                              className="mt-0.5 text-signal focus:ring-signal"
                                            />
                                            <div className="min-w-0 space-y-0.5">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-semibold text-ink break-all select-all">
                                                  {candidate.email}
                                                </span>
                                                {candidate.is_recommended && (
                                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-signal text-surface uppercase tracking-wider">
                                                    Recommended
                                                  </span>
                                                )}
                                                {isCurrent && (
                                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-surface border border-line text-ink-muted">
                                                    Current CRM Email
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-ink-muted leading-tight">
                                                {candidate.reasoning}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1 border ${
                                              candidate.deliverable
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                            }`} title={candidate.mx_reason || ''}>
                                              {candidate.deliverable ? (
                                                <>
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                  <span>MX Active</span>
                                                </>
                                              ) : (
                                                <>
                                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                  <span>Undeliverable</span>
                                                </>
                                              )}
                                            </span>

                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface border border-line text-ink tabular-nums">
                                              {candidate.confidence}% fit
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Full-Stack Update & Sync Button */}
                              {activeDossier.discovered_contact.verification_status === 'verified' && (
                                <div className="mt-2.5 p-3 bg-signal-soft/60 border border-signal/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="min-w-0 space-y-0.5">
                                    <span className="text-xs font-semibold text-ink block">
                                      Persist Verified Contact & Socials to Database
                                    </span>
                                    <span className="text-[11px] text-ink-muted block">
                                      Full-stack syncs selected email, verified LinkedIn, X/Twitter, and website into Supabase.
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleApplyDiscoveredContact(selectedPerson.id, activeDossier.discovered_contact, selectedCandidateEmail || undefined)}
                                    disabled={isApplyingContact}
                                    className="h-8 px-3.5 bg-signal hover:bg-signal/90 text-surface text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer flex-shrink-0 disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isApplyingContact ? 'Syncing DB...' : 'Apply & Sync Profile'}</span>
                                  </button>
                                </div>
                              )}

                              {contactApplySuccess && (
                                <div className="p-2.5 bg-signal-soft text-signal text-xs rounded-lg border border-signal/30 flex items-center gap-1.5 animate-in fade-in">
                                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                  <span>{contactApplySuccess}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Traction Signals */}
                          {activeDossier.traction_signals?.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Verified Traction Signals</span>
                              <div className="space-y-1">
                                {activeDossier.traction_signals.map((sig: string, sIdx: number) => (
                                  <div key={sIdx} className="flex items-center gap-2 text-xs text-ink bg-surface px-2.5 py-1.5 rounded border border-line/60">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-signal flex-shrink-0" />
                                    <span>{sig}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tech Stack & Key Archetypes */}
                          {activeDossier.tech_stack?.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Detected Tech Stack</span>
                              <div className="flex flex-wrap gap-1.5">
                                {activeDossier.tech_stack.map((tech: string, tIdx: number) => (
                                  <span key={tIdx} className="px-2 py-0.5 rounded text-xs font-mono bg-signal-soft text-signal border border-signal/20">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Autonomous Deep Memo Card */}
                  <div className="p-4 bg-surface-raised border border-line/80 rounded-xl space-y-3 shadow-2xs hover:border-line transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-copper-soft flex items-center justify-center text-copper flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-ink truncate">Deep Intel Memo</h4>
                          <p className="text-[10px] text-ink-muted truncate">Market footprint deep-dive</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDrawerResearch(selectedPerson)}
                        disabled={drawerResearching}
                        className="h-8 px-3 bg-surface border border-line hover:border-copper/50 hover:bg-surface-muted text-ink text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-2xs cursor-pointer flex-shrink-0"
                        title="Generate autonomous executive research report"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${drawerResearching ? 'animate-spin' : ''}`} />
                        <span>{drawerResearching ? 'Synthesizing...' : 'Generate Memo'}</span>
                      </button>
                    </div>

                    {drawerResearchReport[selectedPerson.id] ? (
                      <div className="space-y-2.5 pt-1 text-xs animate-in fade-in-50 duration-200">
                        <ExecutiveMarkdownViewer
                          content={drawerResearchReport[selectedPerson.id].content}
                          maxHeightClass="max-h-72"
                          title={`Executive Dossier • ${selectedPerson.name}`}
                        />
                        {drawerResearchReport[selectedPerson.id].sources?.length > 0 && (
                          <div className="text-xs space-y-1.5">
                            <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Sources Cited:</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {drawerResearchReport[selectedPerson.id].sources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-signal hover:underline flex items-center gap-1.5 text-xs truncate"
                                >
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{src.title || src.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted leading-relaxed pt-0.5">
                        Generate an autonomous deep research memo on {selectedPerson.name} and their market footprint.
                      </p>
                    )}
                  </div>

                  {/* Bio & Operator Notes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Bio & Operator Notes</h4>
                    <div className="p-3.5 bg-surface-raised border border-line/80 rounded-xl text-xs leading-relaxed text-ink shadow-2xs">
                      {selectedPerson.bio_notes ? (
                        <p className="whitespace-pre-wrap">{selectedPerson.bio_notes}</p>
                      ) : (
                        <span className="text-ink-faint italic">No bio notes provided.</span>
                      )}
                    </div>
                  </div>

                  {/* Classification Taxonomy */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Taxonomy & Classification</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-surface-raised border border-line/80 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">Role Type</span>
                        <div className="text-xs font-semibold text-ink capitalize">
                          {selectedPerson.role_type || <span className="text-ink-faint font-normal">Unassigned</span>}
                        </div>
                      </div>
                      <div className="p-3 bg-surface-raised border border-line/80 rounded-xl shadow-2xs">
                        <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">Seniority</span>
                        <div className="text-xs font-semibold text-ink capitalize">
                          {selectedPerson.seniority || <span className="text-ink-faint font-normal">Unassigned</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sector Tags */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sector Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPerson.sector_tags && selectedPerson.sector_tags.length > 0 ? (
                        selectedPerson.sector_tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-raised text-ink border border-line shadow-2xs"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-faint italic text-xs">No sectors assigned.</span>
                      )}
                    </div>
                  </div>

                  {/* Community Fit Tags */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Community Fit Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPerson.community_fit_tags && selectedPerson.community_fit_tags.length > 0 ? (
                        selectedPerson.community_fit_tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-signal-soft text-signal border border-signal/30 shadow-2xs"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-faint italic text-xs">No fit tags.</span>
                      )}
                    </div>
                  </div>

                  {/* System Metadata */}
                  <div className="pt-3 border-t border-line space-y-1.5 text-xs text-ink-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-faint">Lead Source</span>
                      <span className="font-mono text-ink text-[11px] px-2 py-0.5 rounded bg-surface border border-line">
                        {selectedPerson.source}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-faint">Record ID</span>
                      <span className="font-mono text-ink text-[11px]">
                        {selectedPerson.source_record_id || `rec_${selectedPerson.id}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-faint">Enrichment Status</span>
                      <span className="text-[11px] font-semibold text-signal uppercase">
                        {selectedPerson.ai_enrichment_status}
                      </span>
                    </div>
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
              <div className="p-3.5 bg-surface-raised border border-line/80 rounded-xl text-ink leading-relaxed space-y-1.5">
                <div>
                  You are about to merge <strong>Duplicate #{candidateToMerge.duplicate.id}</strong> ({candidateToMerge.duplicate.name}) into <strong>Canonical Primary #{candidateToMerge.canonical.id}</strong> ({candidateToMerge.canonical.name}).
                </div>
                <div className="text-[11px] text-ink-muted flex items-center gap-1.5 flex-wrap pt-1 border-t border-line/60">
                  <span className="font-mono text-signal font-semibold">Consolidation Engine Guarantees:</span>
                  <span>• Sector tags union</span>
                  <span>• Missing bio/contact enrichment</span>
                  <span>• Max fit score preservation</span>
                  <span>• Auto-archive duplicate from active views</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Canonical Preview */}
                <div className="p-4 bg-signal-soft/20 border border-signal/30 rounded-xl space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-signal uppercase flex items-center justify-between">
                    <span>Canonical Primary (Preserved)</span>
                    <span>#{candidateToMerge.canonical.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-ink">{candidateToMerge.canonical.name}</div>
                    <div className="text-xs text-ink-muted">{candidateToMerge.canonical.role_title} at {candidateToMerge.canonical.company || 'Independent'}</div>
                    <div className="text-[11px] font-mono text-ink-muted break-all">{candidateToMerge.canonical.email || candidateToMerge.canonical.email_normalized || 'No email'}</div>
                    <div className="text-[11px] text-ink italic pt-1">&ldquo;{candidateToMerge.canonical.bio_notes || 'No bio'}&rdquo;</div>
                    {candidateToMerge.canonical.sector_tags && candidateToMerge.canonical.sector_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {candidateToMerge.canonical.sector_tags.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface text-ink-muted border border-line">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duplicate Preview */}
                <div className="p-4 bg-warning-soft/20 border border-warning/30 rounded-xl space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-warning uppercase flex items-center justify-between">
                    <span>Duplicate Candidate (Absorbed)</span>
                    <span>#{candidateToMerge.duplicate.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-ink">{candidateToMerge.duplicate.name}</div>
                    <div className="text-xs text-ink-muted">{candidateToMerge.duplicate.role_title} at {candidateToMerge.duplicate.company || 'Independent'}</div>
                    <div className="text-[11px] font-mono text-ink-muted break-all">{candidateToMerge.duplicate.email || candidateToMerge.duplicate.email_normalized || 'No email'}</div>
                    <div className="text-[11px] text-ink italic pt-1">&ldquo;{candidateToMerge.duplicate.bio_notes || 'No bio'}&rdquo;</div>
                    {candidateToMerge.duplicate.sector_tags && candidateToMerge.duplicate.sector_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {candidateToMerge.duplicate.sector_tags.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface text-ink-muted border border-line">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
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
                                Automatically query live web intelligence for deep thesis & executive summaries.
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
                          Airtable Automations, Tally, Typeform, or any webhook-based tool can stream submissions instantly into your live workspace.
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

            {/* Recipient Details & Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-ink-muted uppercase">Founder A</span>
                  <span className="text-[10px] font-mono text-signal bg-signal-soft px-1.5 py-0.2 rounded border border-signal/20">Recipient</span>
                </div>
                <div className="font-semibold text-ink text-sm">{selectedIntroForDispatch.person_a.name}</div>
                <div className="text-xs text-ink-muted">{selectedIntroForDispatch.person_a.company || 'Founder'}</div>
                <div className="text-[11px] font-mono text-ink-muted truncate">
                  {selectedIntroForDispatch.person_a.email ? (
                    <span className="text-ink font-medium">{selectedIntroForDispatch.person_a.email}</span>
                  ) : (
                    <span className="text-amber-500 italic">No email on record (fill below)</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-ink-muted uppercase">Founder B</span>
                  <span className="text-[10px] font-mono text-signal bg-signal-soft px-1.5 py-0.2 rounded border border-signal/20">Recipient</span>
                </div>
                <div className="font-semibold text-ink text-sm">{selectedIntroForDispatch.person_b.name}</div>
                <div className="text-xs text-ink-muted">{selectedIntroForDispatch.person_b.company || 'Founder'}</div>
                <div className="text-[11px] font-mono text-ink-muted truncate">
                  {selectedIntroForDispatch.person_b.email ? (
                    <span className="text-ink font-medium">{selectedIntroForDispatch.person_b.email}</span>
                  ) : (
                    <span className="text-amber-500 italic">No email on record (fill below)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Email Dispatch Fields */}
            <div className="space-y-2.5 text-xs">
              {/* To field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[11px] text-ink-muted uppercase">To (Primary Recipients)</label>
                  <span className="text-[10px] font-mono text-ink-faint">Comma-separated</span>
                </div>
                <input
                  type="text"
                  value={dispatchToEmail}
                  onChange={e => setDispatchToEmail(e.target.value)}
                  placeholder="founderA@domain.com, founderB@domain.com"
                  className="w-full h-8 px-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>

              {/* CC & BCC Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[11px] text-ink-muted block mb-1">Cc (Optional)</label>
                  <input
                    type="text"
                    value={dispatchCcEmail}
                    onChange={e => setDispatchCcEmail(e.target.value)}
                    placeholder="partner@venture.com"
                    className="w-full h-8 px-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] text-ink-muted block mb-1">Bcc (Optional)</label>
                  <input
                    type="text"
                    value={dispatchBccEmail}
                    onChange={e => setDispatchBccEmail(e.target.value)}
                    placeholder="intros@networkos.io"
                    className="w-full h-8 px-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="font-mono text-[11px] text-ink-muted block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={dispatchSubject}
                  onChange={e => setDispatchSubject(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="font-mono text-[11px] text-ink-muted block mb-1">Email Body (Double Opt-in Draft)</label>
                <textarea
                  rows={6}
                  value={dispatchBody}
                  onChange={e => setDispatchBody(e.target.value)}
                  className="w-full p-2.5 bg-surface-raised border border-line rounded text-ink font-mono text-[11px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-signal resize-y"
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
                    const fullText = `To: ${dispatchToEmail}\n${dispatchCcEmail ? `Cc: ${dispatchCcEmail}\n` : ''}${dispatchBccEmail ? `Bcc: ${dispatchBccEmail}\n` : ''}Subject: ${dispatchSubject}\n\n${dispatchBody}`;
                    copyToClipboard(fullText, selectedIntroForDispatch.id);
                  }}
                  className="min-h-[38px] px-3 text-xs bg-surface border border-line rounded-lg text-ink hover:bg-surface-muted transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Copy full email text to clipboard"
                >
                  {copiedIntroId === selectedIntroForDispatch.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-signal" />
                      <span className="text-signal font-medium">Copied Email</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-ink-muted" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>

                {/* 1. Open in Gmail */}
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(dispatchToEmail)}${dispatchCcEmail ? `&cc=${encodeURIComponent(dispatchCcEmail)}` : ''}${dispatchBccEmail ? `&bcc=${encodeURIComponent(dispatchBccEmail)}` : ''}&su=${encodeURIComponent(dispatchSubject)}&body=${encodeURIComponent(dispatchBody)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setDispatchedIntroIds(prev => new Set(prev).add(selectedIntroForDispatch.id));
                  }}
                  className="min-h-[38px] px-3.5 text-xs font-semibold bg-[#EA4335] hover:bg-[#D93025] text-white rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Open directly in Gmail web composer with To, Cc, Bcc pre-filled"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Gmail</span>
                </a>

                {/* 2. Default Desktop Client / Outlook */}
                <a
                  href={`mailto:${encodeURIComponent(dispatchToEmail)}?${[
                    dispatchCcEmail ? `cc=${encodeURIComponent(dispatchCcEmail)}` : null,
                    dispatchBccEmail ? `bcc=${encodeURIComponent(dispatchBccEmail)}` : null,
                    `subject=${encodeURIComponent(dispatchSubject)}`,
                    `body=${encodeURIComponent(dispatchBody)}`,
                  ].filter(Boolean).join('&')}`}
                  onClick={() => {
                    setDispatchedIntroIds(prev => new Set(prev).add(selectedIntroForDispatch.id));
                  }}
                  className="min-h-[38px] px-3 text-xs font-medium bg-surface-raised border border-line/80 hover:bg-surface-muted text-ink rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Open in default desktop app (Outlook, Apple Mail, etc.)"
                >
                  <Send className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Outlook / Default App</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. VIP DINNER INVITATIONS & HOST DOSSIERS DISPATCH MODAL */}
      {isDispatchModalOpen && optimizedSeatingResult && optimizedSeatingResult.tables && (() => {
        const confirmedAttendees = optimizedSeatingResult.tables.flatMap((t: any) =>
          t.seats
            .filter((s: any) => !droppedSeatIds.has(s.id))
            .map((s: any) => {
              const captainId = tableCaptains[t.tableNumber] || t.seats[0]?.id;
              const captainSeat = t.seats.find((cs: any) => cs.id === captainId) || t.seats[0];
              const isCaptain = s.id === captainId;
              const otherPeers = t.seats
                .filter((cs: any) => cs.id !== s.id && !droppedSeatIds.has(cs.id))
                .map((cs: any) => `${cs.name} (${cs.company || 'Stealth'})`);

              return {
                ...s,
                tableNumber: t.tableNumber,
                tableName: t.tableName,
                captainName: captainSeat?.name || 'Assigned Host',
                isCaptain,
                otherPeers,
                email: s.email || `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@member.offline.club`,
              };
            })
        );

        const flakedCount = droppedSeatIds.size;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-surface border border-line rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-signal/10 text-signal flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-ink">
                      VIP Dinner Invitations & Host Dossiers Dispatcher
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Confirmed seating notifications, secret door codes, and confidential host briefing sheets
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="p-1 rounded hover:bg-surface-muted text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Event Details Grid */}
                <div className="p-3.5 bg-surface-raised border border-line rounded-xl space-y-3">
                  <div className="text-[11px] font-mono font-semibold uppercase text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-signal" />
                    <span>Event Metadata & Venue Protocols</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Event Title</label>
                      <input
                        type="text"
                        value={eventDetails.eventTitle}
                        onChange={e => setEventDetails({ ...eventDetails, eventTitle: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Date</label>
                      <input
                        type="text"
                        value={eventDetails.eventDate}
                        onChange={e => setEventDetails({ ...eventDetails, eventDate: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Time</label>
                      <input
                        type="text"
                        value={eventDetails.eventTime}
                        onChange={e => setEventDetails({ ...eventDetails, eventTime: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Venue Address</label>
                      <input
                        type="text"
                        value={eventDetails.venueAddress}
                        onChange={e => setEventDetails({ ...eventDetails, venueAddress: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Secret Door Code</label>
                      <input
                        type="text"
                        value={eventDetails.venueCode}
                        onChange={e => setEventDetails({ ...eventDetails, venueCode: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-mono font-bold text-signal focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Dress Code</label>
                      <input
                        type="text"
                        value={eventDetails.dressCode}
                        onChange={e => setEventDetails({ ...eventDetails, dressCode: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-ink-muted uppercase block mb-0.5">Protocol / Notes</label>
                      <input
                        type="text"
                        value={eventDetails.notes}
                        onChange={e => setEventDetails({ ...eventDetails, notes: e.target.value })}
                        className="w-full h-7 px-2 bg-surface border border-line rounded text-xs text-ink font-medium focus:ring-1 focus:ring-signal"
                      />
                    </div>
                  </div>
                </div>

                {/* Recipient Count Pill */}
                <div className="flex items-center justify-between bg-surface-raised border border-line px-3 py-2 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-signal" />
                    <span className="text-ink font-medium">
                      Target Audience: <strong className="text-signal">{confirmedAttendees.length} Confirmed Guests</strong> across {optimizedSeatingResult.tables.length} tables
                    </span>
                  </div>
                  {flakedCount > 0 && (
                    <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded font-semibold border border-rose-500/20">
                      {flakedCount} Flakes Excluded
                    </span>
                  )}
                </div>

                {/* Segmented View Tabs */}
                <div className="flex items-center border-b border-line gap-4 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDispatchActiveTab('preview_attendees')}
                    className={`pb-2 transition-colors border-b-2 ${
                      dispatchActiveTab === 'preview_attendees'
                        ? 'border-signal text-signal font-semibold'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Attendee Invites Preview ({confirmedAttendees.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispatchActiveTab('preview_captains')}
                    className={`pb-2 transition-colors border-b-2 ${
                      dispatchActiveTab === 'preview_captains'
                        ? 'border-signal text-signal font-semibold'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Table Captain Dossiers ({optimizedSeatingResult.tables.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispatchActiveTab('audit_log')}
                    className={`pb-2 transition-colors border-b-2 ${
                      dispatchActiveTab === 'audit_log'
                        ? 'border-signal text-signal font-semibold'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Dispatch Audit & Logs {dispatchResult ? '• Completed' : ''}
                  </button>
                </div>

                {/* Tab 1: Attendee Invites Preview */}
                {dispatchActiveTab === 'preview_attendees' && (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {confirmedAttendees.map((att: any) => {
                      const subject = `Exclusive Invitation: ${eventDetails.eventTitle} — Table ${att.tableNumber} (${att.tableName})`;
                      const previewBody = `Dear ${att.name},\n\nYou are officially confirmed for the ${eventDetails.eventTitle}.\n\nEVENT DETAILS:\n- Date: ${eventDetails.eventDate} at ${eventDetails.eventTime}\n- Venue: ${eventDetails.venueAddress}\n- Secret Door Code: ${eventDetails.venueCode}\n- Dress Code: ${eventDetails.dressCode}\n- Seating: Table ${att.tableNumber} (${att.tableName}), Seat #${att.seatNumber}\n- Table Captain: ${att.captainName}${att.isCaptain ? ' (You)' : ''}\n\nDINING PEERS:\n${att.otherPeers.map((p: string) => `  • ${p}`).join('\n')}\n\nStrict Chatham House Rule. Arrive 15 minutes early for welcome drinks.\n\nWarm regards,\nAparna Pande | Offline Experiences`;

                      const isCopied = copiedInviteRecipientId === att.id;

                      return (
                        <div key={att.id} className="p-3 bg-surface-raised border border-line rounded-lg space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-ink">{att.name}</span>
                                <span className="text-[10px] text-ink-muted font-mono">({att.company || 'Stealth'})</span>
                                {att.isCaptain && (
                                  <span className="text-[9px] font-mono bg-amber-500/20 text-amber-600 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                                    Table Captain
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-ink-faint truncate">
                                To: {att.email} &bull; Table {att.tableNumber}, Seat #{att.seatNumber}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`Subject: ${subject}\n\n${previewBody}`);
                                setCopiedInviteRecipientId(att.id);
                                setTimeout(() => setCopiedInviteRecipientId(null), 2000);
                              }}
                              className="px-2 py-1 rounded bg-surface border border-line hover:border-signal/40 text-[11px] font-medium text-ink flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-signal" /> : <Copy className="w-3 h-3 text-ink-muted" />}
                              <span>{isCopied ? 'Copied' : 'Copy Email'}</span>
                            </button>
                          </div>

                          <div className="p-2 bg-surface border border-line/60 rounded text-[11px] font-mono text-ink-muted whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                            {previewBody}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Table Captain Dossiers Preview */}
                {dispatchActiveTab === 'preview_captains' && (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {optimizedSeatingResult.tables.map((table: any) => {
                      const captainId = tableCaptains[table.tableNumber] || table.seats[0]?.id;
                      const captainSeat = table.seats.find((s: any) => s.id === captainId) || table.seats[0];
                      const peers = table.seats.filter((s: any) => s.id !== captainSeat?.id && !droppedSeatIds.has(s.id));

                      return (
                        <div key={table.tableNumber} className="p-3 bg-surface-raised border border-line rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                <span>Table {table.tableNumber}: {table.tableName}</span>
                              </div>
                              <div className="text-[10px] font-mono text-ink-muted">
                                Captain: <strong className="text-ink">{captainSeat?.name}</strong> ({captainSeat?.company || 'Stealth'}) &bull; {peers.length} Dining Peers
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenHostDossier(table)}
                              className="px-2 py-1 rounded bg-copper/10 hover:bg-copper/20 text-copper border border-copper/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Award className="w-3 h-3" />
                              <span>Full Dossier View</span>
                            </button>
                          </div>

                          {table.conversationCard && (
                            <div className="p-2 bg-surface border-l-2 border-copper rounded-r text-[11px] italic font-serif text-ink leading-relaxed">
                              &ldquo;{table.conversationCard.icebreakerPrompt}&rdquo;
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 3: Dispatch Engine & Audit Log */}
                {dispatchActiveTab === 'audit_log' && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-surface-raised border border-line rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-ink">Choose Execution Delivery Method</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'simulate', title: 'Simulated Preview', desc: 'Zero dependencies. Generates audit preview.' },
                          { id: 'resend', title: 'Resend API (Live)', desc: 'Sends via server-side RESEND_API_KEY.' },
                          { id: 'n8n_webhook', title: 'n8n Webhook', desc: 'Triggers event workflow in n8n.' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setDispatchMethod(m.id as any)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              dispatchMethod === m.id
                                ? 'bg-signal-soft border-signal text-signal font-semibold shadow-xs'
                                : 'bg-surface border-line hover:border-line-strong text-ink'
                            }`}
                          >
                            <div className="text-xs font-semibold">{m.title}</div>
                            <div className="text-[10px] text-ink-muted">{m.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Founder Safety Guard Banner */}
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Strict Founder Safety Guard (Test Protocol)</span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Real community founders are <strong>never</strong> messaged or emailed during testing. Live delivery via Resend sandbox is strictly routed to the operator&apos;s authorized test address.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[10px] font-mono text-ink-muted uppercase shrink-0">Test Recipient:</label>
                          <input
                            type="email"
                            value={eventDetails.testRecipientEmail}
                            onChange={e => setEventDetails({ ...eventDetails, testRecipientEmail: e.target.value })}
                            className="h-7 px-2 bg-surface border border-line rounded text-xs font-mono text-ink max-w-xs focus:ring-1 focus:ring-signal"
                            placeholder="moviesf14@gmail.com"
                          />
                        </div>
                      </div>
                    </div>

                    {dispatchResult && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Dispatch Execution Completed</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-ink-muted">
                          <div>Method: <strong className="text-ink">{dispatchResult.dispatchMethod}</strong></div>
                          <div>Total Invites: <strong className="text-ink">{dispatchResult.totalAttendees}</strong></div>
                          <div>Host Dossiers: <strong className="text-ink">{dispatchResult.totalCaptains}</strong></div>
                          <div>Live Delivered: <strong className="text-signal">{dispatchResult.liveSentCount}</strong></div>
                        </div>

                        {dispatchResult.resendDeliveryDetails && (
                          <div className="p-2.5 bg-surface border border-line rounded font-mono text-[10px] space-y-1">
                            <div className="text-ink font-semibold flex items-center gap-1">
                              <span>Resend Delivery Receipt:</span>
                              <span className="text-emerald-500 font-bold">{dispatchResult.resendDeliveryDetails.status}</span>
                            </div>
                            {dispatchResult.resendDeliveryDetails.id && (
                              <div className="text-ink-muted">
                                Delivery ID: <strong className="text-ink">{dispatchResult.resendDeliveryDetails.id}</strong>
                              </div>
                            )}
                            {dispatchResult.resendDeliveryDetails.recipient && (
                              <div className="text-ink-muted">
                                Sent To: <strong className="text-ink">{dispatchResult.resendDeliveryDetails.recipient}</strong> (Sample guest: {dispatchResult.resendDeliveryDetails.intendedRecipient})
                              </div>
                            )}
                            {dispatchResult.resendDeliveryDetails.error && (
                              <div className="text-rose-500 font-semibold">
                                Notice: {dispatchResult.resendDeliveryDetails.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-line flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised text-ink text-xs font-medium cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[11px] font-mono text-signal bg-signal-soft/90 border border-signal/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                    <span>Founder Safety Lock: Mock / Safe Sandbox Only</span>
                  </span>

                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={() => handleDispatchVIPInvites()}
                    className="px-4 py-1.5 rounded-lg bg-signal text-surface text-xs font-semibold hover:bg-signal/90 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isDispatching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch {confirmedAttendees.length} VIP Invites ({dispatchMethod})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. CONFIDENTIAL TABLE CAPTAIN HOST DOSSIER MODAL */}
      {isHostDossierModalOpen && activeDossierTable && (() => {
        const captainId = tableCaptains[activeDossierTable.tableNumber] || activeDossierTable.seats[0]?.id;
        const captainSeat = activeDossierTable.seats.find((s: any) => s.id === captainId) || activeDossierTable.seats[0];
        const peers = activeDossierTable.seats.filter((s: any) => s.id !== captainSeat?.id && !droppedSeatIds.has(s.id));

        const dossierMarkdown = `# CONFIDENTIAL TABLE CAPTAIN BRIEFING
Host: ${captainSeat?.name} (${captainSeat?.company || 'Stealth'})
Event: ${eventDetails.eventTitle} (${eventDetails.eventDate} at ${eventDetails.eventTime})
Table: #${activeDossierTable.tableNumber} — "${activeDossierTable.tableName}"

DEAR ${captainSeat?.name?.toUpperCase()},
Thank you for anchoring Table ${activeDossierTable.tableNumber}. Your role is not to speak most, but to facilitate high-vulnerability, off-the-record discourse and draw out quiet brilliance.

UNIFYING DISCUSSION SPARK:
${activeDossierTable.conversationCard?.unifyingTopic || 'Curated peer cohort exploring cross-sector scaling bottlenecks and executive decision-making.'}

PROVOCATIVE CURATOR ICEBREAKER:
"${activeDossierTable.conversationCard?.icebreakerPrompt || 'What is the single hardest decision you made in the last quarter that you would make differently today?'}"

HOST RULES:
1. Enforce strict Chatham House Rule: nothing said leaves this table.
2. If someone starts pitching their company, gently steer them back to operational realities.
3. If anyone is quiet for more than 15 minutes, invite their perspective on the current topic.

PEER DOSSIER CHEAT-SHEET:
${peers.map((p: any) => `• ${p.name} (${p.roleTitle || 'Founder'} at ${p.company || 'Stealth'})
  Sectors: ${(p.sectorTags || []).join(', ') || 'N/A'}
  Background: ${p.bioNotes || 'High-conviction tech builder'}`).join('\n\n')}

Warmly,
Aparna Pande`;

        const isCopied = copiedDossierNum === activeDossierTable.tableNumber;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-surface border border-line rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-ink">
                      Confidential Table Captain Briefing Sheet
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Table #{activeDossierTable.tableNumber} &bull; Host: <strong className="text-ink">{captainSeat?.name}</strong> ({captainSeat?.company || 'Stealth'})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHostDossierModalOpen(false)}
                  className="p-1 rounded hover:bg-surface-muted text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Host Facilitation Guidelines */}
                <div className="p-3 bg-surface-raised border border-line rounded-lg space-y-1.5">
                  <div className="text-[11px] font-mono font-semibold uppercase text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                    <span>Host Facilitation Protocol</span>
                  </div>
                  <ul className="space-y-1 text-ink-muted text-[11px] leading-relaxed">
                    <li>&bull; <strong className="text-ink">Chatham House Rule:</strong> Complete confidentiality. No names attributed outside this table.</li>
                    <li>&bull; <strong className="text-ink">No Sales Pitches:</strong> If discourse becomes promotional, steer focus to real operational bottlenecks.</li>
                    <li>&bull; <strong className="text-ink">Draw Out Quiet Brilliance:</strong> Bring in quieter founders with direct perspective inquiries.</li>
                  </ul>
                </div>

                {/* Curator Icebreaker */}
                {activeDossierTable.conversationCard && (
                  <div className="p-3.5 bg-surface border-l-2 border-copper rounded-r space-y-1.5">
                    <div className="text-[10px] font-mono font-semibold uppercase text-copper">
                      Provocative Curator Icebreaker (Host Prompt)
                    </div>
                    <div className="text-xs italic font-serif text-ink leading-relaxed">
                      &ldquo;{activeDossierTable.conversationCard.icebreakerPrompt}&rdquo;
                    </div>
                  </div>
                )}

                {/* Peer Dossiers */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-semibold uppercase text-ink flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-signal" />
                    <span>Confidential Peer Cheat-Sheet ({peers.length} Dining Peers)</span>
                  </div>

                  <div className="space-y-2">
                    {peers.map((peer: any) => (
                      <div key={peer.id} className="p-3 bg-surface-raised border border-line rounded-lg space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-ink text-xs">
                            {peer.name} &bull; <span className="text-ink-muted font-normal">{peer.roleTitle || 'Founder'} at {peer.company || 'Stealth'}</span>
                          </div>
                          {peer.seniority && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface border border-line text-ink-muted">
                              {peer.seniority}
                            </span>
                          )}
                        </div>
                        {peer.bioNotes && (
                          <p className="text-[11px] text-ink-muted leading-relaxed">
                            {peer.bioNotes}
                          </p>
                        )}
                        {peer.sectorTags && peer.sectorTags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {peer.sectorTags.map((t: string) => (
                              <span key={t} className="text-[8px] font-mono px-1 py-0.1 rounded bg-surface border border-line text-ink-muted">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-line flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHostDossierModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-raised text-ink text-xs font-medium cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(dossierMarkdown);
                    setCopiedDossierNum(activeDossierTable.tableNumber);
                    setTimeout(() => setCopiedDossierNum(null), 2000);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-signal text-surface text-xs font-semibold hover:bg-signal/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Dossier Copied!' : 'Copy Dossier Markdown'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. FLAKE HOT-SWAP REPLACEMENT SELECTOR MODAL */}
      {hotSwapTarget && optimizedSeatingResult && (() => {
        const targetTable = optimizedSeatingResult.tables.find((t: any) => t.tableNumber === hotSwapTarget.tableNumber);
        const allSeatedIds = new Set(
          optimizedSeatingResult.tables.flatMap((t: any) =>
            t.seats.filter((s: any) => s.id !== hotSwapTarget.seatId && !droppedSeatIds.has(s.id)).map((s: any) => s.id)
          )
        );

        const candidates = people.filter(p => !allSeatedIds.has(p.id) && p.id !== hotSwapTarget.seatId);
        const filteredCandidates = candidates.filter(c => {
          if (!hotSwapSearchQuery.trim()) return true;
          const q = hotSwapSearchQuery.toLowerCase().trim();
          return (
            (c.name || '').toLowerCase().includes(q) ||
            (c.company || '').toLowerCase().includes(q) ||
            (c.role_title || '').toLowerCase().includes(q) ||
            (c.bio_notes || '').toLowerCase().includes(q)
          );
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-surface border border-line rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
              {/* Header */}
              <div className="p-4 border-b border-line flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-signal/10 text-signal flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Hot-Swap Seat #{hotSwapTarget.seatNumber} at Table {hotSwapTarget.tableNumber}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Select an available alternate founder. Instant conflict checking active.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHotSwapTarget(null)}
                  className="p-1 rounded hover:bg-surface-muted text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-line bg-surface-raised">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hotSwapSearchQuery}
                    onChange={e => setHotSwapSearchQuery(e.target.value)}
                    placeholder="Search alternate founders or company..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-surface border border-line rounded-lg text-ink focus:ring-1 focus:ring-signal focus:outline-none"
                  />
                </div>
              </div>

              {/* Candidate List */}
              <div className="p-3 overflow-y-auto space-y-2 max-h-80 text-xs">
                {filteredCandidates.length === 0 ? (
                  <div className="p-6 text-center text-ink-muted text-xs">
                    No unseated candidates found matching &ldquo;{hotSwapSearchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredCandidates.map(c => {
                    // Check competitor clash with other diners at this table
                    const conflictWith = targetTable?.seats.find((s: any) =>
                      s.id !== hotSwapTarget.seatId &&
                      !droppedSeatIds.has(s.id) &&
                      s.company &&
                      c.company &&
                      s.company.toLowerCase().trim() === c.company.toLowerCase().trim()
                    );

                    return (
                      <div
                        key={c.id}
                        className={`p-3 border rounded-lg flex items-center justify-between gap-3 transition-all ${
                          conflictWith
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-surface-raised border-line hover:border-signal/40'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-ink">{c.name}</span>
                            <span className="text-[11px] text-ink-muted font-medium truncate">
                              &bull; {c.role_title || 'Founder'} at <strong className="text-ink">{c.company || 'Stealth'}</strong>
                            </span>
                          </div>

                          {conflictWith ? (
                            <div className="text-[10px] font-mono text-rose-500 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Direct Conflict with {conflictWith.name} ({conflictWith.company})</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Conflict-Free Replacement</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExecuteHotSwap(hotSwapTarget.tableNumber, hotSwapTarget.seatId, c)}
                          className="px-3 py-1.5 rounded-lg bg-signal text-surface text-xs font-semibold hover:bg-signal/90 transition-all shrink-0 cursor-pointer shadow-xs"
                        >
                          Seat Guest
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-line flex items-center justify-between shrink-0">
                <span className="text-[11px] font-mono text-ink-muted">
                  {filteredCandidates.length} standby candidates available
                </span>
                <button
                  type="button"
                  onClick={() => setHotSwapTarget(null)}
                  className="px-3 py-1 rounded-lg border border-line text-xs font-medium text-ink hover:bg-surface-raised cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
