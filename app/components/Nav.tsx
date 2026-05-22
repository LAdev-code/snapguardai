"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);

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

  return (
    <nav className="w-full border-b border-[rgba(0,0,0,0.06)] bg-white/5 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold">SnapGuard AI</Link>
          <Link href="/dashboard" className="text-sm text-[var(--color-on-surface-variant)]">Dashboard</Link>
          <Link href="/snapsort" className="text-sm text-[var(--color-on-surface-variant)]">SnapSortAI</Link>
          <Link href="/scamshield" className="text-sm text-[var(--color-on-surface-variant)]">ScamShield</Link>
          <Link href="/moneycoach" className="text-sm text-[var(--color-on-surface-variant)]">Money Coach</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-sm">{user.email}</div>
              <button onClick={handleSignOut} className="text-sm underline">Sign out</button>
            </>
          ) : (
            <Link href="/login" className="text-sm">Log in</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
