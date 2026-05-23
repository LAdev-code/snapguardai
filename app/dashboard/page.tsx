"use client";

import Link from 'next/link';
import Card from '../components/Card';
import AuthGuard from '../components/AuthGuard';
import AppTutorial, { type AppTutorialHandle } from '../components/AppTutorial';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseBrowserClient';

const monthlySpendingDefault = 2780;
const financialHealthScoreDefault = 72;

const quickActions = [
  { label: 'Scan Receipt', href: '/snapsort', tone: 'bg-sky-400/15 text-sky-100' },
  { label: 'Check for Scams', href: '/scamshield', tone: 'bg-amber-400/15 text-amber-100' },
  { label: 'View Financial Health', href: '/moneycoach', tone: 'bg-emerald-400/15 text-emerald-100' },
];

export default function DashboardPage() {
  const tutorialRef = useRef<AppTutorialHandle>(null);
  const [monthlySpending, setMonthlySpending] = useState<number>(monthlySpendingDefault);
  const [financialHealthScore, setFinancialHealthScore] = useState<number>(financialHealthScoreDefault);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Sum receipts total_amount for this user
        const { data: receipts, error: receiptsErr } = await supabase
          .from('receipts_data')
          .select('total_amount')
          .eq('user_id', user.user.id);

        if (!receiptsErr && receipts) {
          const total = receipts.reduce((sum, r: any) => sum + (Number(r.total_amount) || 0), 0);
          setMonthlySpending(Math.round(total));
        }

        // Get latest financial_health snapshot
        const { data: fh, error: fhErr } = await supabase
          .from('financial_health')
          .select('score')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!fhErr && fh && fh.length > 0) {
          setFinancialHealthScore(Number((fh[0] as any).score) || 0);
        }
      } catch (e) {
        // silent fail; keep defaults
      }
    }

    loadData();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(7,10,18,1),rgba(11,15,24,1))] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Main Hub</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-sm text-white/65">Start here to scan receipts, check scams, or review financial health.</p>
            </div>
            <button
              onClick={() => tutorialRef.current?.restart()}
              className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            >
              Tutorial
            </button>
          </header>

          <section className="dashboard-quick-actions mt-8 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/8">
                <div className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold ${action.tone}`}>{action.label}</div>
                <p className="mt-4 text-sm text-white/60 group-hover:text-white/80">Launch {action.label.toLowerCase()} flow and save results to Supabase.</p>
              </Link>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="dashboard-overview border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">This month</p>
                  <h2 className="mt-2 text-2xl font-semibold">Mini Overview</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">Financial Health {financialHealthScore}</div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Total spending</p>
                  <div className="mt-3 text-4xl font-semibold">RM{monthlySpending.toLocaleString()}</div>
                  <p className="mt-2 text-sm text-white/60">Imported from your SnapSortAI receipt flow.</p>
                </div>
                <div className="rounded-3xl bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Health score</p>
                  <div className="mt-3 text-4xl font-semibold">{financialHealthScore}/100</div>
                  <p className="mt-2 text-sm text-white/60">Improves when your savings and consistency go up.</p>
                </div>
              </div>
            </Card>

            <Card className="dashboard-activity border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Recent activity</p>
              <div className="mt-4 space-y-3 text-sm text-white/75">
                <div className="rounded-2xl bg-black/20 px-4 py-3">Receipt analyzed and ready to add to dashboard.</div>
                <div className="rounded-2xl bg-black/20 px-4 py-3">ScamShield risk scan available for review.</div>
                <div className="rounded-2xl bg-black/20 px-4 py-3">Money Coach snapshot is synced to Supabase.</div>
              </div>
            </Card>
          </section>
        </div>
      </main>
      <AppTutorial ref={tutorialRef}
        steps={[
          { title: 'Quick Actions', description: 'Launch SnapSortAI to scan receipts, ScamShield to check for scams, or Money Coach to review your financial health.', targetSelector: '.dashboard-quick-actions' },
          { title: 'Monthly Overview', description: 'See your total spending from uploaded receipts and your financial health score at a glance.', targetSelector: '.dashboard-overview' },
          { title: 'Recent Activity', description: 'Keep track of your latest actions across all SnapGuard features.', targetSelector: '.dashboard-activity' },
        ]}
        storageKey="snapguard_tutorial_dashboard"
        enabled={true}
      />
    </AuthGuard>
  );
}
