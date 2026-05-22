import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protect Your Money and Understand Spending",
  description: "SnapGuard AI combines scam detection, receipt intelligence, and financial health tracking to help you make safer money decisions.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(94,125,229,0.16),_transparent_35%),linear-gradient(180deg,_#09111f_0%,_#0b1220_56%,_#08101b_100%)] text-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            SnapGuard AI
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance md:text-6xl">
            Protect your money. Understand your spending.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/72">
            Detect scams, analyze receipts, and track financial health with native flows that save directly to Supabase.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/register" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200">
              Start Analysis
            </a>
            <a href="/login" className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              Sign in
            </a>
          </div>

          <div id="features" className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-xl">🧾</div>
              <p className="mt-4 text-sm text-white/55">SnapSortAI</p>
              <p className="mt-2 text-lg font-semibold">Receipt parsing</p>
              <p className="mt-2 text-sm text-white/65">Upload receipts, extract merchant data, and save them to your dashboard.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-xl">🛡️</div>
              <p className="mt-4 text-sm text-white/55">ScamShield</p>
              <p className="mt-2 text-lg font-semibold">Risk detection</p>
              <p className="mt-2 text-sm text-white/65">Scan messages or payment proof and get a clear safety verdict.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl">📈</div>
              <p className="mt-4 text-sm text-white/55">Money Coach</p>
              <p className="mt-2 text-lg font-semibold">Health tracking</p>
              <p className="mt-2 text-sm text-white/65">See your score, savings, and behavioral insights over time.</p>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Built for Malaysia</p>
                <p className="mt-2 text-sm text-white/70">Designed for local payment patterns, scam alerts, and everyday money management.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-sky-300/20">A</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-emerald-300/20">M</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-amber-300/20">S</span>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/75">Trusted by privacy-first users</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Live overview</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Protected</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Spending</p>
                <p className="mt-3 text-3xl font-semibold">RM2,780</p>
                <p className="mt-2 text-sm text-white/55">Tracked from receipts and manual entries.</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Risk score</p>
                <p className="mt-3 text-3xl font-semibold">72</p>
                <p className="mt-2 text-sm text-white/55">Updated by ScamShield scans.</p>
              </div>
            </div>
            <div className="mt-4 h-56 rounded-[1.5rem] border border-white/8 bg-[linear-gradient(135deg,_rgba(125,211,252,0.14),_rgba(52,211,153,0.12),_rgba(255,255,255,0.04))] p-5">
              <div className="flex h-full flex-col justify-between rounded-[1.25rem] border border-white/10 bg-slate-950/35 p-5">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Secure account sync</span>
                  <span>Supabase</span>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/45">Recent activity</p>
                  <div className="mt-3 space-y-2 text-sm text-white/75">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Receipt analyzed</span>
                      <span>Now</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Scam report saved</span>
                      <span>Today</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Financial snapshot stored</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


