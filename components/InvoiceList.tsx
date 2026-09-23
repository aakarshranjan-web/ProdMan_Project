"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { EscalatedBadge } from "./EscalateSheet";
import { paidLabel } from "./InvoiceDetailSheet";
import RowMenu from "./RowMenu";
import { canEscalate, formatDate, formatINR, getStatus, type Invoice, type StatusInfo } from "@/lib/invoices";

type SortKey = "status" | "due" | "amount";

interface Row {
  inv: Invoice;
  info: StatusInfo;
}

const STATUS_RANK = { overdue: 0, "due-soon": 1, paid: 2 } as const;

function compare(a: Row, b: Row, key: SortKey) {
  switch (key) {
    case "status": {
      const r = STATUS_RANK[a.info.status] - STATUS_RANK[b.info.status];
      if (r !== 0) return r;
      if (a.info.status === "overdue") return b.info.daysOverdue - a.info.daysOverdue; // most overdue first
      if (a.info.status === "due-soon") return a.info.daysLeft - b.info.daysLeft; // nearest deadline first
      return (b.inv.paidOn ?? "").localeCompare(a.inv.paidOn ?? ""); // latest payment first
    }
    case "due":
      return a.info.dueDate.localeCompare(b.info.dueDate);
    case "amount":
      return b.inv.amount - a.inv.amount;
  }
}

function dueHint(info: StatusInfo) {
  if (info.status !== "due-soon") return null;
  if (info.daysLeft === 0) return "Due today";
  if (info.daysLeft === 1) return "Due tomorrow";
  return `Due in ${info.daysLeft} days`;
}

function shortDate(iso: string) {
  return formatDate(iso).replace(/ \d{4}$/, "");
}

function reminderCount(inv: Invoice) {
  const n = inv.reminders?.length ?? 0;
  return n === 0 ? null : n === 1 ? "1 reminder sent" : `${n} reminders sent`;
}

function Overdue({ info }: { info: StatusInfo }) {
  if (info.status !== "overdue") return <span className="text-ink-soft/60">—</span>;
  return (
    <span className="tnum font-bold text-over">
      {info.daysOverdue} {info.daysOverdue === 1 ? "day" : "days"}
    </span>
  );
}

