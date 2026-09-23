"use client";

import { useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import { formatINR, matchCredit, type BankCredit, type Invoice, type MatchResult } from "@/lib/invoices";

interface Props {
  open: boolean;
  invoices: Invoice[];
  /** Invoice to pre-fill the simulated credit from */
  prefillId?: string;
  onClose: () => void;
  onConfirm: (invoiceId: string, credit: BankCredit) => void;
}

function fakeUtr() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return `NEFT/HDFC${digits}`;
}

function creditFor(inv: Invoice) {
  // Bank narrations are usually upper-case and include the payer's name as registered.
  return {
    payerName: inv.buyerName.toUpperCase(),
    amount: String(inv.amount),
    reference: `${fakeUtr()}/${inv.invoiceNumber}`,
  };
}

type Outcome = { kind: "match"; result: MatchResult } | { kind: "none" } | null;

export default function BankCreditSheet({ open, invoices, prefillId, onClose, onConfirm }: Props) {
  const unpaid = invoices.filter((i) => !i.paidOn);
  const initial = unpaid.find((i) => i.id === prefillId);
  const start = initial ? creditFor(initial) : { payerName: "", amount: "", reference: "" };

  const [pickId, setPickId] = useState(initial?.id ?? "");
  const [payerName, setPayerName] = useState(start.payerName);
  const [amount, setAmount] = useState(start.amount);
  const [reference, setReference] = useState(start.reference);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const credit = (): BankCredit => ({
    payerName: payerName.trim(),
    amount: Number(amount.replace(/,/g, "")) || 0,
    reference: reference.trim(),
  });

  const pick = (id: string) => {
    setPickId(id);
    setOutcome(null);
    const inv = unpaid.find((i) => i.id === id);
    if (!inv) return;
    const c = creditFor(inv);
    setPayerName(c.payerName);
    setAmount(c.amount);
    setReference(c.reference);
  };

  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setOutcome(null);
  };

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    const result = matchCredit(credit(), invoices);
    setOutcome(result ? { kind: "match", result } : { kind: "none" });
  };

  const canCheck = payerName.trim() !== "" && credit().amount > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record payment received"
      subtitle="Enter the payment as it shows on your bank statement. We'll match it to the right open invoice."
    >
      <form onSubmit={check} className="space-y-4">
        <Field label="Quick fill from an open invoice" hint="Or type your own values below to test the matching.">
          <select className={inputClass} value={pickId} onChange={(e) => pick(e.target.value)}>
            <option value="">Choose an invoice…</option>
            {unpaid.map((i) => (
              <option key={i.id} value={i.id}>
                {i.buyerName} · {formatINR(i.amount)}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-2xl border border-dashed border-line p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-brand" /> Payment details
          </div>
          <div className="space-y-3">
            <Field label="Received from">
              <input className={inputClass} value={payerName} onChange={edit(setPayerName)} placeholder="Payer name on bank statement" />
            </Field>
            <Field label="Amount credited">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">₹</span>
                <input
                  className={`${inputClass} tnum pl-8`}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^\d,]/g, ""));
                    setOutcome(null);
                  }}
                  placeholder="0"
                />
              </div>
            </Field>
            <Field label="Narration / UTR" hint="Optional. Buyers often quote the invoice number here.">
              <input
                className={`${inputClass} font-mono text-sm`}
                value={reference}
                onChange={edit(setReference)}
                placeholder="NEFT/…/INV-…"
              />
            </Field>
          </div>
        </div>

        {outcome?.kind === "match" && (
          <div className="rounded-2xl border border-paid/25 bg-paid-bg/60 p-4">
            <p className="text-sm font-bold text-paid">Match found</p>
            <p className="mt-1 text-base font-bold">
              {outcome.result.invoice.buyerName}
              <span className="ml-2 font-mono text-sm font-medium text-ink-soft">{outcome.result.invoice.invoiceNumber}</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {outcome.result.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-paid">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {outcome?.kind === "none" && (
          <div className="rounded-2xl border border-due/20 bg-due-bg/60 p-4 text-sm">
            <p className="font-bold text-due">No matching invoice</p>
            <p className="mt-1 text-ink-soft">
              We need an open invoice with the exact same amount, plus a matching payer name or invoice number in the narration.
            </p>
          </div>
        )}

        {outcome?.kind === "match" ? (
          <button
            type="button"
            onClick={() => onConfirm(outcome.result.invoice.id, credit())}
            className="w-full rounded-xl bg-paid py-3.5 text-base font-bold text-white transition hover:brightness-95 active:scale-[0.99]"
          >
            Confirm &amp; mark as paid
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canCheck}
            className="w-full rounded-xl bg-ink py-3.5 text-base font-bold text-white transition hover:bg-ink/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Find matching invoice
          </button>
        )}
      </form>
    </Sheet>
  );
}
