"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { formatINR, type Channel, type Invoice } from "@/lib/invoices";
import { BUSINESS_NAME, paymentLink, reminderMessage } from "@/lib/business";

interface Props {
  invoice: Invoice;
  daysOverdue: number;
  onClose: () => void;
  onSend: (message: string, channels: Channel[]) => void;
}

function Toggle({ on, onChange, label, detail }: { on: boolean; onChange: (v: boolean) => void; label: string; detail: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        on ? "border-brand/40 bg-brand/5" : "border-line"
      }`}
    >
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ink-soft">{detail}</span>
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function ReminderSheet({ invoice, daysOverdue, onClose, onSend }: Props) {
  const draft = reminderMessage(invoice, daysOverdue);
  const [message, setMessage] = useState(draft);
  const [whatsapp, setWhatsapp] = useState(true);
  const [email, setEmail] = useState(true);
  const count = invoice.reminders?.length ?? 0;

  const channels: Channel[] = [...(whatsapp ? ["whatsapp" as const] : []), ...(email ? ["email" as const] : [])];

  return (
    <Sheet
      open
      onClose={onClose}
      title="Send payment reminder"
      subtitle={`${invoice.buyerName} · ${formatINR(invoice.amount)} · ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue`}
    >
      {count > 0 && (
        <p className="mb-4 rounded-xl bg-paper px-3.5 py-2.5 text-sm text-ink-soft">
          {count === 1 ? "1 reminder" : `${count} reminders`} already sent for this invoice.
        </p>
      )}

      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold">Message</span>
        {message !== draft && (
          <button onClick={() => setMessage(draft)} className="text-xs font-semibold text-brand hover:underline">
            Reset to template
          </button>
        )}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        className="w-full resize-y rounded-xl border border-line bg-paper/60 px-3.5 py-3 text-[15px] leading-relaxed outline-none transition focus:border-brand focus:bg-card focus:ring-4 focus:ring-brand/10"
      />
      <p className="mt-1.5 text-xs text-ink-soft">Signed as {BUSINESS_NAME}</p>

      <div className="mt-4">
        <span className="mb-1.5 block text-sm font-semibold">Payment link</span>
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3.5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-brand">
            <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          <span className="truncate font-mono text-sm">{paymentLink(invoice)}</span>
        </div>
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-sm font-semibold">Send via</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Toggle on={whatsapp} onChange={setWhatsapp} label="WhatsApp" detail="Buyer's business number" />
          <Toggle on={email} onChange={setEmail} label="Email" detail="Buyer's accounts team" />
        </div>
      </div>

      <button
        disabled={channels.length === 0 || !message.trim()}
        onClick={() => onSend(message.trim(), channels)}
        className="mt-6 w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white transition hover:bg-brand-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send Reminder
      </button>
      {channels.length === 0 && <p className="mt-2 text-center text-sm text-over">Turn on at least one channel</p>}
    </Sheet>
  );
}
