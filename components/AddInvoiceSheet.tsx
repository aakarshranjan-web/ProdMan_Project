"use client";

import { useEffect, useRef, useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import WhatsAppThread from "./WhatsAppThread";
import { addDays, formatDate, type Invoice, type PaymentTerms } from "@/lib/invoices";
import { mockExtractFromPhoto, mockExtractFromWhatsApp, nextInvoiceNumber, type ExtractedInvoice } from "@/lib/extract";

interface Props {
  open: boolean;
  today: string;
  invoices: Invoice[];
  onClose: () => void;
  onAdd: (inv: Omit<Invoice, "id">) => void;
  /** When set, the form edits this invoice instead of creating a new one. */
  editing?: Invoice;
}



type Errors = Partial<Record<"buyerName" | "invoiceNumber" | "amount" | "invoiceDate", string>>;
type Source = "photo" | "whatsapp";
type View = "form" | "whatsapp" | "reading";

const READ_MS = 1600;

export default function AddInvoiceSheet({ open, today, invoices, onClose, onAdd, editing }: Props) {
  const [buyerName, setBuyerName] = useState(editing?.buyerName ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoiceNumber ?? "");
  const [amount, setAmount] = useState(editing ? editing.amount.toLocaleString("en-IN") : "");
  const [invoiceDate, setInvoiceDate] = useState(editing?.invoiceDate ?? today);
  const [termsDays, setTermsDays] = useState<PaymentTerms>(editing?.termsDays ?? 15);
  const [errors, setErrors] = useState<Errors>({});

  const [view, setView] = useState<View>("form");
  const [filledFrom, setFilledFrom] = useState<Source | null>(null);
  const [readingFrom, setReadingFrom] = useState<Source>("photo");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setBuyerName("");
    setInvoiceNumber("");
    setAmount("");
    setInvoiceDate(today);
    setTermsDays(15);
    setErrors({});
    setView("form");
    setFilledFrom(null);
    setPhotoUrl(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const fill = (x: ExtractedInvoice, source: Source) => {
    setBuyerName(x.buyerName);
    setInvoiceNumber(x.invoiceNumber);
    setAmount(x.amount.toLocaleString("en-IN"));
    setInvoiceDate(x.invoiceDate);
    setTermsDays(x.termsDays);
    setErrors({});
    setFilledFrom(source);
    setView("form");
  };

  // Simulated OCR: show a reading state, then fill the form for review.
  const read = (source: Source) => {
    setReadingFrom(source);
    setView("reading");
    timer.current = setTimeout(() => {
      fill(source === "photo" ? mockExtractFromPhoto(invoices, today) : mockExtractFromWhatsApp(invoices, today), source);
    }, READ_MS);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    read("photo");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount.replace(/,/g, ""));
    const next: Errors = {};
    if (!buyerName.trim()) next.buyerName = "Enter the buyer's business name";
    if (!invoiceNumber.trim()) next.invoiceNumber = "Enter an invoice number";
    else if (
      invoices.some((i) => i.id !== editing?.id && i.invoiceNumber.toLowerCase() === invoiceNumber.trim().toLowerCase())
    )
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
  const reminderCount = editing?.reminders?.length ?? 0;

  if (view === "reading") {
    return (
      <Sheet open={open} onClose={close} title="Add invoice">
        <div className="flex flex-col items-center py-10 text-center">
          {readingFrom === "photo" && photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Uploaded invoice" className="mb-6 h-40 w-auto max-w-full rounded-xl border border-line object-cover shadow-sm" />
          ) : (
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[#128c7e]/10 text-3xl">💬</div>
          )}
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-brand" />
          <p className="mt-4 text-lg font-bold">Reading invoice…</p>
          <p className="mt-1 text-sm text-ink-soft">Picking out buyer, amount, date and terms</p>
        </div>
      </Sheet>
    );
  }

  if (view === "whatsapp") {
    return (
      <Sheet open={open} onClose={close} title="Import from WhatsApp" subtitle="Invoices your team forwards on WhatsApp show up here.">
        <WhatsAppThread today={today} invoiceNumber={nextInvoiceNumber(invoices, today)} onImport={() => read("whatsapp")} />
        <button type="button" onClick={() => setView("form")} className="mt-4 text-sm font-semibold text-ink-soft hover:text-ink">
          ← Back to manual entry
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={editing ? "Edit invoice" : "Add invoice"}
      subtitle={editing ? "Fix any details that were entered wrong." : "We'll track it against the MSMED Act payment deadline."}
    >
      {editing && (reminderCount > 0 || editing.escalation) && (
        <div className="mb-4 rounded-2xl bg-due-bg/70 px-4 py-3 text-sm leading-relaxed">
          This invoice{" "}
          {reminderCount > 0 && (
            <>
              has {reminderCount} {reminderCount === 1 ? "reminder" : "reminders"} sent
            </>
          )}
          {reminderCount > 0 && editing.escalation && " and "}
          {editing.escalation && <>is escalated to {editing.escalation.caName}</>}. Editing it won&apos;t undo those actions.
        </div>
      )}

      {!editing && (
        <div className="mb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-paper/60 px-3 py-3 text-sm font-bold transition hover:border-brand hover:text-brand"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Upload photo
          </button>
          <button
            type="button"
            onClick={() => setView("whatsapp")}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-paper/60 px-3 py-3 text-sm font-bold transition hover:border-[#128c7e] hover:text-[#128c7e]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z" />
            </svg>
            From WhatsApp
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      )}

      {editing ? null : filledFrom ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
          {filledFrom === "photo" && photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
          )}
          <div>
            <p className="font-bold text-brand">Filled from {filledFrom === "photo" ? "your photo" : "WhatsApp"}</p>
            <p className="text-ink-soft">Check the details and fix anything that looks off before saving.</p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <span className="h-px flex-1 bg-line" /> or type it in <span className="h-px flex-1 bg-line" />
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Buyer name" error={errors.buyerName}>
          <input
            className={inputClass}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="e.g. Kaveri Textiles Pvt Ltd"
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
          {editing ? "Save changes" : filledFrom ? "Looks good, save invoice" : "Add invoice"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl border border-line py-3.5 text-base font-bold text-ink-soft transition hover:bg-paper hover:text-ink"
          >
            Cancel
          </button>
        )}
      </form>
    </Sheet>
  );
}
