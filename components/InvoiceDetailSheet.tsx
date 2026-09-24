"use client";

import Sheet from "./Sheet";
import StatusBadge from "./StatusBadge";
import { EscalatedBadge } from "./EscalateSheet";
import {
  canEscalate,
  finalPayment,
  formatDate,
  formatINR,
  getStatus,
  interestAccrued,
  type Invoice,
  type Payment,
} from "@/lib/invoices";
import { channelLabel, paymentLink } from "@/lib/business";

interface Props {
  invoice: Invoice;
  today: string;
  onClose: () => void;
  onSendReminder: () => void;
  onRecordPayment: () => void;
  onEscalate: () => void;
}

export function paidLabel(inv: Invoice) {
  return finalPayment(inv)?.via === "bank" ? "Auto-matched from bank statement" : "Marked paid manually";
}

/** Two-step trail: landed in the virtual account, then swept to the main account. */
export function SettlementTrail({ payment, virtualAccount }: { payment: Payment; virtualAccount: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-soft">
      <span>
        Received in <span className="font-mono">{virtualAccount}</span> on {formatDate(payment.date)}
      </span>
      <span aria-hidden>→</span>
      {payment.settledOn ? (
        <span className="font-semibold text-paid">
          Settled to {payment.settledTo ?? "main account"} on {formatDate(payment.settledOn)}
        </span>
      ) : (
        <span className="settling font-semibold text-brand">Settling to main account…</span>
      )}
    </p>
  );
}

export default function InvoiceDetailSheet({ invoice: inv, today, onClose, onSendReminder, onRecordPayment, onEscalate }: Props) {
  const info = getStatus(inv, today);
  const reminders = [...(inv.reminders ?? [])].reverse();
  const interest = interestAccrued(inv, today);
  const final = finalPayment(inv);

  let running = inv.amount;
  const history = (inv.payments ?? []).map((p) => {
    running = Math.max(0, running - p.amount);
    return { p, after: running };
  });

  const rows: [string, React.ReactNode][] = [
    ["Total amount", <span key="a" className="tnum font-extrabold">{formatINR(inv.amount)}</span>],
    ["Amount paid", <span key="p" className="tnum">{formatINR(info.amountPaid)}</span>],
    [
      "Balance due",
      <span key="b" className={`tnum font-extrabold ${info.balance && info.status === "overdue" ? "text-over" : ""}`}>
        {formatINR(info.balance)}
      </span>,
    ],
  ];
  if (interest > 0)
    rows.push([
      "Interest accrued (illustrative, 12% p.a.)",
      <span key="i" className="tnum font-bold text-over">
        {formatINR(interest)}
      </span>,
    ]);
  rows.push(
    ["Virtual account", <span key="va" className="font-mono text-xs font-semibold">{inv.virtualAccount}</span>],
    ["Invoice date", formatDate(inv.invoiceDate)],
    ["Payment terms", `${inv.termsDays} days`],
    ["Due date", formatDate(info.dueDate)],
  );
  if (info.status === "overdue") rows.push(["Days overdue", <span key="o" className="font-bold text-over">{info.daysOverdue}</span>]);
  if (final) rows.push(["Paid in full on", formatDate(final.date)]);
  if (inv.escalation)
    rows.push(["CA escalation", `${inv.escalation.caName}, ${formatDate(inv.escalation.date)} ${inv.escalation.time}`]);
  if (!final) rows.push(["Payment link", <span key="l" className="font-mono text-xs">{paymentLink(inv)}</span>]);

  return (
    <Sheet open onClose={onClose} title={inv.buyerName} subtitle={inv.invoiceNumber}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={info.status} partial={info.partial} />
        {final && (
          <span className={`text-sm font-semibold ${final.via === "bank" ? "text-brand" : "text-ink-soft"}`}>{paidLabel(inv)}</span>
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
          <h3 className="font-bold">Payment history</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink-soft">
            {history.length === 1 ? "1 payment" : `${history.length} payments`}
          </span>
        </div>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink-soft">No payments received yet.</p>
        ) : (
          <ol className="space-y-2">
            {[...history].reverse().map(({ p, after }) => (
              <li key={p.id} className="rounded-2xl border border-line px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold">
                    <span className="tnum">{formatINR(p.amount)}</span> received {formatDate(p.date)}, {p.time}
                    {p.via === "bank" && <span className="ml-1.5 text-xs font-semibold text-brand">· Auto-matched</span>}
                  </p>
                  <p className="tnum text-xs text-ink-soft">Balance after: {formatINR(after)}</p>
                </div>
                <div className="mt-1">
                  <SettlementTrail payment={p} virtualAccount={inv.virtualAccount} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

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

      {inv.escalation && (
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
            onClick={onRecordPayment}
            className={`rounded-xl border border-line py-3 text-sm font-bold hover:bg-paper ${info.status === "overdue" ? "" : "sm:col-span-2"}`}
          >
            Record Payment
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
