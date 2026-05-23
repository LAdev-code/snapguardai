"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import AppTutorial, { type AppTutorialHandle } from '../components/AppTutorial';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../../lib/supabaseBrowserClient';
import { getSupabaseAuthHeaders } from '../../lib/authHeaders';
import { fileToDataUrl, pdfPageToImageDataUrl, recognizeImageText, stripDataUrlPrefix } from '../../lib/fileHelpers';

type ReceiptResult = {
  documentType?: string | null;
  merchant?: string | null;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  transactionDate?: string | null;
  currency?: string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  amountDue?: number | string | null;
  tax?: number | string | null;
  category?: string | null;
  paymentMethod?: string | null;
  projectName?: string | null;
  purchaseOrderNumber?: string | null;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
  confidence?: number | string | null;
  summary?: string | null;
};

type SavedReceipt = {
  id: number;
  created_at: string;
  merchant: string | null;
  total_amount: number | string | null;
  currency: string | null;
  category: string | null;
  transaction_date: string | null;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
};

type CategoryBreakdown = { label: string; value: number; color: string };
type HistoryFilter = 'all' | 'food' | 'transport' | 'shopping' | 'bills' | 'utilities' | 'other';

const CHART_COLORS = ['#7dd3fc', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#38bdf8'];
const DOCUMENT_TYPES = [
  'Auto detect',
  'Receipt',
  'Invoice',
  'Business invoice',
  'Engineering invoice',
];

const CATEGORY_RULES: Array<{ label: string; keywords: string[] }> = [
  { label: 'Food', keywords: ['food', 'meal', 'restaurant', 'cafe', 'coffee', 'grocery', 'groceries', 'market', 'bakery'] },
  { label: 'Transport', keywords: ['transport', 'fuel', 'petrol', 'parking', 'taxi', 'grab', 'toll', 'lrt', 'mrt', 'bus', 'ride'] },
  { label: 'Bills', keywords: ['bill', 'invoice', 'rent', 'utility', 'utilities', 'water', 'electric', 'electricity', 'internet', 'phone', 'subscription'] },
  { label: 'Engineering', keywords: ['engineering', 'construction', 'site', 'labour', 'labor', 'material', 'materials', 'concrete', 'steel', 'supply'] },
  { label: 'Services', keywords: ['service', 'services', 'consulting', 'maintenance', 'repair', 'professional', 'support', 'installation'] },
  { label: 'Business', keywords: ['business', 'office', 'corporate', 'project', 'client', 'vendor', 'purchase order', 'po'] },
  { label: 'Shopping', keywords: ['shopping', 'retail', 'mall', 'boutique', 'store', 'supermarket', 'marketplace'] },
  { label: 'Health', keywords: ['health', 'clinic', 'pharmacy', 'medical', 'hospital', 'medicine'] },
  { label: 'Education', keywords: ['education', 'school', 'college', 'university', 'tuition', 'training'] },
  { label: 'Entertainment', keywords: ['entertainment', 'movie', 'cinema', 'subscription', 'game', 'concert'] },
];

const FALLBACK_BREAKDOWN: CategoryBreakdown[] = [
  { label: 'Food', value: 38, color: CHART_COLORS[0] },
  { label: 'Transport', value: 26, color: CHART_COLORS[1] },
  { label: 'Shopping', value: 20, color: CHART_COLORS[2] },
  { label: 'Bills', value: 16, color: CHART_COLORS[3] },
];

function formatMoneyValue(currency: string | null | undefined, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return `${currency ?? ''} ${value}`.trim();
}

function normalizeCategory(category: string | null | undefined) {
  return (category ?? 'Other').toLowerCase();
}

function inferCategoryFromText(text: string, documentType?: string | null) {
  const normalized = text.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.label;
    }
  }

  if ((documentType ?? '').toLowerCase().includes('engineering')) return 'Engineering';
  if ((documentType ?? '').toLowerCase().includes('business')) return 'Business';
  if ((documentType ?? '').toLowerCase().includes('invoice')) return 'Services';

  return 'Other';
}

