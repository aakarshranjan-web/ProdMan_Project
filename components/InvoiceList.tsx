"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { btn, EmptyState } from "./ui";
import { EscalatedBadge } from "./EscalateSheet";
import { paidLabel } from "./InvoiceDetailSheet";
import RowMenu from "./RowMenu";
import {
  canEscalate,
  finalPayment,
  formatDate,
  formatINR,
  getStatus,
  interestAccrued,
  paidOn,
  type Invoice,
  type StatusInfo,
} from "@/lib/invoices";

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
      return (paidOn(b.inv) ?? "").localeCompare(paidOn(a.inv) ?? ""); // latest payment first
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

/** Balance still due on part-paid invoices, and Section 16 interest on overdue balances. */
function MoneyLine({ inv, info, today, className = "" }: { inv: Invoice; info: StatusInfo; today: string; className?: string }) {
  const interest = interestAccrued(inv, today);
  if (!info.partial && !interest) return null;
  return (
    <div className={`tnum whitespace-nowrap text-xs leading-snug ${className}`}>
      {info.partial && <div className="text-ink-soft">Balance {formatINR(info.balance)}</div>}
      {interest > 0 && (
        <div className="font-semibold text-over" title="Interest accrued (Section 16, MSMED Act — compound, 3x RBI Bank Rate)">
          +{formatINR(interest)} interest
        </div>
      )}
    </div>
  );
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
  onRecordPayment: (id: string) => void;
  onSendReminder: (id: string) => void;
  onEscalate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function InvoiceList({ invoices, today, highlightIds, onOpen, onRecordPayment, onSendReminder, onEscalate, onEdit, onDelete }: Props) {
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
      <p className="-mt-2 mb-4 text-xs text-ink-soft">
        Sorted by {sortLabels[sortKey][reversed ? 1 : 0].toLowerCase()} · tap again to reverse
      </p>

      {rows.length === 0 && (
        <EmptyState title="No invoices yet" hint="Add your first invoice with + Add invoice to start tracking deadlines." />
      )}

      {/* Phones: cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map(({ inv, info }) => (
          <li
            key={inv.id}
            onClick={() => onOpen(inv.id)}
            className={`cursor-pointer rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md ${
              info.status === "overdue" ? "border-over/25 shadow-[inset_3px_0_0_var(--color-over)]" : "border-line"
            } ${
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
            <MoneyLine inv={inv} info={info} today={today} className="mt-2 text-right" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 whitespace-nowrap border-t border-line pt-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={info.status} partial={info.partial} />
                {info.status === "overdue" && (
                  <span className="tnum font-bold text-over">
                    {info.daysOverdue} {info.daysOverdue === 1 ? "day" : "days"} late
                  </span>
                )}
                {info.status === "due-soon" && <span className="text-ink-soft">{dueHint(info)}</span>}
                {info.status === "paid" && <span className="text-ink-soft">on {shortDate(paidOn(inv)!)}</span>}
              </div>
              <span className="text-ink-soft">Due {shortDate(info.dueDate)}</span>
            </div>
            {(info.status === "paid" || reminderCount(inv)) && (
              <p className={`mt-2 text-xs ${info.status === "paid" && finalPayment(inv)?.via === "bank" ? "font-semibold text-brand" : "text-ink-soft"}`}>
                {info.status === "paid" ? paidLabel(inv) : reminderCount(inv)}
              </p>
            )}
            {info.status !== "paid" && (
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {info.status === "overdue" && (
                  <button
                    onClick={() => onSendReminder(inv.id)}
                    className={`${btn("primary", "md")} flex-1`}
                  >
                    Send Reminder
                  </button>
                )}
                <button
                  onClick={() => onRecordPayment(inv.id)}
                  className={`${btn(info.status === "overdue" ? "secondary" : "primary", "md")} flex-1`}
                >
                  Record Payment
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
                    className={`${btn("secondary", "md")} w-full`}
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
                  className={`cursor-pointer transition-colors hover:bg-paper/70 ${
                    info.status === "overdue" ? "shadow-[inset_3px_0_0_var(--color-over)]" : ""
                  } ${highlightIds.includes(inv.id) ? "flash" : ""}`}
                >
                  <td className="min-w-[10rem] px-3 py-4 font-bold">{inv.buyerName}</td>
                  <td className="whitespace-nowrap px-3 py-4 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</td>
                  <td className="px-3 py-4 text-right">
                    <div className="tnum text-base font-extrabold">{formatINR(inv.amount)}</div>
                    <MoneyLine inv={inv} info={info} today={today} />
                  </td>
                  <td className="px-3 py-4">
                    <div className="tnum whitespace-nowrap">{formatDate(info.dueDate)}</div>
                    <div className="text-xs text-ink-soft">
                      {info.status === "due-soon" ? dueHint(info) : `${inv.termsDays}-day terms`}
                    </div>
                  </td>
                  <td className="min-w-[11rem] px-3 py-4">
                    <StatusBadge status={info.status} partial={info.partial} />
                    {info.status === "paid" && (
                      <div className={`mt-1 text-xs leading-snug ${finalPayment(inv)?.via === "bank" ? "font-semibold text-brand" : "text-ink-soft"}`}>
                        {paidLabel(inv)}
                        <span className="block font-normal text-ink-soft">on {shortDate(paidOn(inv)!)}</span>
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
                          <div className="flex flex-col items-end gap-1">
                            {info.status === "overdue" && (
                              <button
                                onClick={() => onSendReminder(inv.id)}
                                className={`${btn("primary", "sm")} whitespace-nowrap`}
                              >
                                Send Reminder
                              </button>
                            )}
                            <button
                              onClick={() => onRecordPayment(inv.id)}
                              className={`${btn("ghost", "sm")} whitespace-nowrap px-2.5`}
                            >
                              Record Payment
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
                                className={`${btn("secondary", "sm")} whitespace-nowrap`}
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
