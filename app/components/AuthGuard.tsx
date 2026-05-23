"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseBrowserClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace('/login');
      } else {
        setAuthorized(true);
      }
    }).catch(() => {
      if (mounted) router.replace('/login');
    }).finally(() => {
      if (mounted) setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session) {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!authorized) return null;
  return <>{children}</>;
}
