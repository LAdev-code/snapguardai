"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseBrowserClient';

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const desktopLinkClass = (href: string) =>
    `rounded-full px-3 py-2 text-sm transition ${pathname === href ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;

  const mobileLinkClass = (href: string) =>
    `flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] transition ${pathname === href ? 'bg-white text-slate-950' : 'text-white/70'}`;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="SnapGuard AI" width={40} height={40} />
              <span className="text-lg font-semibold tracking-tight text-white">SnapGuard AI</span>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/dashboard" className={desktopLinkClass('/dashboard')}>Dashboard</Link>
              <Link href="/snapsort" className={desktopLinkClass('/snapsort')}>SnapSortAI</Link>
              <Link href="/scamshield" className={desktopLinkClass('/scamshield')}>ScamShield</Link>
              <Link href="/moneycoach" className={desktopLinkClass('/moneycoach')}>Money Coach</Link>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setOpenMenu((value) => !value)}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 text-sm font-semibold text-slate-950">
                    {user.email?.slice(0, 1)?.toUpperCase() ?? 'U'}
                  </span>
                  <span className="hidden sm:block">{user.email}</span>
                </button>
                {openMenu ? (
                  <div className="absolute right-0 top-14 w-64 rounded-3xl border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/30">
                    <p className="px-3 py-2 text-xs uppercase tracking-[0.28em] text-white/45">Profile</p>
                    <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-white/75">
                      Signed in as
                      <div className="mt-1 break-all text-white">{user.email}</div>
                    </div>
                    <button onClick={handleSignOut} className="mt-3 w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">Sign out</button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80">Log in</Link>
                <Link href="/register" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-2">
          <Link href="/dashboard" className={mobileLinkClass('/dashboard')}>Dashboard</Link>
          <Link href="/snapsort" className={mobileLinkClass('/snapsort')}>SnapSort</Link>
          <Link href="/scamshield" className={mobileLinkClass('/scamshield')}>ScamShield</Link>
          <Link href="/moneycoach" className={mobileLinkClass('/moneycoach')}>Coach</Link>
        </div>
      </div>
    </>
  );
}
