"use client";

import { useCallback, useEffect, useState } from "react";
import AddInvoiceSheet from "@/components/AddInvoiceSheet";
import BankCreditSheet from "@/components/BankCreditSheet";
import InvoiceList from "@/components/InvoiceList";
import { formatDate, formatINR, seedInvoices, todayISO, type BankCredit, type Invoice } from "@/lib/invoices";

export default function Home() {
  // "Today" comes from the viewer's device clock, so it's resolved after mount.
  const [today, setToday] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [credit, setCredit] = useState<{ key: number; prefillId?: string } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = todayISO();
    setToday(t);
    setInvoices(seedInvoices(t));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const flash = (id: string) => {
    setHighlightId(id);
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2500);
  };

  const addInvoice = (inv: Omit<Invoice, "id">) => {
    const id = `u${Date.now()}`;
    setInvoices((list) => [...list, { ...inv, id }]);
    setToast(`Invoice ${inv.invoiceNumber} added`);
    flash(id);
  };

  const confirmCredit = (invoiceId: string, c: BankCredit) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    setInvoices((list) =>
      list.map((i) => (i.id === invoiceId ? { ...i, paidOn: today!, paymentRef: c.reference || undefined } : i)),
    );
    setCredit(null);
    if (inv) setToast(`${formatINR(c.amount)} from ${inv.buyerName} matched · ${inv.invoiceNumber} marked paid`);
    flash(invoiceId);
  };

  const openCredit = useCallback((prefillId?: string) => setCredit({ key: Date.now(), prefillId }), []);
  const closeCredit = useCallback(() => setCredit(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-extrabold">₹</div>
            <span className="text-sm font-semibold tracking-wide text-white/70">Invoice Tracker</span>
          </div>
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Who owes you, and since when</h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/65">
                Deadlines follow the MSMED Act: buyers must pay within 15 days, or up to 45 days with a written agreement.
                {today && <span className="text-white/85"> Today is {formatDate(today)}.</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <button
                onClick={() => openCredit()}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Simulate bank credit
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-ink transition hover:bg-white/90"
              >
                + Add invoice
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-12 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-[28px] bg-paper p-4 shadow-[0_-8px_30px_-12px_rgba(15,29,46,0.35)] sm:p-6">
          {today ? (
            <InvoiceList invoices={invoices} today={today} highlightId={highlightId} onRecordCredit={openCredit} />
          ) : (
            <div className="h-64 animate-pulse rounded-3xl bg-line/50" />
          )}
        </div>
      </main>

      {today && (
        <AddInvoiceSheet
          open={addOpen}
          today={today}
          existingNumbers={invoices.map((i) => i.invoiceNumber)}
          onClose={closeAdd}
          onAdd={addInvoice}
        />
      )}

      {credit && (
        <BankCreditSheet
          key={credit.key}
          open
          invoices={invoices}
          prefillId={credit.prefillId}
          onClose={closeCredit}
          onConfirm={confirmCredit}
        />
      )}

      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 transition ${
          toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {toast && (
          <div className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
        )}
      </div>
    </div>
  );
}
