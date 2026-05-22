"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    // After signup, Supabase may require email confirmation; redirect to dashboard or login
    router.replace('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white/5 rounded">
        <h1 className="text-2xl font-bold">Create account</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded bg-white/10" />
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 rounded bg-white/10" />
          <button disabled={loading} className="w-full py-2 rounded bg-[var(--color-primary)] text-white">{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        <p className="text-sm mt-4">Have an account? <Link href="/login" className="underline">Sign in</Link></p>
      </div>
    </main>
  );
}
