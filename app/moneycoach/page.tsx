"use client";

import { useMemo, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../../lib/supabaseClient';

const monthlyData = [
  { label: 'Food', value: 78 },
  { label: 'Transport', value: 52 },
  { label: 'Bills', value: 89 },
  { label: 'Shopping', value: 41 },
  { label: 'Savings', value: 66 },
];

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

  const savingsRate = useMemo(() => Math.max(0, Math.round(((income - expenses) / income) * 100)), [income, expenses]);
  const topCategory = useMemo(() => monthlyData.slice().sort((a, b) => b.value - a.value)[0], []);

  async function saveSnapshot() {
    setStatus('Saving financial health record...');

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
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,_rgba(6,10,16,1),_rgba(8,12,20,1))] text-white">
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
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => setScore((value) => Math.min(100, value + 3))}>Improve score</Button>
                  <Button className="flex-1" variant="secondary" onClick={() => setScore((value) => Math.max(0, value - 3))}>Stress test</Button>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
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
                        <div className="h-3 rounded-full bg-[linear-gradient(90deg,_#7dd3fc,_#34d399)]" style={{ width: `${entry.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border border-white/10 bg-white/5">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-white/50">Coach note</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" />
                </label>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={saveSnapshot}>Save snapshot</Button>
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
