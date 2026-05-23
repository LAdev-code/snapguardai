"use client";

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { supabase } from '../../../lib/supabaseBrowserClient';
import Card from '../../components/Card';

type SavedReceipt = {
  id: number;
  created_at: string;
  merchant: string | null;
  total_amount: number | string | null;
  currency: string | null;
  category: string | null;
  transaction_date: string | null;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data, error } = await supabase
          .from('receipts_data')
          .select('id, created_at, merchant, total_amount, currency, category, transaction_date, items')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error && data && mounted) {
          setHistory(data as SavedReceipt[]);
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  async function downloadPdf(receipt: SavedReceipt) {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(receipt.merchant ?? 'Invoice', 14, 20);
      doc.setFontSize(11);
      doc.text(`Date: ${receipt.transaction_date ?? '—'}`, 14, 30);
      doc.text(`Invoice ID: ${receipt.id}`, 14, 36);

      doc.setFontSize(12);
      doc.text('Items:', 14, 48);

      const items = (receipt.items ?? []) as Array<any>;
      let y = 56;
      if (items.length === 0) {
        doc.text('- (no item data) -', 18, y);
        y += 6;
      } else {
        items.forEach((it, idx) => {
          const line = `${it.name ?? 'Item'}  x${it.quantity ?? 1}  ${it.price ?? ''}`;
          doc.text(line, 18, y);
          y += 6;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      }

      doc.setFontSize(12);
      doc.text(`Total: ${receipt.currency ?? ''} ${receipt.total_amount ?? '—'}`, 14, y + 10);

      doc.save(`invoice-${receipt.id}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('Unable to generate PDF in this browser.');
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[linear-gradient(180deg,_rgba(7,10,18,1),_rgba(11,15,24,1))] text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">SnapSortAI</p>
            <h1 className="mt-2 text-3xl font-semibold">Receipt history</h1>
            <p className="mt-2 text-sm text-white/65">Download invoices you have analysed as PDF.</p>
          </header>

          <section className="mt-6 grid gap-4">
            <Card className="p-4">
              {loading ? (
                <div className="py-8 text-center">Loading...</div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-white/60">No receipts found.</div>
              ) : (
                <div className="space-y-3">
                  {history.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                      <div>
                        <div className="font-medium">{r.merchant ?? 'Unknown merchant'}</div>
                        <div className="text-xs text-white/45">{r.transaction_date ?? '—'} • {r.category ?? '—'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-white/60">{r.currency ?? ''} {r.total_amount ?? '—'}</div>
                        <button onClick={() => downloadPdf(r)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">Download PDF</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
