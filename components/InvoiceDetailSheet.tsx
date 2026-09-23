"use client";

import Sheet from "./Sheet";
import StatusBadge from "./StatusBadge";
import { EscalatedBadge } from "./EscalateSheet";
import { canEscalate, formatDate, formatINR, getStatus, type Invoice } from "@/lib/invoices";
import { channelLabel, paymentLink } from "@/lib/business";

interface Props {
  invoice: Invoice;
  today: string;
  onClose: () => void;
  onSendReminder: () => void;
  onMarkPaid: () => void;
  onEscalate: () => void;
}

export function paidLabel(inv: Invoice) {
  return inv.paidVia === "bank" ? "Auto-matched from bank statement" : "Marked paid manually";
}

export default function InvoiceDetailSheet({ invoice: inv, today, onClose, onSendReminder, onMarkPaid, onEscalate }: Props) {
  const info = getStatus(inv, today);
  const reminders = [...(inv.reminders ?? [])].reverse();

  const rows: [string, React.ReactNode][] = [
    ["Amount", <span key="a" className="tnum font-extrabold">{formatINR(inv.amount)}</span>],
    ["Invoice date", formatDate(inv.invoiceDate)],
    ["Payment terms", `${inv.termsDays} days`],
    ["Due date", formatDate(info.dueDate)],
  ];
  if (info.status === "overdue") rows.push(["Days overdue", <span key="o" className="font-bold text-over">{info.daysOverdue}</span>]);
  if (inv.paidOn) rows.push(["Paid on", formatDate(inv.paidOn)]);
  if (inv.paymentRef) rows.push(["Payment ref", <span key="r" className="font-mono text-xs">{inv.paymentRef}</span>]);
  if (inv.escalation)
    rows.push(["CA escalation", `${inv.escalation.caName}, ${formatDate(inv.escalation.date)} ${inv.escalation.time}`]);
  if (!inv.paidOn) rows.push(["Payment link", <span key="l" className="font-mono text-xs">{paymentLink(inv)}</span>]);

  return (
    <Sheet open onClose={onClose} title={inv.buyerName} subtitle={inv.invoiceNumber}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={info.status} />
        {inv.paidOn && (
          <span className={`text-sm font-semibold ${inv.paidVia === "bank" ? "text-brand" : "text-ink-soft"}`}>{paidLabel(inv)}</span>
        )}
      </div>

      <dl className="divide-y divide-line rounded-2xl border border-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold">Reminder history</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink-soft">Reminders sent: {reminders.length}</span>
        </div>
        {reminders.length === 0 ? (
          <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">No reminders sent yet.</p>
        ) : (
          <ol className="space-y-2">
            {reminders.map((r, i) => (
              <li key={`${r.date}-${r.time}-${i}`} className="rounded-2xl border border-line px-4 py-3 text-sm">
                <p className="font-semibold">
                  Reminder sent {formatDate(r.date)}, {r.time} via {channelLabel(r.channels)}
                </p>
                {r.message && (
                  <details className="mt-1 text-ink-soft">
                    <summary className="cursor-pointer text-xs font-semibold text-brand">Show message</summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{r.message}</p>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {canEscalate(info) && inv.escalation && (
        <div className="mt-6">
          <EscalatedBadge invoice={inv} full />
        </div>
      )}

      {info.status !== "paid" && (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {info.status === "overdue" && (
            <button onClick={onSendReminder} className="rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark">
              Send Reminder
            </button>
          )}
          <button
            onClick={onMarkPaid}
            className={`rounded-xl border border-line py-3 text-sm font-bold hover:bg-paper ${info.status === "overdue" ? "" : "sm:col-span-2"}`}
          >
            Mark as paid
          </button>
          {canEscalate(info) && !inv.escalation && (
            <button
              onClick={onEscalate}
              className="rounded-xl border border-[#4b3aa8]/30 py-3 text-sm font-bold text-[#4b3aa8] hover:bg-[#ece9fb] sm:col-span-2"
            >
              Escalate to CA
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
