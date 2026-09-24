"use client";

import { useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import { btn } from "./ui";
import { formatDate, formatINR, getStatus, type Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice;
  today: string;
  onClose: () => void;
  onRecord: (amount: number) => void;
}

/** Records money the buyer paid into this invoice's virtual account (full or part). */
export default function RecordPaymentSheet({ invoice, today, onClose, onRecord }: Props) {
  const { amountPaid, balance } = getStatus(invoice, today);
  const [amount, setAmount] = useState(balance.toLocaleString("en-IN"));
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount.replace(/,/g, ""));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than ₹0");
    if (value > balance) return setError(`That's more than the ${formatINR(balance)} balance due`);
    onRecord(Math.round(value));
  };

  const set = (n: number) => {
    setAmount(n.toLocaleString("en-IN"));
    setError(null);
  };

  return (
    <Sheet open onClose={onClose} title="Record payment" subtitle={`${invoice.buyerName} · ${invoice.invoiceNumber}`}>
      <div className="rounded-2xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Virtual account for this invoice</p>
        <p className="mt-1 font-mono text-base font-bold">{invoice.virtualAccount}</p>
        <p className="mt-1 text-xs text-ink-soft">Payments land here first, then settle to your main bank account.</p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Total", invoice.amount],
          ["Paid so far", amountPaid],
          ["Balance due", balance],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-paper px-2 py-3">
            <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
            <dd className="tnum mt-0.5 text-[15px] font-extrabold">{formatINR(v as number)}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field label={`Amount received on ${formatDate(today)}`} error={error ?? undefined}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">₹</span>
            <input
              className={`${inputClass} tnum pl-8`}
              inputMode="numeric"
              value={amount}
              autoFocus
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d,]/g, ""));
                setError(null);
              }}
            />
          </div>
        </Field>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={() => set(balance)} className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-brand hover:text-brand">
            Full balance
          </button>
          {balance >= 2 && (
            <button
              type="button"
              onClick={() => set(Math.round(balance / 2))}
              className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-brand hover:text-brand"
            >
              Half
            </button>
          )}
        </div>
        {Number.isFinite(value) && value > 0 && value < balance && (
          <p className="text-sm text-ink-soft">
            {formatINR(balance - value)} will still be due after this payment. The invoice will show as Partially paid.
          </p>
        )}
        <button
          type="submit"
          className={btn("primary")}
        >
          Record payment
        </button>
      </form>
    </Sheet>
  );
}
