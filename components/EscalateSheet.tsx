"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { btn, IconShield, Steps, SuccessState } from "./ui";
import { formatDate, formatINR, type Invoice } from "@/lib/invoices";
import { APP_NAME } from "@/lib/business";
import { CA_PARTNERS, type CAPartner } from "@/lib/caPartners";

interface Props {
  invoice: Invoice;
  daysOverdue: number;
  onClose: () => void;
  onRequest: (caName: string) => void;
}

/** Handoff to a CA partner. We never file the MSME Samadhaan complaint ourselves. */
export default function EscalateSheet({ invoice, daysOverdue, onClose, onRequest }: Props) {
  const [sentTo, setSentTo] = useState<CAPartner | null>(null);
  const reminders = invoice.reminders?.length ?? 0;

  if (sentTo) {
    return (
      <Sheet open onClose={onClose} title="Request sent">
        <Steps current={2} labels={["Choose a CA partner", "Request sent"]} />
        <SuccessState title={`Request sent to ${sentTo.name}.`}>
          <p className="mt-1 text-ink-soft">They&apos;ll reach out within 1 business day.</p>
          {invoice.escalation && (
            <p className="mt-4 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft">
              Requested {formatDate(invoice.escalation.date)}, {invoice.escalation.time}
            </p>
          )}
          <button onClick={onClose} className={`${btn("primary")} mt-6`}>
            Done
          </button>
        </SuccessState>
      </Sheet>
    );
  }

  const summary: [string, React.ReactNode][] = [
    ["Buyer", invoice.buyerName],
    ["Invoice number", <span key="n" className="font-mono text-xs">{invoice.invoiceNumber}</span>],
    ["Amount", <span key="a" className="tnum font-extrabold">{formatINR(invoice.amount)}</span>],
    ["Days overdue", <span key="d" className="font-bold text-over">{daysOverdue}</span>],
    ["Reminders sent", reminders],
  ];

  return (
    <Sheet open onClose={onClose} title="Escalate to a CA partner">
      <Steps
        current={1}
        labels={["Choose a CA partner", "Request sent"]}
        next="the CA partner you pick contacts you within 1 business day"
      />
      <p className="flex gap-2.5 rounded-2xl bg-due-bg/70 px-4 py-3 text-sm leading-relaxed text-ink">
        <IconShield size={16} className="mt-0.5 text-due" />
        <span>
        This invoice has been overdue for 45+ days. We can connect you with a vetted CA partner who can file an MSME
        Samadhaan complaint on your behalf. {APP_NAME} does not file complaints directly — a CA handles this step.
        </span>
      </p>

      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-paper/40 text-sm">
        {summary.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mb-2 mt-6 font-bold">Choose a CA partner</h3>
      <ul className="space-y-2.5">
        {CA_PARTNERS.map((ca) => (
          <li
            key={ca.id}
            className="flex flex-col gap-3 rounded-2xl border border-line p-4 transition hover:border-brand/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-bold">{ca.name}</p>
              <p className="text-xs text-ink-soft">{ca.city}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-brand/10 px-2.5 py-1 font-bold text-brand">{ca.specialization}</span>
                <span className="font-semibold text-ink-soft">
                  {ca.rating}★, {ca.cases}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onRequest(ca.name);
                setSentTo(ca);
              }}
              className={`${btn("primary", "md")} shrink-0`}
            >
              Request Connection
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        The CA agrees their fee and next steps with you directly. Keep sending reminders in the meantime.
      </p>
    </Sheet>
  );
}

export function EscalatedBadge({ invoice, full = false }: { invoice: Invoice; full?: boolean }) {
  const e = invoice.escalation;
  if (!e) return null;
  const date = full ? formatDate(e.date) : formatDate(e.date).replace(/ \d{4}$/, "");
  return (
    <span
      className={`inline-flex ${full ? "" : "max-w-[12rem]"} items-start gap-1.5 rounded-lg bg-ink/[0.06] px-2.5 py-1.5 text-left text-xs font-bold leading-snug text-ink ring-1 ring-inset ring-ink/10`}
    >
      <IconShield size={12} className="mt-0.5 text-brand" />
      Escalated to {e.caName} — {date}
    </span>
  );
}
