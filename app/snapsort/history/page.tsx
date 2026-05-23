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
  const [previewReceipt, setPreviewReceipt] = useState<SavedReceipt | null>(null);

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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;

      const drawPageHeader = (titleY: number) => {
        doc.setFillColor(8, 13, 23);
        doc.rect(0, 0, pageWidth, 42, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('SnapGuard AI', margin, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(185, 202, 226);
        doc.text('Invoice summary', margin, 28);

        doc.setDrawColor(45, 212, 191);
        doc.setLineWidth(0.6);
        doc.line(margin, 34, pageWidth - margin, 34);

        doc.setTextColor(17, 24, 39);
        return titleY;
      };

      const drawMetricCard = (x: number, y: number, w: number, label: string, value: string) => {
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(x, y, w, 20, 3, 3, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), x + 4, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(value, x + 4, y + 14);
      };

      const ensureSpace = (cursorY: number, requiredHeight: number) => {
        if (cursorY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          drawPageHeader(margin + 10);
          return margin + 10;
        }

        return cursorY;
      };

      drawPageHeader(margin + 10);

      let cursorY = 52;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, cursorY, contentWidth, 52, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(receipt.merchant ?? 'Invoice', margin + 5, cursorY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date: ${receipt.transaction_date ?? '—'}`, margin + 5, cursorY + 24);
      doc.text(`Invoice ID: ${receipt.id}`, margin + 5, cursorY + 31);
      doc.text(`Category: ${receipt.category ?? '—'}`, margin + 5, cursorY + 38);

      const totalValue = `${receipt.currency ?? ''} ${receipt.total_amount ?? '—'}`.trim();
      drawMetricCard(pageWidth - margin - 58, cursorY + 14, 52, 'Total', totalValue);

      cursorY += 62;

      cursorY = ensureSpace(cursorY, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Item details', margin, cursorY);
      cursorY += 5;

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, cursorY, contentWidth, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Description', margin + 4, cursorY + 6.7);
      doc.text('Qty', margin + contentWidth - 48, cursorY + 6.7);
      doc.text('Price', margin + contentWidth - 20, cursorY + 6.7, { align: 'right' });
      cursorY += 13;

      const items = (receipt.items ?? []) as Array<any>;
      if (items.length === 0) {
        cursorY = ensureSpace(cursorY, 16);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, cursorY, contentWidth, 14, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text('No item data was extracted for this receipt.', margin + 4, cursorY + 9);
        cursorY += 18;
      } else {
        items.forEach((item, index) => {
          const description = String(item.name ?? 'Item');
          const quantity = String(item.quantity ?? 1);
          const price = String(item.price ?? '');
          const descriptionLines = doc.splitTextToSize(description, contentWidth - 52);
          const rowHeight = Math.max(14, descriptionLines.length * 5 + 4);

          cursorY = ensureSpace(cursorY, rowHeight + 4);
          const rowFill = index % 2 === 0 ? [248, 250, 252] as const : [241, 245, 249] as const;
          doc.setFillColor(...rowFill);
          doc.roundedRect(margin, cursorY, contentWidth, rowHeight, 2, 2, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(descriptionLines, margin + 4, cursorY + 7);
          doc.setTextColor(71, 85, 105);
          doc.text(quantity, margin + contentWidth - 48, cursorY + 7);
          doc.setTextColor(15, 23, 42);
          doc.text(price, margin + contentWidth - 4, cursorY + 7, { align: 'right' });

          cursorY += rowHeight + 2;
        });
      }

      cursorY = ensureSpace(cursorY + 4, 24);
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(margin, cursorY, contentWidth, 18, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Grand Total', margin + 5, cursorY + 11);
      doc.text(totalValue, pageWidth - margin - 5, cursorY + 11, { align: 'right' });

      cursorY += 28;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by SnapGuard AI on ${new Date().toLocaleDateString()}`, margin, pageHeight - 12);

      doc.save(`invoice-${receipt.id}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('Unable to generate PDF in this browser.');
    }
  }

  function formatMoney(receipt: SavedReceipt) {
    return `${receipt.currency ?? ''} ${receipt.total_amount ?? '—'}`.trim();
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
            <Card className="border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20">
              {loading ? (
                <div className="py-10 text-center text-white/60">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="py-10 text-center text-white/55">No receipts found.</div>
              ) : (
                <div className="space-y-3">
                  {history.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-4 transition hover:border-sky-400/30 hover:bg-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{r.merchant ?? 'Unknown merchant'}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/40">
                          {r.transaction_date ?? '—'} <span className="px-2 text-white/20">•</span> {r.category ?? '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-white/70">
                          {r.currency ?? ''} {r.total_amount ?? '—'}
                        </div>
                        <button
                          onClick={() => setPreviewReceipt(r)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => downloadPdf(r)}
                          className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-400/20"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>

        {previewReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(5,8,16,0.98))] p-5 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Invoice preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{previewReceipt.merchant ?? 'Invoice'}</h2>
                  <p className="mt-1 text-sm text-white/60">Visual preview before you download the PDF.</p>
                </div>
                <button
                  onClick={() => setPreviewReceipt(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">Merchant</p>
                    <p className="mt-2 text-xl font-semibold text-white">{previewReceipt.merchant ?? 'Unknown merchant'}</p>
                    <p className="mt-1 text-sm text-white/60">Invoice ID: {previewReceipt.id}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Total</p>
                    <p className="mt-2 text-xl font-semibold text-sky-100">{formatMoney(previewReceipt)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">Date</p>
                    <p className="mt-2 text-sm text-white/85">{previewReceipt.transaction_date ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">Category</p>
                    <p className="mt-2 text-sm text-white/85">{previewReceipt.category ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">Currency</p>
                    <p className="mt-2 text-sm text-white/85">{previewReceipt.currency ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                  <div className="grid grid-cols-[1fr_72px_96px] gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">
                    <div>Description</div>
                    <div>Qty</div>
                    <div className="text-right">Price</div>
                  </div>
                  <div className="divide-y divide-white/10 bg-white/[0.03]">
                    {(previewReceipt.items ?? []).length > 0 ? (
                      previewReceipt.items?.map((item, index) => (
                        <div
                          key={`${previewReceipt.id}-${index}`}
                          className="grid grid-cols-[1fr_72px_96px] gap-3 px-4 py-3 text-sm text-white/85"
                        >
                          <div className="min-w-0 truncate">{item.name ?? 'Item'}</div>
                          <div>{item.quantity ?? 1}</div>
                          <div className="text-right">{item.price ?? '—'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-white/55">No item data was extracted for this receipt.</div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      downloadPdf(previewReceipt);
                      setPreviewReceipt(null);
                    }}
                    className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => setPreviewReceipt(null)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                  >
                    Keep browsing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
