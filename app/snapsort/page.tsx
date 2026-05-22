"use client";

import { useMemo, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../../lib/supabaseClient';
import { fileToDataUrl, stripDataUrlPrefix } from '../../lib/fileHelpers';

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

export default function SnapSortPage() {
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [status, setStatus] = useState('Upload a receipt image or paste OCR text, then analyze it.');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  const riskNote = result?.summary ?? 'No analysis yet.';

  async function handleAnalyze() {
    if (!file && !notes.trim()) {
      setStatus('Add a receipt image or some receipt text first.');
      return;
    }

    setLoading(true);
    setSaving(false);
    setStatus('Analyzing receipt...');

    try {
      const payload: Record<string, string> = { text: notes.trim() };

      if (file) {
        const dataUrl = await fileToDataUrl(file);
        payload.imageBase64 = stripDataUrlPrefix(dataUrl);
        payload.imageMimeType = file.type || 'image/png';
        payload.fileName = file.name;
      }

      const response = await fetch('/api/snapsort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Receipt analysis failed');
      }

      const parsed = data?.parsed ?? null;
      setResult(parsed);
      setStatus('Receipt analyzed. Saving to receipts_data...');

      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData.user?.id ?? null;

      const insertPayload = {
        user_id: userId,
        source_file_name: file?.name ?? null,
        source_text: notes.trim() || null,
        merchant: parsed?.merchant ?? null,
        transaction_date: parsed?.transactionDate ?? null,
        currency: parsed?.currency ?? null,
        total_amount: parsed?.total ?? null,
        tax_amount: parsed?.tax ?? null,
        category: parsed?.category ?? null,
        payment_method: parsed?.paymentMethod ?? null,
        items: parsed?.items ?? [],
        confidence: parsed?.confidence ?? null,
        summary: parsed?.summary ?? null,
        analysis_payload: parsed ?? data?.raw ?? {},
      };

      const { error } = await supabase.from('receipts_data').insert([insertPayload]);
      if (error) {
        throw error;
      }

      setSaving(true);
      setStatus('Receipt saved to receipts_data.');
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
            <p className="mt-3 text-sm text-white/70">Upload a receipt image or paste OCR text. The app extracts the merchant, totals, category, and line items, then saves the result to Supabase.</p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <Card className="border border-white/10 bg-white/5 p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="text-lg font-semibold">Receipt upload</h2>
                <p className="text-sm text-white/60">Image parsing and structured AI extraction.</p>
              </div>
              <div className="space-y-5 px-6 py-6">
                <label className="block rounded-2xl border border-dashed border-white/20 bg-black/20 p-5 text-sm text-white/70">
                  <span className="block font-medium text-white">Receipt image</span>
                  <span className="mt-1 block">PNG, JPG, or HEIC screenshots work best.</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-4 block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-white"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                {previewUrl ? (
                  <img src={previewUrl} alt="Receipt preview" className="h-56 w-full rounded-2xl object-cover" />
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">OCR text or notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-white/30"
                    placeholder="Paste OCR text from a receipt scanner, or add notes about the purchase."
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAnalyze} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze receipt'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setFile(null); setNotes(''); setResult(null); setStatus('Cleared.'); }}>
                    Reset
                  </Button>
                </div>

                <p className={`text-sm ${saving ? 'text-emerald-300' : 'text-white/60'}`}>{status}</p>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Summary</p>
                <div className="mt-3 grid gap-3 text-sm text-white/75">
                  <div><span className="text-white/45">Merchant:</span> {result?.merchant ?? 'Waiting for scan'}</div>
                  <div><span className="text-white/45">Date:</span> {result?.transactionDate ?? '—'}</div>
                  <div><span className="text-white/45">Total:</span> {result?.currency ? `${result.currency} ` : ''}{result?.total ?? '—'}</div>
                  <div><span className="text-white/45">Category:</span> {result?.category ?? '—'}</div>
                  <div><span className="text-white/45">Confidence:</span> {result?.confidence ?? '—'}</div>
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Line items</p>
                <div className="mt-3 space-y-2 text-sm text-white/75">
                  {(result?.items?.length ?? 0) > 0 ? result?.items?.map((item, index) => (
                    <div key={`${item?.name ?? 'item'}-${index}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                      <span>{item?.name ?? 'Item'}</span>
                      <span>{item?.quantity ?? 1} x {item?.price ?? '—'}</span>
                    </div>
                  )) : <p className="text-white/45">The extracted items will appear here.</p>}
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">AI notes</p>
                <p className="mt-3 text-sm text-white/75">{riskNote}</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
