"use client";

import { useMemo, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../../lib/supabaseClient';
import { fileToDataUrl, stripDataUrlPrefix } from '../../lib/fileHelpers';

type ScamResult = {
  riskScore?: number | string | null;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical' | string | null;
  verdict?: string | null;
  summary?: string | null;
  reasons?: string[];
  recommendedAction?: string | null;
  redFlags?: string[];
};

function badgeStyles(level?: string | null) {
  switch (level) {
    case 'critical':
      return 'bg-rose-500/20 text-rose-200 border-rose-400/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-200 border-orange-400/30';
    case 'medium':
      return 'bg-amber-500/20 text-amber-100 border-amber-400/30';
    default:
      return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30';
  }
}

export default function ScamShieldPage() {
  const [tab, setTab] = useState<'message' | 'image'>('message');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<ScamResult | null>(null);
  const [status, setStatus] = useState('Paste a message or upload a proof image to begin.');
  const [busy, setBusy] = useState(false);

  const score = useMemo(() => {
    const value = Number(result?.riskScore ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [result?.riskScore]);

  const level = result?.riskLevel ?? 'low';

  async function handleScan() {
    if (!message.trim() && !file) {
      setStatus('Add message text or an image first.');
      return;
    }

    setBusy(true);
    setStatus('Scanning...');

    try {
      const payload: Record<string, string> = { text: message.trim() };

      if (file) {
        const dataUrl = await fileToDataUrl(file);
        payload.imageBase64 = stripDataUrlPrefix(dataUrl);
        payload.imageMimeType = file.type || 'image/png';
        payload.fileName = file.name;
      }

      const response = await fetch('/api/scamshield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Scan failed');
      }

      const parsed = data?.parsed ?? null;
      setResult(parsed);
      setStatus('Saving report to scam_reports...');

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { error } = await supabase.from('scam_reports').insert([{
        user_id: userId,
        input_type: tab,
        input_text: message.trim() || null,
        source_file_name: file?.name ?? null,
        risk_score: parsed?.riskScore ?? null,
        risk_level: parsed?.riskLevel ?? null,
        verdict: parsed?.verdict ?? null,
        summary: parsed?.summary ?? null,
        reasons: parsed?.reasons ?? [],
        recommended_action: parsed?.recommendedAction ?? null,
        red_flags: parsed?.redFlags ?? [],
        analysis_payload: parsed ?? data?.raw ?? {},
      }]);

      if (error) {
        throw error;
      }

      setStatus('Report saved to scam_reports.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to scan item.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,_rgba(5,8,16,1),_rgba(10,13,23,1))] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">ScamShield</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Verify suspicious messages and payment proof.</h1>
            <p className="mt-3 text-sm text-white/70">Use text or image evidence. The scanner returns a risk score, explanation, and recommended action, then saves the report in Supabase.</p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-white/10 bg-white/5 p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <div className="flex gap-2">
                  <button onClick={() => setTab('message')} className={`rounded-full px-4 py-2 text-sm ${tab === 'message' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>Message Check</button>
                  <button onClick={() => setTab('image')} className={`rounded-full px-4 py-2 text-sm ${tab === 'image' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>Payment Proof</button>
                </div>
              </div>
              <div className="space-y-5 px-6 py-6">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">Message text</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-white/30"
                    placeholder={tab === 'message' ? 'Paste SMS, WhatsApp, or email text here.' : 'Add any message that explains the proof or transaction.'}
                  />
                </label>

                <label className="block rounded-2xl border border-dashed border-white/20 bg-black/20 p-5 text-sm text-white/70">
                  <span className="block font-medium text-white">Image proof</span>
                  <span className="mt-1 block">Upload screenshots, invoices, or payment confirmations.</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-4 block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-black"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setFile(nextFile);
                      if (nextFile) {
                        fileToDataUrl(nextFile).then(setPreview).catch(() => setPreview(''));
                      } else {
                        setPreview('');
                      }
                    }}
                  />
                </label>

                {preview ? <img src={preview} alt="ScamShield preview" className="h-56 w-full rounded-2xl object-cover" /> : null}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleScan} disabled={busy}>{busy ? 'Scanning...' : 'Scan now'}</Button>
                  <Button variant="secondary" onClick={() => { setMessage(''); setFile(null); setPreview(''); setResult(null); setStatus('Cleared.'); }}>Reset</Button>
                </div>

                <p className="text-sm text-white/60">{status}</p>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Risk</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeStyles(level)}`}>{String(level)}</span>
                </div>
                <div className="mt-4 flex items-end gap-4">
                  <div className="text-5xl font-semibold">{score}</div>
                  <div className="pb-1 text-sm text-white/50">/ 100</div>
                </div>
                <p className="mt-4 text-sm text-white/75">{result?.verdict ?? 'Waiting for analysis.'}</p>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Reasons</p>
                <div className="mt-3 space-y-2 text-sm text-white/75">
                  {(result?.reasons?.length ?? 0) > 0 ? result?.reasons?.map((reason) => (
                    <div key={reason} className="rounded-xl bg-black/20 px-3 py-2">{reason}</div>
                  )) : <p className="text-white/45">The scanner will explain the red flags here.</p>}
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recommended action</p>
                <p className="mt-3 text-sm text-white/75">{result?.recommendedAction ?? 'No recommendation yet.'}</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
