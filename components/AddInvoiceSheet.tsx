"use client";

import { useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import { addDays, formatDate, type Invoice, type PaymentTerms } from "@/lib/invoices";

interface Props {
  open: boolean;
  today: string;
  existingNumbers: string[];
  onClose: () => void;
  onAdd: (inv: Omit<Invoice, "id">) => void;
}

type Errors = Partial<Record<"buyerName" | "invoiceNumber" | "amount" | "invoiceDate", string>>;

export default function AddInvoiceSheet({ open, today, existingNumbers, onClose, onAdd }: Props) {
  const [buyerName, setBuyerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [termsDays, setTermsDays] = useState<PaymentTerms>(15);
  const [errors, setErrors] = useState<Errors>({});

  const reset = () => {
    setBuyerName("");
    setInvoiceNumber("");
    setAmount("");
    setInvoiceDate(today);
    setTermsDays(15);
    setErrors({});
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount.replace(/,/g, ""));
    const next: Errors = {};
    if (!buyerName.trim()) next.buyerName = "Enter the buyer's business name";
    if (!invoiceNumber.trim()) next.invoiceNumber = "Enter an invoice number";
    else if (existingNumbers.some((n) => n.toLowerCase() === invoiceNumber.trim().toLowerCase()))
      next.invoiceNumber = "This invoice number already exists";
    if (!amount || !Number.isFinite(amt) || amt <= 0) next.amount = "Enter an amount greater than ₹0";
    if (!invoiceDate) next.invoiceDate = "Pick the invoice date";
    else if (invoiceDate > today) next.invoiceDate = "Invoice date can't be in the future";
    setErrors(next);
    if (Object.keys(next).length) return;

    onAdd({
      buyerName: buyerName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      amount: Math.round(amt),
      invoiceDate,
      termsDays,
    });
    close();
  };

  const dueDate = invoiceDate ? addDays(invoiceDate, termsDays) : null;

  return (
    <Sheet open={open} onClose={close} title="Add invoice" subtitle="We'll track it against the MSMED Act payment deadline.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Buyer name" error={errors.buyerName}>
          <input
            className={inputClass}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="e.g. Kaveri Textiles Pvt Ltd"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice number" error={errors.invoiceNumber}>
            <input
              className={`${inputClass} font-mono text-[15px]`}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2026-0460"
            />
          </Field>
          <Field label="Amount" error={errors.amount}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">₹</span>
              <input
                className={`${inputClass} tnum pl-8`}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
                placeholder="1,25,000"
              />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice date" error={errors.invoiceDate}>
            <input
              type="date"
              className={inputClass}
              value={invoiceDate}
              max={today}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </Field>
          <Field label="Payment terms">
            <select
              className={inputClass}
              value={termsDays}
              onChange={(e) => setTermsDays(Number(e.target.value) as PaymentTerms)}
            >
              <option value={15}>15 days</option>
              <option value={45}>45 days</option>
            </select>
          </Field>
        </div>

        <div className="rounded-2xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {termsDays === 15 ? (
            <>
              <b className="text-ink">15 days</b> applies when there's no written agreement with the buyer.
            </>
          ) : (
            <>
              <b className="text-ink">45 days</b> is the maximum allowed, and only with a written agreement.
            </>
          )}
          {dueDate && (
            <span className="mt-1 block">
              Payment due by <b className="text-ink">{formatDate(dueDate)}</b>
            </span>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white transition hover:bg-brand-dark active:scale-[0.99]"
        >
          Add invoice
        </button>
      </form>
    </Sheet>
  );
}
