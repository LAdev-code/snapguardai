"use client";
import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import AuthGuard from '../components/AuthGuard';

export default function ScamShieldPage() {
  const [tab, setTab] = useState<'message'|'image'>('message');
  return (
    <AuthGuard>
      <main className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header>
            <h1 className="text-2xl font-bold">ScamShield</h1>
            <p className="text-sm">Check messages or payment proof for scams.</p>
          </header>

          <div className="mt-6">
            <div className="flex gap-2">
              <button onClick={() => setTab('message')} className={`px-4 py-2 rounded ${tab==='message' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/5'}`}>Message Check</button>
              <button onClick={() => setTab('image')} className={`px-4 py-2 rounded ${tab==='image' ? 'bg-[var(--color-primary)] text-white' : 'bg-white/5'}`}>Payment Proof</button>
            </div>

            <div className="mt-4">
              {tab==='message' ? (
                <Card>
                  <textarea className="w-full p-3 bg-white/5 rounded" rows={6} placeholder="Paste SMS or WhatsApp message here" />
                  <div className="mt-3"><Button>Scan Message</Button></div>
                </Card>
              ) : (
                <Card>
                  <div className="border-2 border-dashed p-6 text-center rounded">Upload image</div>
                  <div className="mt-3"><Button>Verify Proof</Button></div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
