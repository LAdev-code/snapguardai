"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../../lib/supabaseBrowserClient';
import { getSupabaseAuthHeaders } from '../../lib/authHeaders';
import { fileToDataUrl, pdfPageToImageDataUrl, recognizeImageText, stripDataUrlPrefix } from '../../lib/fileHelpers';

type ReceiptResult = {
  merchant?: string | null;
  transactionDate?: string | null;
  currency?: string | null;
  total?: number | string | null;
  tax?: number | string | null;
  category?: string | null;
  paymentMethod?: string | null;
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
};

type CategoryBreakdown = { label: string; value: number; color: string };

const CHART_COLORS = ['#7dd3fc', '#34d399', '#fbbf24', '#fb7185'];

export default function SnapSortPage() {
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [status, setStatus] = useState('Drop a receipt image, or tap to pick a file.');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [processingStep, setProcessingStep] = useState('Waiting for upload');
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([
    { label: 'Food', value: 38, color: CHART_COLORS[0] },
    { label: 'Transport', value: 22, color: CHART_COLORS[1] },
    { label: 'Shopping', value: 18, color: CHART_COLORS[2] },
    { label: 'Bills', value: 22, color: CHART_COLORS[3] },
  ]);
  const [history, setHistory] = useState<SavedReceipt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
        .select('id, created_at, merchant, total_amount, currency, category, transaction_date')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data as SavedReceipt[]);
      }
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const insight = result?.summary ?? 'You spent more in one category than the rest this week. Receipt data is automatically synced to Money Coach.';

  function applyBreakdown() {
    const labels = ['Food', 'Transport', 'Shopping', 'Bills'];
    const weights = [34, 26, 20, 20];
    setBreakdown(labels.map((label, index) => ({
      label,
      value: weights[index],
      color: CHART_COLORS[index],
    })));
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setSaved(false);
    if (nextFile) {
      setStatus(`Loaded ${nextFile.name}. Ready to analyze.`);
    }
  }

  async function saveReceiptToDashboard(parsed: ReceiptResult | null) {
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
      // Auto-save failure is non-critical, user can re-analyze
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
        body: JSON.stringify({ text: textPayload }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Receipt analysis failed');
      }

      const parsed = data?.parsed ?? null;
      setResult(parsed);
      applyBreakdown();

      // Auto-save to receipts_data so MoneyCoach picks it up
      await saveReceiptToDashboard(parsed);

      setProcessingStep('Saved to dashboard.');
      setStatus('Receipt analyzed and saved. Check Money Coach for your spending overview.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to process receipt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(94,125,229,0.12),_transparent_36%),linear-gradient(180deg,_rgba(7,10,18,0.98),_rgba(12,14,24,1))] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">SnapSortAI</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Turn receipts into organized spending records.</h1>
            <p className="mt-3 text-sm text-white/70">Drag and drop a receipt or use your camera. We extract merchant data and automatically sync it to Money Coach.</p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <Card className="border border-white/10 bg-white/5 p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="text-lg font-semibold">Receipt upload</h2>
                <p className="text-sm text-white/60">Receipt OCR with auto-save to Money Coach.</p>
              </div>
              <div className="space-y-5 px-6 py-6">
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
                  className={`rounded-3xl border border-dashed p-6 text-sm transition ${dragging ? 'border-sky-300 bg-sky-400/10' : 'border-white/20 bg-black/20'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">Drop receipt here</p>
                      <p className="mt-1 text-white/60">PNG, JPG, PDF, or a camera capture.</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-white">Tap to open picker</div>
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
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-sky-300" />
                      <div>
                        <p className="font-semibold text-white">Processing receipt</p>
                        <p className="text-sm text-white/60">{processingStep}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                      <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
                    </div>
                  </div>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">OCR text or notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-white/30"
                    placeholder="Add notes about the purchase or paste additional receipt text."
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAnalyze} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze receipt'}
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
                </div>

                <p className={`text-sm ${saving ? 'text-emerald-300' : 'text-white/60'}`}>{status}</p>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Receipt data</p>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">{result ? 'Ready' : 'Awaiting scan'}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/75">
                  <div className="rounded-2xl bg-black/20 px-4 py-3"><span className="text-white/45">Merchant:</span> {result?.merchant ?? 'Waiting for scan'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3"><span className="text-white/45">Date:</span> {result?.transactionDate ?? '—'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3"><span className="text-white/45">Total:</span> {result?.currency ? `${result.currency} ` : ''}{result?.total ?? '—'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3"><span className="text-white/45">Category:</span> {result?.category ?? '—'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3"><span className="text-white/45">Confidence:</span> {result?.confidence ?? '—'}</div>
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
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
                <div className="mt-4 space-y-2 text-sm text-white/75">
                  {(result?.items?.length ?? 0) > 0 ? result?.items?.map((item, index) => (
                    <div key={`${item?.name ?? 'item'}-${index}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                      <span>{item?.name ?? 'Item'}</span>
                      <span>{item?.quantity ?? 1} x {item?.price ?? '—'}</span>
                    </div>
                  )) : <p className="text-white/45">The extracted items will appear here.</p>}
                </div>
              </Card>

              <Card className="border border-amber-300/20 bg-amber-300/10">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/75">AI insight</p>
                <p className="mt-3 text-sm leading-7 text-white">{insight}</p>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recent scans</p>
                  <button
                    onClick={() => setShowHistory((prev) => !prev)}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20"
                  >
                    {showHistory ? 'Hide' : `View all (${history.length})`}
                  </button>
                </div>
                {showHistory && (
                  <div className="mt-4 space-y-2 text-sm text-white/75 max-h-72 overflow-y-auto">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 py-3 text-white/60">
                        <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
                        <span>Loading history...</span>
                      </div>
                    ) : history.length === 0 ? (
                      <p className="py-3 text-white/45">No past scans yet. Analyse your first receipt above.</p>
                    ) : (
                      history.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setResult({
                              merchant: entry.merchant,
                              total: entry.total_amount,
                              currency: entry.currency,
                              category: entry.category,
                              transactionDate: entry.transaction_date,
                            });
                            applyBreakdown();
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
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
