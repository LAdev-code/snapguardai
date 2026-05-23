"use client";

import { useEffect, useMemo, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
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
      } catch {
        // silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesQuery = !query
        || [entry.merchant, entry.category, String(entry.total_amount ?? '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);

      const matchesCategory = categoryFilter === 'all'
        || (entry.category ?? 'other').toLowerCase().includes(categoryFilter);

      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, history, searchQuery]);

  function formatMoney(receipt: SavedReceipt) {
    return `${receipt.currency ?? ''} ${receipt.total_amount ?? '—'}`.trim();
  }

  async function downloadPdf(receipt: SavedReceipt) {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;

      const drawHeader = () => {
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
      };

      const ensureSpace = (cursorY: number, requiredHeight: number) => {
        if (cursorY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          drawHeader();
          return margin + 12;
        }

        return cursorY;
      };

      drawHeader();

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
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(pageWidth - margin - 58, cursorY + 14, 52, 20, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL', pageWidth - margin - 54, cursorY + 21);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(totalValue, pageWidth - margin - 54, cursorY + 28);

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

      const items = receipt.items ?? [];
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
          const rowFill = index % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
          doc.setFillColor(rowFill[0], rowFill[1], rowFill[2]);
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

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by SnapGuard AI on ${new Date().toLocaleDateString()}`, margin, pageHeight - 12);

      doc.save(`invoice-${receipt.id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('Unable to generate PDF in this browser.');
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(36,160,219,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_24%),linear-gradient(180deg,#07111f_0%,#0b1d34_52%,#08111d_100%)] text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/70">SnapSortAI</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Receipt history</h1>
            <p className="mt-2 text-sm text-slate-300">Search, filter, preview, and download receipts or invoices you have analysed as PDF.</p>
          </header>

          <section className="mt-6 grid gap-4">
            <Card className="border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_45px_rgba(8,15,28,0.45)]">
              <div className="grid gap-3 md:grid-cols-[1.5fr_0.8fr]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by merchant, category, or amount..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="all">All categories</option>
                  <option value="food">Food</option>
                  <option value="transport">Transport</option>
                  <option value="shopping">Shopping</option>
                  <option value="bills">Bills</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10">
                <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr] gap-3 bg-black/30 px-4 py-4 text-xs uppercase tracking-[0.28em] text-slate-300">
                  <span>Date</span>
                  <span>Description</span>
                  <span>Amount</span>
                  <span>Category</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-white/10 bg-white/5">
                  {loading ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-300">Loading history...</div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-300">No matching receipts found.</div>
                  ) : filteredHistory.map((receipt) => (
                    <div key={receipt.id} className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm text-slate-200">
                      <span>{receipt.transaction_date ?? '—'}</span>
                      <span className="truncate font-medium text-white">{receipt.merchant ?? 'Unknown merchant'}</span>
                      <span>{formatMoney(receipt)}</span>
                      <span>{receipt.category ?? '—'}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setPreviewReceipt(receipt)}
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => downloadPdf(receipt)}
                          className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100 hover:bg-sky-400/20"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {previewReceipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
              <Card className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-white/10 bg-slate-950/90 p-5 shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-100/70">Preview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{previewReceipt.merchant ?? 'Invoice'}</h2>
                  </div>
                  <button
                    onClick={() => setPreviewReceipt(null)}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-200">
                  <div className="rounded-2xl bg-black/20 px-4 py-3">Date: {previewReceipt.transaction_date ?? '—'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3">Category: {previewReceipt.category ?? '—'}</div>
                  <div className="rounded-2xl bg-black/20 px-4 py-3">Amount: {formatMoney(previewReceipt)}</div>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-sky-100/70">Items</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-200">
                    {(previewReceipt.items?.length ?? 0) > 0 ? previewReceipt.items?.map((item, index) => (
                      <div key={`${item?.name ?? 'item'}-${index}`} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                        <span className="truncate pr-3">{item?.name ?? 'Item'}</span>
                        <span className="shrink-0 text-slate-300">{item?.quantity ?? 1} x {item?.price ?? '—'}</span>
                      </div>
                    )) : <p className="text-slate-400">No item details were extracted for this receipt.</p>}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
