"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseBrowserClient';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = searchParams.get('next') || '/dashboard';
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.replace(nextPath);
      return;
    }

    setMessage('Check your email to confirm your account, then sign in.');
    setShowConfirmModal(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white/5 rounded">
        <h1 className="text-2xl font-bold">Create account</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded bg-white/10" />
          <div className="space-y-2">
            <input
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              className="w-full p-2 rounded bg-white/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-sm underline text-white/70"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
          <button disabled={loading} className="w-full py-2 rounded bg-[var(--color-primary)] text-white">{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        {message && <div className="mt-3 text-sm text-emerald-400">{message}</div>}
        {showConfirmModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-slate-950 p-6 text-white">
              <h2 className="text-lg font-semibold">Confirm your email</h2>
              <p className="mt-3 text-sm text-white/75">We sent a confirmation email to <strong>{email}</strong>. Click the link in the email to verify your account.</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
                  }}
                  className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Go to sign in
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <p className="text-sm mt-4">Have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="underline">Sign in</Link></p>
      </div>
    </main>
  );
}
