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
  const [income, setIncome] = useState(4200);
  const [expenses, setExpenses] = useState(2780);
  const [assets, setAssets] = useState(125000);
  const [liabilities, setLiabilities] = useState(18500);
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
  const [editOpen, setEditOpen] = useState(false);
  const [draftIncome, setDraftIncome] = useState(income);
  const [draftExpenses, setDraftExpenses] = useState(expenses);
  const [draftAssets, setDraftAssets] = useState(assets);
  const [draftLiabilities, setDraftLiabilities] = useState(liabilities);
  const [draftSavingsGoal, setDraftSavingsGoal] = useState(savingsGoal);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [receiptRows, setReceiptRows] = useState<Array<{
    id: number;
    merchant: string | null;
    category: string | null;
    currency: string | null;
    total_amount: number | string | null;
    transaction_date: string | null;
  }>>([]);
  const [recentBills, setRecentBills] = useState<Array<{
    id: number;
    merchant: string | null;
    category: string | null;
    currency: string | null;
    total_amount: number | string | null;
    transaction_date: string | null;
  }>>([]);
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
        .select('id, total_amount, category, merchant, currency, transaction_date')
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

        setRecentBills(
          [...data]
            .sort((a, b) => String(b.transaction_date ?? '').localeCompare(String(a.transaction_date ?? '')))
            .slice(0, 4) as typeof recentBills,
        );
        setReceiptRows(data);

        setStatus(`Loaded ${data.length} receipts from SnapSortAI. Adjust inputs and save a snapshot.`);
        setReceiptsLoaded(true);
      }
    }

    loadReceipts();
  }, []);

  const savingsRate = useMemo(() => Math.max(0, Math.round(((income - expenses) / income) * 100)), [income, expenses]);
  const topCategory = useMemo(() => monthlyData.slice().sort((a, b) => b.value - a.value)[0] ?? { label: 'Other', value: 0 }, [monthlyData]);
  const estimatedSavings = Math.max(0, Math.round(income - expenses));
  const score = useMemo(() => {
    const monthlyIncome = Math.max(income, 1);
    const surplus = income - expenses;
    const savingsMomentum = Math.max(0, Math.min(30, (surplus / monthlyIncome) * 50));
    const debtPressure = Math.max(0, Math.min(30, (liabilities / Math.max(assets, 1)) * 35));
    const assetBuffer = Math.max(0, Math.min(20, (assets / Math.max(expenses * 6, 1)) * 10));
    const goalFit = Math.max(0, Math.min(20, (surplus / Math.max(savingsGoal, 1)) * 12));

    return Math.max(0, Math.min(100, Math.round(35 + savingsMomentum + assetBuffer + goalFit - debtPressure)));
  }, [income, expenses, assets, liabilities, savingsGoal]);
  const persona = score >= 80 ? '📈 Strong Builder' : score >= 60 ? '📊 Balanced Builder' : score >= 40 ? '⚠️ Needs Attention' : '🚨 High Pressure';
  const totalAssets = assets;
  const netAssets = Math.round(assets - liabilities);
  const savingsProgress = Math.min(100, Math.max(0, Math.round((estimatedSavings / Math.max(1, savingsGoal)) * 100)));
  const monthlyTrend = useMemo(() => {
    const monthMap = new Map<string, number>();
    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthMap.set(key, 0);
    }

    receiptRows.forEach((row) => {
      if (!row.transaction_date) return;
      const parsedDate = new Date(row.transaction_date);
      if (Number.isNaN(parsedDate.getTime())) return;
      const key = parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthMap.has(key)) return;
      monthMap.set(key, (monthMap.get(key) ?? 0) + (Number(row.total_amount) || 0));
    });

    const points = Array.from(monthMap.entries()).map(([label, amount]) => ({ label, amount }));
    const maxAmount = Math.max(...points.map((point) => point.amount), 1);
    return points.map((point, index) => ({
      ...point,
      x: points.length === 1 ? 60 : (index / (points.length - 1)) * 120,
      y: 110 - Math.round((point.amount / maxAmount) * 90),
    }));
  }, [receiptRows]);
  const trendPoints = monthlyTrend.map((entry) => `${entry.x},${entry.y}`).join(' ');
  const hasTrendData = monthlyTrend.some((entry) => entry.amount > 0);

  const feasibilityBadge = aiSuggestions
    ? aiSuggestions.goalFeasibility === 'on_track' ? 'bg-emerald-400/15 text-emerald-100 border-emerald-300/20'
      : aiSuggestions.goalFeasibility === 'needs_adjustment' ? 'bg-amber-400/15 text-amber-100 border-amber-300/20'
      : 'bg-rose-400/15 text-rose-100 border-rose-300/20'
    : '';

  function openEditPanel() {
    setDraftIncome(income);
    setDraftExpenses(expenses);
    setDraftAssets(assets);
    setDraftLiabilities(liabilities);
    setDraftSavingsGoal(savingsGoal);
    setDraftNotes(notes);
    setEditOpen(true);
  }

  function saveFinancialProfile() {
    setIncome(Math.max(0, Number(draftIncome) || 0));
    setExpenses(Math.max(0, Number(draftExpenses) || 0));
    setAssets(Math.max(0, Number(draftAssets) || 0));
    setLiabilities(Math.max(0, Number(draftLiabilities) || 0));
    setSavingsGoal(Math.max(0, Number(draftSavingsGoal) || 0));
    setNotes(draftNotes.trim() || '');
    setEditOpen(false);
    setStatus('Financial profile updated. The score and coach will recalculate automatically.');
  }

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
        body: JSON.stringify({ income, expenses, savingsGoal, topCategory: topCategory.label, assets, liabilities }),
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
        assets,
        liabilities,
        savings_rate: savingsRate,
        top_category: topCategory.label,
        notes,
        snapshot_payload: {
          score,
          income,
          expenses,
          assets,
          liabilities,
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(36,160,219,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_24%),linear-gradient(180deg,#07111f_0%,#0b1d34_52%,#08111d_100%)] text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/70">Money Coach</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Monthly overview</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">A glacier-style finance board for tracking spending, assets, savings goals, and recent receipts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start rounded-full border border-white/10 bg-white/10 px-4 py-2 shadow-sm backdrop-blur">
              <Button variant="secondary" onClick={openEditPanel}>Edit finances</Button>
              <Button variant="secondary" onClick={() => setStatus('Ready to save a financial health snapshot.')}>Refresh data</Button>
            </div>
          </header>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Expenses', value: `RM${expenses.toLocaleString()}`, tone: 'from-slate-900 via-slate-900 to-slate-800' },
                  { label: 'Income', value: `RM${income.toLocaleString()}`, tone: 'from-slate-900 via-cyan-950/80 to-slate-800' },
                  { label: 'Balance', value: `RM${estimatedSavings.toLocaleString()}`, tone: 'from-slate-900 via-emerald-950/80 to-slate-800' },
                  { label: 'Today', value: `RM${Math.round(expenses / Math.max(1, receiptsLoaded ? Math.max(1, recentBills.length) : 1)).toLocaleString()}`, tone: 'from-slate-900 via-amber-950/80 to-slate-800' },
                ].map((card) => (
                  <Card key={card.label} className={`border-white/10! bg-slate-950/70! text-slate-100! bg-linear-to-br ${card.tone} p-4 shadow-[0_18px_40px_rgba(8,15,28,0.45)]`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-100/70">{card.label}</p>
                        <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{card.value}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="border-white/10! bg-slate-950/65! text-slate-100! p-5 shadow-[0_18px_45px_rgba(8,15,28,0.45)] backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Monthly trend</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Monthly spend trend</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
                    Savings rate {savingsRate}%
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                  <div className="relative h-64 overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/45">
                    <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
                      <defs>
                        <linearGradient id="glacierTrend" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#7dd3fc" />
                          <stop offset="55%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                      {hasTrendData && (
                        <>
                          <polyline
                            fill="none"
                            stroke="url(#glacierTrend)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={trendPoints}
                          />
                          {monthlyTrend
                            .filter((entry) => entry.amount > 0)
                            .map((entry) => (
                              <g key={entry.label}>
                                <circle cx={entry.x} cy={entry.y} r="2.5" fill="#34d399" />
                              </g>
                            ))}
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-x-4 top-4 flex items-center justify-between text-xs text-slate-300/70">
                      <span>6-month expense trend</span>
                      <span>{hasTrendData ? 'Loaded from receipts' : 'No dated receipts yet'}</span>
                    </div>
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between px-2 text-[11px] text-slate-300/70">
                      {monthlyTrend.map((entry) => (
                        <span key={entry.label} className="max-w-13 truncate text-center">{entry.label}</span>
                      ))}
                    </div>
                    {!hasTrendData && (
                      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300/70">
                        Add receipts with transaction dates to populate the monthly trend.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Monthly breakdown</p>
                      <div className="flex gap-2 text-xs font-semibold text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">Category</span>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">Spending</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      {monthlyData.map((entry) => (
                        <div key={entry.label}>
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                            <span className="font-medium text-white">{entry.label}</span>
                            <span>{entry.value}%</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-white/10">
                            <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#67e8f9,#60a5fa,#34d399)]" style={{ width: `${entry.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Assets & savings plan</p>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Assets</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-200/75">Total assets</p>
                        <div className="mt-3 text-2xl font-semibold text-white">RM {totalAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200/75">Net assets</p>
                        <div className="mt-3 text-2xl font-semibold text-white">RM {netAssets.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-3xl border border-amber-300/15 bg-amber-400/10 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-amber-100">Savings plan</p>
                        <span className="rounded-full border border-amber-300/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-amber-100">{savingsProgress}%</span>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-white/10">
                        <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#fde68a,#67e8f9,#34d399)]" style={{ width: `${savingsProgress}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                        <span>Target RM {savingsGoal.toLocaleString()}</span>
                        <span>Net assets: RM {netAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="border-white/10! bg-slate-950/65! text-slate-100! p-5 shadow-[0_18px_45px_rgba(8,15,28,0.45)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Snapshot</p>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{receiptsLoaded ? 'Synced' : 'Local'}</div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-4 text-center">
                  <Gauge value={score} />
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">Savings rate: {savingsRate}%</p>
                    <p className="text-sm text-slate-300">Top category: {topCategory.label}</p>
                    <p className="text-sm text-slate-300">Net assets: RM {netAssets.toLocaleString()}</p>
                  </div>
                  <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100">{persona}</div>
                  <div className="grid w-full grid-cols-2 gap-3">
                    <Button className="w-full" variant="secondary" onClick={openEditPanel}>Edit finances</Button>
                    <Button className="w-full" onClick={saveSnapshot} disabled={saving}>{saving ? 'Saving...' : 'Save snapshot'}</Button>
                  </div>
                </div>
              </Card>

              <Card className="border-white/10! bg-slate-950/65! text-slate-100! p-5 shadow-[0_18px_45px_rgba(8,15,28,0.45)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Recent bills</p>
                  <button className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Details</button>
                </div>
                <div className="mt-4 space-y-3">
                  {recentBills.length > 0 ? recentBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-sm">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{bill.merchant ?? 'Other'}</div>
                        <div className="mt-1 text-xs text-slate-300">{bill.transaction_date ?? '—'} • {bill.category ?? '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${Number(bill.total_amount ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {bill.currency ?? ''} {Number(bill.total_amount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">No recent bills yet.</div>
                  )}
                </div>
              </Card>

              <Card className="border-white/10! bg-slate-950/65! text-slate-100! p-5 shadow-[0_18px_45px_rgba(8,15,28,0.45)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">AI Coach</p>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Monthly savings target (RM)</span>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={savingsGoal}
                        onChange={(event) => setSavingsGoal(Number(event.target.value || 0))}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300"
                      />
                      <Button onClick={getAiSuggestions} disabled={aiLoading}>
                        {aiLoading ? 'Thinking...' : 'AI Coach'}
                      </Button>
                    </div>
                  </label>
                  <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/70">Monthly balance</p>
                    <div className="mt-2 text-2xl font-semibold text-white">RM{estimatedSavings.toLocaleString()}</div>
                    <p className="mt-1 text-sm text-slate-300">Goal progress is {savingsProgress}% of target.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span>Assets</span>
                      <span className="font-semibold text-white">RM {assets.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>Liabilities</span>
                      <span className="font-semibold text-white">RM {liabilities.toLocaleString()}</span>
                    </div>
                  </div>
                  {aiSuggestions && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">AI summary</p>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${feasibilityBadge}`}>
                          {aiSuggestions.goalFeasibility === 'on_track' ? 'On Track' : aiSuggestions.goalFeasibility === 'needs_adjustment' ? 'Needs Work' : 'Unrealistic'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-200">{aiSuggestions.summary}</p>
                      <div className="mt-4 space-y-3 text-sm text-slate-200">
                        {aiSuggestions.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex gap-3 rounded-2xl bg-white/5 px-4 py-3 shadow-sm">
                            <span className="mt-0.5 font-semibold text-sky-300">{index + 1}.</span>
                            <span>{typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}</span>
                          </div>
                        ))}
                      </div>
                      {aiSuggestions.riskNote && (
                        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                          ⚠ {aiSuggestions.riskNote}
                        </div>
                      )}
                      {aiSuggestions.adjustedGoal && (
                        <p className="mt-3 text-sm text-amber-100">
                          Suggested savings target: <span className="font-semibold">RM{aiSuggestions.adjustedGoal.toLocaleString()}/month</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-white/10! bg-slate-950/65! text-slate-100! p-5 shadow-[0_18px_45px_rgba(8,15,28,0.45)] backdrop-blur">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Coach note</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-sky-300" />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={saveSnapshot} disabled={saving}>{saving ? 'Saving...' : 'Save snapshot'}</Button>
                  <Button variant="secondary" onClick={() => setStatus('Ready to save a financial health snapshot.')}>Reset status</Button>
                </div>
                <p className="mt-3 text-sm text-slate-300">{status}</p>
              </Card>
            </aside>
          </section>

          {editOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-4xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">Edit finances</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Update your profile for a real score</h2>
                    <p className="mt-2 text-sm text-slate-300">Change income, assets, liabilities, and savings goal. Money Coach will recalculate immediately after you save.</p>
                  </div>
                  <button onClick={() => setEditOpen(false)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10">Close</button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Monthly income (RM)</span>
                    <input type="number" value={draftIncome} onChange={(event) => setDraftIncome(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Monthly expenses (RM)</span>
                    <input type="number" value={draftExpenses} onChange={(event) => setDraftExpenses(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Assets (RM)</span>
                    <input type="number" value={draftAssets} onChange={(event) => setDraftAssets(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Liabilities (RM)</span>
                    <input type="number" value={draftLiabilities} onChange={(event) => setDraftLiabilities(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Savings goal (RM)</span>
                    <input type="number" value={draftSavingsGoal} onChange={(event) => setDraftSavingsGoal(Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-200">Coach note</span>
                    <textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-sky-300" />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={saveFinancialProfile}>Save changes</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
