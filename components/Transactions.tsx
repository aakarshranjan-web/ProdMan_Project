"use client";

import { useMemo, useState } from "react";
import { inputClass } from "./Sheet";
import { btn, EmptyState, IconCheck, Spinner } from "./ui";
import { formatDate, formatINR, type Invoice, type Payment } from "@/lib/invoices";

interface Txn {
  payment: Payment;
  invoice: Invoice;
}

/** "9:38 am" -> minutes since midnight, for ordering payments on the same day. */
function minutes(time: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(time.trim());
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
  return h * 60 + Number(m[2]);
}

/** Every payment recorded against every invoice, read straight from the invoices' payment records. */
export default function Transactions({ invoices }: { invoices: Invoice[] }) {
  const [va, setVa] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const all = useMemo(() => {
    const list: Txn[] = invoices.flatMap((invoice) => (invoice.payments ?? []).map((payment) => ({ payment, invoice })));
    return list.sort(
      (a, b) => b.payment.date.localeCompare(a.payment.date) || minutes(b.payment.time) - minutes(a.payment.time),
    );
  }, [invoices]);

  const accounts = useMemo(() => [...new Set(all.map((t) => t.invoice.virtualAccount))].sort(), [all]);

  const shown = all.filter(
    (t) =>
      (!va || t.invoice.virtualAccount === va) &&
      (!from || t.payment.date >= from) &&
      (!to || t.payment.date <= to),
  );
  const total = shown.reduce((sum, t) => sum + t.payment.amount, 0);
  const filtered = !!(va || from || to);

  const clear = () => {
    setVa("");
    setFrom("");
    setTo("");
  };

  return (
    <section className="rounded-3xl border border-line bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">Transactions</h3>
          <p className="mt-0.5 text-sm text-ink-soft">Every payment received into an invoice&apos;s virtual account</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Amount shown</p>
          <p className="tnum text-2xl font-extrabold tracking-tight">{formatINR(total)}</p>
          <p className="text-xs text-ink-soft">
            {shown.length === 1 ? "1 transaction" : `${shown.length} transactions`}
            {filtered && ` of ${all.length}`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Virtual account</span>
          <select className={`${inputClass} py-2.5 font-mono text-sm`} value={va} onChange={(e) => setVa(e.target.value)}>
            <option value="">All virtual accounts</option>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-soft">From</span>
          <input type="date" className={`${inputClass} py-2.5 text-sm`} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-soft">To</span>
          <input type="date" className={`${inputClass} py-2.5 text-sm`} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          onClick={clear}
          disabled={!filtered}
          className={btn("secondary", "md")}
        >
          Clear filters
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={all.length ? "No transactions found for this filter" : "No transactions yet"}
            hint={all.length ? "Try another virtual account or date range, or clear the filters." : "Payments recorded against invoices appear here."}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-paper/50 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-3 py-3">Date received</th>
                <th className="px-3 py-3">Buyer name</th>
                <th className="px-3 py-3">Invoice number</th>
                <th className="px-3 py-3">Virtual account</th>
                <th className="px-3 py-3 text-right">Amount received</th>
                <th className="px-3 py-3">Settlement status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map(({ payment: p, invoice: inv }) => (
                <tr key={p.id} className="transition-colors hover:bg-paper/70">
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="tnum">{formatDate(p.date)}</div>
                    <div className="text-xs text-ink-soft">{p.time}</div>
                  </td>
                  <td className="px-3 py-3 font-semibold">{inv.buyerName}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{inv.virtualAccount}</td>
                  <td className="tnum whitespace-nowrap px-3 py-3 text-right font-extrabold">{formatINR(p.amount)}</td>
                  <td className="px-3 py-3">
                    {p.settledOn ? (
                      <span
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-paid-bg px-2.5 py-1 text-xs font-bold text-paid ring-1 ring-inset ring-paid/15"
                        title={`Settled to ${p.settledTo ?? "main account"}`}
                      >
                        <IconCheck size={12} />
                        Settled to main account
                      </span>
                    ) : (
                      <span className="settling inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand ring-1 ring-inset ring-brand/15">
                        <Spinner className="h-3 w-3 border-2 border-brand/30 border-t-brand" />
                        Received in VA
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
