"use client";

import Sheet from "./Sheet";
import { formatINR, type Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteInvoiceSheet({ invoice, onCancel, onConfirm }: Props) {
  const reminders = invoice.reminders?.length ?? 0;
  const esc = invoice.escalation;
  const hasHistory = reminders > 0 || !!esc;

  const history = [
    esc && `This invoice has been escalated to ${esc.caName}.`,
    reminders > 0 && `It has ${reminders} ${reminders === 1 ? "reminder" : "reminders"} sent.`,
  ].filter(Boolean);

  return (
    <Sheet open onClose={onCancel} title="Delete invoice?" subtitle={`${invoice.buyerName} · ${invoice.invoiceNumber} · ${formatINR(invoice.amount)}`}>
      {hasHistory ? (
        <div className="rounded-2xl bg-over-bg/70 px-4 py-3 text-sm leading-relaxed">
          {history.map((line) => (
            <p key={line as string}>{line}</p>
          ))}
          <p className="mt-1 font-semibold">Deleting it will remove {esc && reminders ? "those records" : "that record"} too. Delete anyway?</p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-ink-soft">This removes the invoice from your list and dashboard. You can&apos;t undo this.</p>
      )}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button onClick={onCancel} className="rounded-xl border border-line py-3.5 text-base font-bold text-ink-soft hover:bg-paper hover:text-ink">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded-xl bg-over py-3.5 text-base font-bold text-white transition hover:brightness-95">
          {hasHistory ? "Delete anyway" : "Delete invoice"}
        </button>
      </div>
    </Sheet>
  );
}
