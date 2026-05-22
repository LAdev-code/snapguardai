import Link from 'next/link';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';

const monthlySpending = 2780;
const financialHealthScore = 72;

const quickActions = [
  { label: 'Scan Receipt', href: '/snapsort', tone: 'bg-sky-400/15 text-sky-100' },
  { label: 'Check for Scams', href: '/scamshield', tone: 'bg-amber-400/15 text-amber-100' },
  { label: 'View Financial Health', href: '/moneycoach', tone: 'bg-emerald-400/15 text-emerald-100' },
];

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,_rgba(7,10,18,1),_rgba(11,15,24,1))] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Main Hub</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-sm text-white/65">Start here to scan receipts, check scams, or review financial health.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/snapsort"><Button>Scan Receipt</Button></Link>
              <Link href="/scamshield"><Button variant="secondary">Check for Scams</Button></Link>
            </div>
          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/8">
                <div className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold ${action.tone}`}>{action.label}</div>
                <p className="mt-4 text-sm text-white/60 group-hover:text-white/80">Launch {action.label.toLowerCase()} flow and save results to Supabase.</p>
              </Link>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="border border-white/10 bg-white/5 p-6">
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

            <Card className="border border-white/10 bg-white/5 p-6">
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
    </AuthGuard>
  );
}
