import { addDays, daysBetween, getStatus, type Invoice } from "./invoices";

export interface CollectionRate {
  /** 0–100, or null when no reminded invoice has a known outcome yet */
  pct: number | null;
  paidWithin7: number;
  decided: number;
}

/**
 * Share of reminded invoices paid within 7 days of their first reminder.
 * Invoices reminded less than 7 days ago and still unpaid are left out
 * because their outcome isn't known yet.
 */
export function collectionRate(invoices: Invoice[], today: string): CollectionRate {
  let paidWithin7 = 0;
  let decided = 0;
  for (const inv of invoices) {
    const first = inv.reminders?.map((r) => r.date).sort()[0];
    if (!first) continue;
    if (inv.paidOn && daysBetween(first, inv.paidOn) <= 7) {
      paidWithin7++;
      decided++;
    } else if (inv.paidOn || daysBetween(first, today) > 7) {
      decided++;
    }
  }
  return { pct: decided ? Math.round((paidWithin7 / decided) * 100) : null, paidWithin7, decided };
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export function agingBuckets(invoices: Invoice[], today: string): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: "0–15 days", amount: 0, count: 0 },
    { label: "16–45 days", amount: 0, count: 0 },
    { label: "45+ days", amount: 0, count: 0 },
  ];
  for (const inv of invoices) {
    const { status, daysOverdue } = getStatus(inv, today);
    if (status !== "overdue") continue;
    const b = daysOverdue <= 15 ? buckets[0] : daysOverdue <= 45 ? buckets[1] : buckets[2];
    b.amount += inv.amount;
    b.count++;
  }
  return buckets;
}

export function summary(invoices: Invoice[], today: string) {
  let outstanding = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    const { status } = getStatus(inv, today);
    if (status === "paid") continue;
    outstanding += inv.amount;
    if (status === "overdue") {
      overdue += inv.amount;
      overdueCount++;
    }
  }
  return { outstanding, overdue, overdueCount };
}

/** Mock history for the previous five weeks; the current week uses the live rate. */
const PAST_WEEKS = [34, 39, 43, 48, 54];

export function rateTrend(today: string, current: number | null) {
  return [...PAST_WEEKS, current ?? PAST_WEEKS[PAST_WEEKS.length - 1]].map((rate, i) => ({
    week: i === 5 ? "This week" : `Wk of ${shortDay(addDays(today, -7 * (5 - i)))}`,
    rate,
    live: i === 5,
  }));
}

function shortDay(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}

/** Hardcoded monthly outflows for the demo (supplier payments, rent, salaries). */
export const SCHEDULED_OUTFLOWS = 180000;

export function monthEnd(today: string) {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** Everything still owed with a due date on or before the end of this month. */
export function expectedInflows(invoices: Invoice[], today: string) {
  const end = monthEnd(today);
  let overdue = 0;
  let dueSoon = 0;
  for (const inv of invoices) {
    const info = getStatus(inv, today);
    if (info.status === "overdue") overdue += inv.amount;
    else if (info.status === "due-soon" && info.dueDate <= end) dueSoon += inv.amount;
  }
  return { overdue, dueSoon, total: overdue + dueSoon, end };
}
