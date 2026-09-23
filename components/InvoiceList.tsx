"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatDate, formatINR, getStatus, type Invoice, type StatusInfo } from "@/lib/invoices";

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
  highlightId: string | null;
  onRecordCredit: (id: string) => void;
}

export default function InvoiceList({ invoices, today, highlightId, onRecordCredit }: Props) {
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
        <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center text-ink-soft">
          No invoices yet. Add your first one to start tracking.
        </div>
      )}

      {/* Phones: cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map(({ inv, info }) => (
          <li
            key={inv.id}
            className={`rounded-2xl border bg-card p-4 ${info.status === "overdue" ? "border-over/25" : "border-line"} ${
              highlightId === inv.id ? "flash" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{inv.buyerName}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</p>
              </div>
              <p className="tnum shrink-0 text-lg font-extrabold">{formatINR(inv.amount)}</p>
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
            {info.status !== "paid" && (
              <button
                onClick={() => onRecordCredit(inv.id)}
                className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-bold text-brand hover:bg-paper"
              >
                Simulate payment received
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Tablets and up: table */}
      {rows.length > 0 && (
        <div className="hidden overflow-hidden rounded-3xl border border-line bg-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper/50 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-5 py-3.5">Buyer</th>
                <th className="px-5 py-3.5">Invoice no.</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Due date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="whitespace-nowrap px-5 py-3.5">Days overdue</th>
                <th className="px-5 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ inv, info }) => (
                <tr key={inv.id} className={`transition hover:bg-paper/40 ${highlightId === inv.id ? "flash" : ""}`}>
                  <td className="px-5 py-4 font-bold">{inv.buyerName}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-ink-soft">{inv.invoiceNumber}</td>
                  <td className="tnum px-5 py-4 text-right text-base font-extrabold">{formatINR(inv.amount)}</td>
                  <td className="px-5 py-4">
                    <div className="tnum whitespace-nowrap">{formatDate(info.dueDate)}</div>
                    <div className="text-xs text-ink-soft">
                      {info.status === "due-soon" ? dueHint(info) : `${inv.termsDays}-day terms`}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={info.status} />
                    {info.status === "paid" && inv.paidOn && (
                      <div className="mt-1 text-xs text-ink-soft">on {shortDate(inv.paidOn)}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Overdue info={info} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {info.status !== "paid" && (
                      <button
                        onClick={() => onRecordCredit(inv.id)}
                        className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10"
                      >
                        Simulate payment
                      </button>
                    )}
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