interface Props {
  invoices: Invoice[];
  today: string;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onMarkPaid: (id?: string) => void;
  onSendReminder: (id: string) => void;
  onEscalate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function InvoiceList({ invoices, today, highlightIds, onOpen, onMarkPaid, onSendReminder, onEscalate, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [reversed, setReversed] = useState(false);

  const rows = useMemo(() => {
    const list = invoices.map((inv) => ({ inv, info: getStatus(inv, today) }));
    list.sort((a, b) => compare(a, b, sortKey) * (reversed ? -1 : 1));
    return list;
  }, [invoices, today, sortKey, reversed]);

  const chooseSort = (key: SortKey) => {
    if (key === sortKey) setReversed((r) => !r);
    else {
      setSortKey(key);
      setReversed(false);
    }
  };

  const sortLabels: Record<SortKey, [string, string]> = {
    status: ["Overdue first", "Paid first"],
    due: ["Earliest due", "Latest due"],
    amount: ["Highest amount", "Lowest amount"],
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">
          All invoices <span className="ml-1 text-ink-soft">{invoices.length}</span>
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-ink-soft sm:inline">Sort</span>
          <div className="flex rounded-full border border-line bg-card p-1">
            {(["status", "due", "amount"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => chooseSort(k)}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${
                  sortKey === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {k === "status" ? "Status" : k === "due" ? "Due date" : "Amount"}
                {sortKey === k && <span className="ml-1 inline-block">{reversed ? "↑" : "↓"}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="-mt-2 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span>Sorted by {sortLabels[sortKey][reversed ? 1 : 0].toLowerCase()} · tap again to reverse</span>
        <button onClick={() => onMarkPaid()} className="font-semibold text-brand hover:underline">
          Record a payment received
        </button>
      </div>

      {rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center text-ink-soft">
          No invoices yet. Add your first one to start tracking.
        </div>
      )}

      {/* Phones: cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map(({ inv, info }) => (
          <li
            key={inv.id}
            onClick={() => onOpen(inv.id)}
            className={`cursor-pointer rounded-2xl border bg-card p-4 ${info.status === "overdue" ? "border-over/25" : "border-line"} ${
              highlightIds.includes(inv.id) ? "flash" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{inv.buyerName}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</p>
              </div>
              <div className="-mr-2 flex shrink-0 items-start gap-1">
                <p className="tnum text-lg font-extrabold">{formatINR(inv.amount)}</p>
                <div onClick={(e) => e.stopPropagation()}>
                  <RowMenu label={inv.invoiceNumber} onEdit={() => onEdit(inv.id)} onDelete={() => onDelete(inv.id)} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={info.status} />
                {info.status === "overdue" && (
                  <span className="tnum font-bold text-over">
                    {info.daysOverdue} {info.daysOverdue === 1 ? "day" : "days"} late
                  </span>
                )}
                {info.status === "due-soon" && <span className="text-ink-soft">{dueHint(info)}</span>}
                {info.status === "paid" && inv.paidOn && <span className="text-ink-soft">on {shortDate(inv.paidOn)}</span>}
              </div>
              <span className="text-ink-soft">Due {shortDate(info.dueDate)}</span>
            </div>
            {(info.status === "paid" || reminderCount(inv)) && (
              <p className={`mt-2 text-xs ${info.status === "paid" && inv.paidVia === "bank" ? "font-semibold text-brand" : "text-ink-soft"}`}>
                {info.status === "paid" ? paidLabel(inv) : reminderCount(inv)}
              </p>
            )}
            {info.status !== "paid" && (
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {info.status === "overdue" && (
                  <button
                    onClick={() => onSendReminder(inv.id)}
                    className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
                  >
                    Send Reminder
                  </button>
                )}
                <button
                  onClick={() => onMarkPaid(inv.id)}
                  className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-brand hover:bg-paper"
                >
                  Mark paid
                </button>
              </div>
            )}
            {(inv.escalation || canEscalate(info)) && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                {inv.escalation ? (
                  <EscalatedBadge invoice={inv} />
                ) : (
                  <button
                    onClick={() => onEscalate(inv.id)}
                    className="w-full rounded-xl border border-[#4b3aa8]/30 py-2.5 text-sm font-bold text-[#4b3aa8] hover:bg-[#ece9fb]"
                  >
                    Escalate to CA
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Tablets and up: table */}
      {rows.length > 0 && (
        <div className="hidden overflow-x-auto rounded-3xl border border-line bg-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper/50 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-3 py-3.5">Buyer</th>
                <th className="px-3 py-3.5">Invoice no.</th>
                <th className="px-3 py-3.5 text-right">Amount</th>
                <th className="px-3 py-3.5">Due date</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="whitespace-nowrap px-3 py-3.5">Days overdue</th>
                <th className="px-3 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ inv, info }) => (
                <tr
                  key={inv.id}
                  onClick={() => onOpen(inv.id)}
                  className={`cursor-pointer transition hover:bg-paper/40 ${highlightIds.includes(inv.id) ? "flash" : ""}`}
                >
                  <td className="min-w-[10rem] px-3 py-4 font-bold">{inv.buyerName}</td>
                  <td className="whitespace-nowrap px-3 py-4 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</td>
                  <td className="tnum px-3 py-4 text-right text-base font-extrabold">{formatINR(inv.amount)}</td>
                  <td className="px-3 py-4">
                    <div className="tnum whitespace-nowrap">{formatDate(info.dueDate)}</div>
                    <div className="text-xs text-ink-soft">
                      {info.status === "due-soon" ? dueHint(info) : `${inv.termsDays}-day terms`}
                    </div>
                  </td>
                  <td className="min-w-[11rem] px-3 py-4">
                    <StatusBadge status={info.status} />
                    {info.status === "paid" && inv.paidOn && (
                      <div className={`mt-1 text-xs leading-snug ${inv.paidVia === "bank" ? "font-semibold text-brand" : "text-ink-soft"}`}>
                        {paidLabel(inv)}
                        <span className="block font-normal text-ink-soft">on {shortDate(inv.paidOn)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <Overdue info={info} />
                    {info.status !== "paid" && reminderCount(inv) && (
                      <div className="mt-1 whitespace-nowrap text-xs text-ink-soft">{reminderCount(inv)}</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-end gap-1">
                      <div>
                        {info.status !== "paid" && (
                          <div className="flex justify-end gap-1.5">
                            {info.status === "overdue" && (
                              <button
                                onClick={() => onSendReminder(inv.id)}
                                className="whitespace-nowrap rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                              >
                                Send Reminder
                              </button>
                            )}
                            <button
                              onClick={() => onMarkPaid(inv.id)}
                              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10"
                            >
                              Mark paid
                            </button>
                          </div>
                        )}
                        {(inv.escalation || canEscalate(info)) && (
                          <div className="mt-1.5 flex justify-end">
                            {inv.escalation ? (
                              <EscalatedBadge invoice={inv} />
                            ) : (
                              <button
                                onClick={() => onEscalate(inv.id)}
                                className="whitespace-nowrap rounded-lg border border-[#4b3aa8]/30 px-3 py-1.5 text-xs font-bold text-[#4b3aa8] hover:bg-[#ece9fb]"
                              >
                                Escalate to CA
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <RowMenu label={inv.invoiceNumber} onEdit={() => onEdit(inv.id)} onDelete={() => onDelete(inv.id)} />
                    </div>
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
