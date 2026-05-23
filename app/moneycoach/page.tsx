"use client";

import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../../lib/supabaseBrowserClient';
import { getSupabaseAuthHeaders } from '../../lib/authHeaders';

function Gauge({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox="0 0 140 140" className="h-44 w-44">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeLinecap="round"
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
      />
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" className="fill-white text-3xl font-semibold">
        {value}
      </text>
      <text x="70" y="92" textAnchor="middle" dominantBaseline="middle" className="fill-white/50 text-[10px] uppercase tracking-[0.3em]">
        score
      </text>
    </svg>
  );
}

export default function MoneyCoachPage() {
  const [score, setScore] = useState(72);
  const [income, setIncome] = useState(4200);
  const [expenses, setExpenses] = useState(2780);
  const [notes, setNotes] = useState('Keep discretionary spending under control and raise savings first.');
  const [status, setStatus] = useState('Ready to save a financial health snapshot.');
  const [saving, setSaving] = useState(false);
  const [monthlyData, setMonthlyData] = useState([
    { label: 'Food', value: 34 },
    { label: 'Transport', value: 26 },
    { label: 'Shopping', value: 20 },
    { label: 'Bills', value: 20 },
  ]);
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState(500);
  const [aiSuggestions, setAiSuggestions] = useState<{
    summary: string;
    suggestions: string[];
    goalFeasibility: string;
    adjustedGoal: number | null;
    riskNote: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function loadReceipts() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('receipts_data')
        .select('total_amount, category')
        .eq('user_id', user.user.id);

      if (!error && data && data.length > 0) {
        const totalExpenses = data.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
        if (totalExpenses > 0) setExpenses(Math.round(totalExpenses));

        const categoryTotals: Record<string, number> = {};
        data.forEach((r) => {
          const cat = r.category || 'Other';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(r.total_amount) || 0);
        });

        const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
        if (grandTotal > 0) {
          setMonthlyData(
            Object.entries(categoryTotals)
              .map(([label, value]) => ({ label, value: Math.max(1, Math.round((value / grandTotal) * 100)) }))
              .sort((a, b) => b.value - a.value),
          );
        }

        setStatus(`Loaded ${data.length} receipts from SnapSortAI. Adjust inputs and save a snapshot.`);
        setReceiptsLoaded(true);
      }
    }

    loadReceipts();
  }, []);

  const savingsRate = useMemo(() => Math.max(0, Math.round(((income - expenses) / income) * 100)), [income, expenses]);
  const topCategory = useMemo(() => monthlyData.slice().sort((a, b) => b.value - a.value)[0], []);
  const estimatedSavings = Math.max(0, Math.round(income - expenses));
  const persona = topCategory.label === 'Food' ? '🍜 High Food Spender' : topCategory.label === 'Shopping' ? '⚠️ Impulse Buyer Risk' : '📊 Balanced Builder';

  const feasibilityBadge = aiSuggestions
    ? aiSuggestions.goalFeasibility === 'on_track' ? 'bg-emerald-400/15 text-emerald-100 border-emerald-300/20'
      : aiSuggestions.goalFeasibility === 'needs_adjustment' ? 'bg-amber-400/15 text-amber-100 border-amber-300/20'
      : 'bg-rose-400/15 text-rose-100 border-rose-300/20'
    : '';

  async function getAiSuggestions() {
    setAiLoading(true);
    try {
      const authHeaders = await getSupabaseAuthHeaders();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }

      const response = await fetch('/api/moneycoach', {
        method: 'POST',
        headers,
        body: JSON.stringify({ income, expenses, savingsGoal, topCategory: topCategory.label }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Failed to get suggestions');

      setAiSuggestions(data?.parsed ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to get AI suggestions.');
    } finally {
      setAiLoading(false);
    }
  }

  async function saveSnapshot() {
    setStatus('Saving financial health record...');
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { error } = await supabase.from('financial_health').insert([{
        user_id: userId,
        score,
        income,
        expenses,
        savings_rate: savingsRate,
        top_category: topCategory.label,
        notes,
        snapshot_payload: {
          score,
          income,
          expenses,
          savingsRate,
          topCategory,
          notes,
        },
      }]);

      if (error) {
        throw error;
      }

      setStatus('Financial health saved to financial_health.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save snapshot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(6,10,16,1),rgba(8,12,20,1))] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Money Coach</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Track financial health and store snapshots over time.</h1>
            <p className="mt-3 text-sm text-white/70">Use the gauge, monthly trend, and savings rate to understand your current score. Save each snapshot to Supabase for historical tracking.</p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="border border-white/10 bg-white/5">
              <div className="flex flex-col items-center gap-4 text-center">
                <Gauge value={score} />
                <div>
                  <p className="text-sm text-white/60">Savings rate: {savingsRate}%</p>
                  <p className="text-sm text-white/60">Top category: {topCategory.label}</p>
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">{persona}</div>
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => setScore((value) => Math.min(100, value + 3))}>Improve score</Button>
                  <Button className="flex-1" variant="secondary" onClick={() => setScore((value) => Math.max(0, value - 3))}>Stress test</Button>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Key stats</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Total spent</p>
                    <div className="mt-3 text-2xl font-semibold">RM{expenses.toLocaleString()}</div>
                  </div>
                  <div className="rounded-3xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Top category</p>
                    <div className="mt-3 text-2xl font-semibold">{topCategory.label}</div>
                  </div>
                  <div className="rounded-3xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Estimated savings</p>
                    <div className="mt-3 text-2xl font-semibold">RM{estimatedSavings.toLocaleString()}</div>
                  </div>
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-white/50">Income</span>
                    <input type="number" value={income} onChange={(event) => setIncome(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-white/50">Expenses</span>
                    <input type="number" value={expenses} onChange={(event) => setExpenses(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-white/50">Score</span>
                    <input type="number" value={score} onChange={(event) => setScore(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
                  </label>
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Spending mix</p>
                <div className="mt-5 space-y-4">
                  {monthlyData.map((entry) => (
                    <div key={entry.label}>
                      <div className="mb-1 flex items-center justify-between text-sm text-white/70">
                        <span>{entry.label}</span>
                        <span>{entry.value}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10">
                        <div className="h-3 rounded-full bg-[linear-gradient(90deg,#7dd3fc,#34d399)]" style={{ width: `${entry.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Savings goal</p>
                <div className="mt-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Monthly savings target (RM)</span>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={savingsGoal}
                        onChange={(event) => setSavingsGoal(Number(event.target.value || 0))}
                        className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                      />
                      <Button onClick={getAiSuggestions} disabled={aiLoading}>
                        {aiLoading ? 'Thinking...' : 'AI Coach'}
                      </Button>
                    </div>
                  </label>
                </div>
              </Card>

              {aiSuggestions && (
                <Card className="border border-sky-500/20 bg-sky-500/5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-300/70">AI Money Coach</p>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${feasibilityBadge}`}>
                      {aiSuggestions.goalFeasibility === 'on_track' ? 'On Track' : aiSuggestions.goalFeasibility === 'needs_adjustment' ? 'Needs Work' : 'Unrealistic'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/85">{aiSuggestions.summary}</p>
                  <div className="mt-4 space-y-3 text-sm text-white/75">
                    {aiSuggestions.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-3 rounded-xl bg-black/20 px-4 py-3">
                        <span className="mt-0.5 text-sky-300">{i + 1}.</span>
                        <span>{typeof s === 'string' ? s : JSON.stringify(s)}</span>
                      </div>
                    ))}
                  </div>
                  {aiSuggestions.riskNote && (
                    <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      ⚠ {aiSuggestions.riskNote}
                    </div>
                  )}
                  {aiSuggestions.adjustedGoal && (
                    <p className="mt-3 text-sm text-amber-200">
                      Suggested savings target: <span className="font-semibold">RM{aiSuggestions.adjustedGoal.toLocaleString()}/month</span>
                    </p>
                  )}
                </Card>
              )}

              <Card className="border border-white/10 bg-white/5">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-white/50">Coach note</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={saveSnapshot} disabled={saving}>{saving ? 'Saving...' : 'Save snapshot'}</Button>
                  <Button variant="secondary" onClick={() => setStatus('Ready to save a financial health snapshot.')}>Reset status</Button>
                </div>
                <p className="mt-3 text-sm text-white/60">{status}</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