function buildInvoiceBreakdown(result: ReceiptResult | null): CategoryBreakdown[] {
  if (!result) return FALLBACK_BREAKDOWN;

  const buckets = new Map<string, number>();
  const items = result.items ?? [];
  const itemValues = items.map((item) => {
    const quantity = Number(item.quantity ?? 1) || 1;
    const price = Number(item.price ?? 0) || 0;
    const amount = price > 0 ? price * quantity : 1;
    return {
      label: inferCategoryFromText(item.name ?? '', result.documentType),
      amount,
    };
  });

  if (itemValues.length > 0) {
    itemValues.forEach(({ label, amount }) => {
      buckets.set(label, (buckets.get(label) ?? 0) + amount);
    });
  } else {
    const label = inferCategoryFromText([
      result.documentType,
      result.category,
      result.merchant,
      result.vendorName,
      result.projectName,
      result.invoiceNumber,
      result.purchaseOrderNumber,
    ].filter(Boolean).join(' '), result.documentType);

    buckets.set(label === 'Other' ? (result.category ?? 'Other') : label, Number(result.amountDue ?? result.total ?? result.subtotal ?? 1) || 1);
  }

  const entries = Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const total = entries.reduce((sum, [, amount]) => sum + amount, 0) || 1;

  return entries.map(([label, amount], index) => ({
    label,
    value: Math.max(1, Math.round((amount / total) * 100)),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

export default function SnapsortForm() {
  const tutorialRef = useRef<AppTutorialHandle>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [status, setStatus] = useState('Drop a receipt image, or tap to pick a file.');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processingStep, setProcessingStep] = useState('Waiting for upload');
  const [documentType, setDocumentType] = useState('Auto detect');
  const [history, setHistory] = useState<SavedReceipt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyCategory, setHistoryCategory] = useState<HistoryFilter>('all');
  const searchParams = useSearchParams();
  const trialMode = searchParams.get('trial') === '1';
  const [trialUsed, setTrialUsed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (trialMode && typeof window !== 'undefined') {
      setTrialUsed(localStorage.getItem('snapguard_trial_used') === 'true');
    }
  }, [trialMode]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('receipts_data')
        .select('id, created_at, merchant, total_amount, currency, category, transaction_date, items')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data as SavedReceipt[]);
      }
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesQuery = !query
        || [entry.merchant, entry.category, String(entry.total_amount ?? '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = historyCategory === 'all' || normalizeCategory(entry.category).includes(historyCategory);
      return matchesQuery && matchesCategory;
    });
  }, [history, historyCategory, historyQuery]);

  const invoiceTypeLabel = result?.documentType ?? documentType;
  const breakdown = useMemo(() => buildInvoiceBreakdown(result), [result]);
  const insight = result?.summary ?? 'You spent more in one category than the rest this week. Receipt and invoice data is automatically synced to Money Coach.';

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setSaved(false);
    if (nextFile) {
      setStatus(`Loaded ${nextFile.name}. Ready to analyze.`);
    }
  }

  async function saveReceiptToDashboard(parsed: ReceiptResult | null) {
    if (trialMode) return;
    if (!parsed) return;

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData.user?.id ?? null;

      await supabase.from('receipts_data').insert([{
        user_id: userId,
        source_file_name: file?.name ?? null,
        source_text: notes.trim() || null,
        merchant: parsed.merchant ?? null,
        transaction_date: parsed.transactionDate ?? null,
        currency: parsed.currency ?? null,
        total_amount: parsed.total ?? null,
        tax_amount: parsed.tax ?? null,
        category: parsed.category ?? null,
        payment_method: parsed.paymentMethod ?? null,
        items: parsed.items ?? [],
        confidence: parsed.confidence ?? null,
        summary: parsed.summary ?? null,
        analysis_payload: parsed ?? {},
      }]);

      setSaved(true);
    } catch {
    }
  }

  async function handleAnalyze() {
    if (!file && !notes.trim()) {
      setStatus('Add a receipt image or some receipt text first.');
      return;
    }

    setLoading(true);
    setSaving(false);
    setProcessingStep('Extracting receipt text...');
    setStatus('Analyzing receipt...');

    try {
      let textPayload = notes.trim();

      if (file) {
        if (file.type === 'application/pdf') {
          setProcessingStep('Rendering PDF pages...');
          const dataUrl = await pdfPageToImageDataUrl(file);
          textPayload = await recognizeImageText(stripDataUrlPrefix(dataUrl));
        } else {
          setProcessingStep('Running OCR on receipt image...');
          const dataUrl = await fileToDataUrl(file);
          textPayload = await recognizeImageText(stripDataUrlPrefix(dataUrl));
        }
      }

      if (!textPayload.trim()) {
        throw new Error('No text could be read from the receipt image.');
      }

      setProcessingStep('Analyzing receipt data...');

      const authHeaders = await getSupabaseAuthHeaders();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }

      const response = await fetch('/api/snapsort', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: textPayload, documentType, trialMode }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429) {
          const retry = response.headers.get('Retry-After');
          setStatus(`Rate limit reached. Try again${retry ? ` in ${retry} seconds` : ' later'}.`);
          setLoading(false);
          return;
        }
        throw new Error(data?.error ?? 'Receipt analysis failed');
      }

      const parsed = data?.parsed ?? null;
      setResult(parsed);

      // Auto-save to receipts_data so MoneyCoach picks it up
      await saveReceiptToDashboard(parsed);

      if (trialMode && typeof window !== 'undefined') {
        localStorage.setItem('snapguard_trial_used', 'true');
        setTrialUsed(true);
      }
      setProcessingStep('Saved to dashboard.');
      setStatus('Receipt analyzed and saved. Check Money Coach for your spending overview.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to process receipt.');
    } finally {
      setLoading(false);
    }
  }

  function openScamShield() {
    window.location.href = '/scamshield';
  }

  function openMoneyCoach() {
    window.location.href = '/moneycoach';
  }

  return (
    <AuthGuard allowAnonymous={trialMode}>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(36,160,219,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_24%),linear-gradient(180deg,#07111f_0%,#0b1d34_52%,#08111d_100%)] text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/70">SnapSortAI</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Turn receipts and invoices into organized spending records.</h1>
            <p className="mt-3 text-sm text-slate-300">Use SnapSortAI for normal receipts, business invoices, and engineering invoices. We extract the full document, save it to Supabase, and sync the totals to Money Coach.</p>
            {trialMode ? (
              trialUsed ? (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4">
                  <p className="text-sm font-semibold text-amber-100">Trial used</p>
                  <p className="mt-1 text-sm text-amber-200/80">You've used your free trial. <Link href="/login" className="underline hover:text-amber-100">Sign in</Link> or <Link href="/register" className="underline hover:text-amber-100">create an account</Link> to keep using SnapSortAI.</p>
                </div>
              ) : (
                <p className="mt-3 inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100">Trial mode — 1 scan remaining</p>
              )
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/scamshield" className="inline-flex items-center rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20">
                Check scam risk
              </Link>
              <Link href="/moneycoach" className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20">
                Open Money Coach
              </Link>
              <button
                onClick={() => tutorialRef.current?.restart()}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Tutorial
              </button>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
            <Card className="border border-white/10 bg-slate-950/70 p-0 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
                  Secure AI Processing
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-white">Analyzing Receipt</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">Gemini 2.5 Flash is reading line items, totals, tax, invoice numbers, and business details with a glacier-style trust banner.</p>
              </div>
              <div className="space-y-6 px-6 py-6">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    selectFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                  className={`snapsort-upload rounded-3xl border border-dashed p-6 text-sm transition ${dragging ? 'border-sky-300 bg-sky-400/15' : 'border-white/15 bg-white/5'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">Drop receipt or invoice here</p>
                      <p className="mt-1 text-slate-300">PNG, JPG, WEBP, or PDF. Business and engineering invoices are supported.</p>
                    </div>
                    <div className="rounded-2xl bg-sky-400/15 px-4 py-2 text-sky-100">Tap to open picker</div>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,.pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                  />
                </div>

                {previewUrl ? (
                  file?.type === 'application/pdf' ? (
                    <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                      <div className="text-center">
                        <span className="text-4xl">📄</span>
                        <p className="mt-2 text-sm text-white/60">{file?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Receipt preview" className="h-56 w-full rounded-2xl object-cover" />
                  )
                ) : null}

                {loading ? (
                  <div className="rounded-[1.75rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(45,212,191,0.12),rgba(56,189,248,0.12))] p-6 shadow-[0_20px_50px_rgba(8,15,28,0.45)]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-200/25 border-t-cyan-200" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/70">Secure AI Processing</p>
                        <p className="mt-1 text-2xl font-semibold text-white">Analyzing Receipt</p>
                        <p className="mt-1 text-sm text-slate-200">{processingStep}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                      <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
                    </div>
                  </div>
                ) : null}

                <label className="snapsort-doc-type block">
                  <span className="mb-2 block text-sm text-slate-200">Document type</span>
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300"
                    style={{ colorScheme: 'dark' }}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-slate-950 text-white">
                        {type}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-slate-400">Auto detect routes simple receipts to the fast model and business or engineering invoices to the same secure parser with richer invoice extraction.</p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-200">OCR text or notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Add notes about the purchase or paste additional receipt text."
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                <Button onClick={handleAnalyze} disabled={loading || (trialMode && trialUsed)}>
                  {loading ? 'Analyzing...' : trialMode && trialUsed ? 'Trial used' : 'Analyze receipt'}
                </Button>
                  <Button variant="secondary" onClick={() => {
                    setFile(null);
                    setNotes('');
                    setResult(null);
                    setSaved(false);
                    setStatus('Cleared.');
                  }}>
                    Reset
                  </Button>
                  <Button variant="secondary" onClick={openScamShield}>Check scam risk</Button>
                  <Button variant="secondary" onClick={openMoneyCoach}>Open Money Coach</Button>
                </div>

                <p className={`text-sm ${saving ? 'text-emerald-300' : 'text-white/60'}`}>{status}</p>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="snapsort-preview border border-white/10 bg-slate-950/65 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-100/70">Invoice preview</p>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">{result ? 'Ready' : 'Awaiting scan'}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-200">
                  <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Document type:</span> {invoiceTypeLabel}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Merchant / vendor:</span> {result?.vendorName ?? result?.merchant ?? 'Waiting for scan'}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Date:</span> {result?.transactionDate ?? '—'}</div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Due date:</span> {result?.dueDate ?? '—'}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Subtotal:</span> {formatMoneyValue(result?.currency, result?.subtotal ?? null)}</div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Tax:</span> {formatMoneyValue(result?.currency, result?.tax ?? null)}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Total / amount due:</span> {formatMoneyValue(result?.currency, result?.amountDue ?? result?.total ?? null)}</div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Confidence:</span> {result?.confidence ?? '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Category:</span> {result?.category ?? '—'}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Invoice / PO:</span> {result?.invoiceNumber ?? result?.purchaseOrderNumber ?? '—'}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3"><span className="text-slate-400">Project:</span> {result?.projectName ?? '—'}</div>
                </div>
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-100/70">Line items</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-200">
                    {(result?.items?.length ?? 0) > 0 ? result?.items?.map((item, index) => (
                      <div key={`${item?.name ?? 'item'}-${index}`} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                        <span className="truncate pr-3">{item?.name ?? 'Item'}</span>
                        <span className="shrink-0 text-slate-300">{item?.quantity ?? 1} x {item?.price ?? '—'}</span>
                      </div>
                    )) : <p className="text-slate-400">The extracted line items will appear here immediately after analysis.</p>}
                  </div>
                </div>
              </Card>

              <Card className="border border-white/10 bg-slate-950/65 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Category chart</p>
                <div className="mt-4 flex items-center gap-6">
                  <div className="relative h-40 w-40 rounded-full" style={{
                    background: breakdown.length > 0
                      ? `conic-gradient(${breakdown.map((b, i) => {
                          const start = breakdown.slice(0, i).reduce((s, c) => s + c.value, 0);
                          return `${b.color} ${start}% ${start + b.value}%`;
                        }).join(', ')})`
                      : 'none',
                  }}>
                    <div className="absolute inset-6 rounded-full bg-slate-950/90" />
                  </div>
                  <div className="flex-1 space-y-3 text-sm text-white/75">
                    {breakdown.map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.label}
                        </span>
                        <span>{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  {(result?.items?.length ?? 0) > 0 ? result?.items?.map((item, index) => (
                    <div key={`${item?.name ?? 'item'}-${index}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                      <span>{item?.name ?? 'Item'}</span>
                      <span>{item?.quantity ?? 1} x {item?.price ?? '—'}</span>
                    </div>
                  )) : <p className="text-white/45">The extracted items will appear here.</p>}
                </div>
              </Card>

              <Card className="border border-cyan-300/20 bg-cyan-300/10">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/75">AI insight</p>
                <p className="mt-3 text-sm leading-7 text-white">{insight}</p>
              </Card>

              <Card className="border border-white/10 bg-slate-950/65 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recent scans</p>
                  <a href="/snapsort/history" className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">View all ({history.length})</a>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/75 max-h-72 overflow-y-auto">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 py-3 text-white/60">
                      <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
                      <span>Loading history...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <p className="py-3 text-white/45">No past scans yet. Analyse your first receipt above.</p>
                  ) : (
                    history.slice(0, 3).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setResult({
                            merchant: entry.merchant,
                            total: entry.total_amount,
                            currency: entry.currency,
                            category: entry.category,
                            transactionDate: entry.transaction_date,
                            items: entry.items ?? [],
                          });
                          setStatus(`Loaded ${entry.merchant ?? 'receipt'} from history.`);
                        }}
                        className="w-full rounded-2xl bg-black/20 px-4 py-3 text-left transition hover:bg-black/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{entry.merchant ?? 'Unknown merchant'}</span>
                          <span>{entry.currency ?? ''} {entry.total_amount ?? '—'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-white/45">
                          <span>{entry.transaction_date ?? '—'}</span>
                          <span>{entry.category ?? '—'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <Card className="snapsort-history border border-white/10 bg-slate-950/65 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-100/70">Receipt history</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Search and filter invoices</h3>
                  </div>
                  <Link href="/snapsort/history" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/20">
                    Open full history
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1.6fr_0.8fr]">
                  <input
                    value={historyQuery}
                    onChange={(event) => setHistoryQuery(event.target.value)}
                    placeholder="Search by merchant, amount, or category..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <select
                    value={historyCategory}
                    onChange={(event) => setHistoryCategory(event.target.value as HistoryFilter)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="all" className="bg-slate-950 text-white">All categories</option>
                    <option value="food" className="bg-slate-950 text-white">Food</option>
                    <option value="transport" className="bg-slate-950 text-white">Transport</option>
                    <option value="shopping" className="bg-slate-950 text-white">Shopping</option>
                    <option value="bills" className="bg-slate-950 text-white">Bills</option>
                    <option value="utilities" className="bg-slate-950 text-white">Utilities</option>
                    <option value="other" className="bg-slate-950 text-white">Other</option>
                  </select>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/10">
                  <div className="grid grid-cols-[1.1fr_1.4fr_0.8fr_0.8fr_0.7fr] gap-3 bg-black/30 px-4 py-4 text-xs uppercase tracking-[0.28em] text-slate-300">
                    <span>Date</span>
                    <span>Description</span>
                    <span>Amount</span>
                    <span>Category</span>
                    <span>Actions</span>
                  </div>
                  <div className="divide-y divide-white/10 bg-white/5">
                    {historyLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-300">Loading history...</div>
                    ) : filteredHistory.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-300">No matching receipts found.</div>
                    ) : filteredHistory.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-[1.1fr_1.4fr_0.8fr_0.8fr_0.7fr] gap-3 px-4 py-4 text-sm text-slate-200">
                        <span>{entry.transaction_date ?? '—'}</span>
                        <span className="truncate font-medium text-white">{entry.merchant ?? 'Unknown merchant'}</span>
                        <span>{formatMoneyValue(entry.currency, entry.total_amount)}</span>
                        <span>{entry.category ?? '—'}</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setResult({
                                merchant: entry.merchant,
                                total: entry.total_amount,
                                currency: entry.currency,
                                category: entry.category,
                                transactionDate: entry.transaction_date,
                                items: entry.items ?? [],
                              });
                              setStatus(`Loaded ${entry.merchant ?? 'receipt'} into the invoice preview.`);
                            }}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => { window.location.href = '/snapsort/history'; }}
                            className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100 hover:bg-sky-400/20"
                          >
                            History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <AppTutorial ref={tutorialRef}
        steps={[
          { title: 'Upload Receipt', description: 'Drop a receipt, invoice, or PDF here, or tap to browse files. PNG, JPG, WEBP, and PDF are supported.', targetSelector: '.snapsort-upload' },
          { title: 'Document Type', description: 'Select the right document type for more accurate parsing — receipts, invoices, or engineering invoices.', targetSelector: '.snapsort-doc-type' },
          { title: 'Invoice Preview', description: 'After analysis, view all extracted data: merchant, totals, tax, line items, and more.', targetSelector: '.snapsort-preview' },
          { title: 'Receipt History', description: 'Browse, search, and filter your past scans. Click Preview to reload any receipt.', targetSelector: '.snapsort-history' },
        ]}
        storageKey="snapguard_tutorial_snapsort"
        enabled={!trialMode}
      />
    </AuthGuard>
  );
}
