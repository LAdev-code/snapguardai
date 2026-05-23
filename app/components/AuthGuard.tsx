"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseBrowserClient';

export default function AuthGuard({ children, allowAnonymous = false }: { children: React.ReactNode; allowAnonymous?: boolean }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        if (allowAnonymous) {
          setAuthorized(true);
        } else {
          router.replace('/login');
        }
      } else {
        setAuthorized(true);
      }
    }).catch(() => {
      if (mounted) {
        if (allowAnonymous) {
          setAuthorized(true);
        } else {
          router.replace('/login');
        }
      }
    }).finally(() => {
      if (mounted) setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session) {
        if (allowAnonymous) {
          setAuthorized(true);
          setChecking(false);
        } else {
          setAuthorized(false);
          router.replace('/login');
        }
      } else {
        setAuthorized(true);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [allowAnonymous, router]);

  if (checking) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!authorized) return null;
  return <>{children}</>;
}
