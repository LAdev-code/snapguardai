"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data?.session) router.replace('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white/5 rounded">
        <h1 className="text-2xl font-bold">Log in</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded bg-white/10" />
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 rounded bg-white/10" />
          <button disabled={loading} className="w-full py-2 rounded bg-[var(--color-primary)] text-white">{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        <p className="text-sm mt-4">No account? <Link href="/register" className="underline">Register</Link></p>
      </div>
    </main>
  );
}
