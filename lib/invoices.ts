export type PaymentTerms = 15 | 45;

export type Channel = "whatsapp" | "email";

export interface Reminder {
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  /** Display time, e.g. "10:30 am" */
  time: string;
  channels: Channel[];
  message: string;
}

export interface Invoice {
  id: string;
  buyerName: string;
  invoiceNumber: string;
  amount: number;
  /** Local calendar date, YYYY-MM-DD */
  invoiceDate: string;
  termsDays: PaymentTerms;
  /** Mock virtual account buyer payments land in before settling to the main account */
  virtualAccount: string;
  /** Every amount received, oldest first. Fully paid once these add up to the invoice amount. */
  payments?: Payment[];
  reminders?: Reminder[];
  /** Set once the owner has asked a CA partner to take this invoice to MSME Samadhaan */
  escalation?: Escalation;
}

/** The fields the owner types in (or we extract) when adding or editing an invoice. */
export type InvoiceFields = Pick<Invoice, "buyerName" | "invoiceNumber" | "amount" | "invoiceDate" | "termsDays">;

export interface Payment {
  id: string;
  amount: number;
  /** Date and time the money landed in the invoice's virtual account */
  date: string;
  time: string;
  /** How it was recorded: by the owner, or auto-matched from the connected bank's statement */
  via: "manual" | "bank";
  ref?: string;
  /** Set once the payment has been swept from the virtual account to the main bank account */
  settledOn?: string;
  settledTime?: string;
  settledTo?: string;
}

export interface Escalation {
  caName: string;
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  /** Display time, e.g. "10:30 am" */
  time: string;
}

export type InvoiceStatus = "paid" | "due-soon" | "overdue";

export interface StatusInfo {
  status: InvoiceStatus;
  dueDate: string;
  /** Positive when overdue, 0 otherwise */
  daysOverdue: number;
  /** Days remaining until the due date (0 = due today); only meaningful when due-soon */
  daysLeft: number;
  amountPaid: number;
  balance: number;
  /** Some money received but a balance is still due */
  partial: boolean;
}

/* ---------- Dates (calendar days, timezone-safe) ---------- */

function toParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toDayNumber(iso: string) {
  const { y, m, d } = toParts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function fromDayNumber(n: number) {
  const dt = new Date(n * 86_400_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function addDays(iso: string, days: number) {
  return fromDayNumber(toDayNumber(iso) + days);
}

export function daysBetween(fromIso: string, toIso: string) {
  return toDayNumber(toIso) - toDayNumber(fromIso);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string) {
  const { y, m, d } = toParts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/* ---------- Money ---------- */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return inr.format(amount);
}

/* ---------- Status (MSMED Act deadlines) ---------- */

export function amountPaid(inv: Invoice) {
  return (inv.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
}

export function balanceDue(inv: Invoice) {
  return Math.max(0, inv.amount - amountPaid(inv));
}

/** The payment that cleared the balance, if the invoice is fully paid. */
export function finalPayment(inv: Invoice): Payment | undefined {
  const payments = inv.payments ?? [];
  return payments.length && balanceDue(inv) === 0 ? payments[payments.length - 1] : undefined;
}

/** Date the invoice was fully paid, if it has been. */
export function paidOn(inv: Invoice) {
  return finalPayment(inv)?.date;
}

export function virtualAccountFor(invoiceNumber: string) {
  return `VA-${invoiceNumber.replace(/^INV-?/i, "").toUpperCase()}`;
}

export function getStatus(inv: Invoice, today: string): StatusInfo {
  const dueDate = addDays(inv.invoiceDate, inv.termsDays);
  const diff = daysBetween(dueDate, today);
  const paid = amountPaid(inv);
  const balance = Math.max(0, inv.amount - paid);
  const money = { amountPaid: paid, balance, partial: paid > 0 && balance > 0 };
  if (paid > 0 && balance === 0) return { status: "paid", dueDate, daysOverdue: 0, daysLeft: 0, ...money };
  if (diff > 0) return { status: "overdue", dueDate, daysOverdue: diff, daysLeft: 0, ...money };
  return { status: "due-soon", dueDate, daysOverdue: 0, daysLeft: -diff, ...money };
}

const ILLUSTRATIVE_RATE = 0.12;

/**
 * Simple interest on the unpaid balance for each day it has been past the
 * MSMED deadline. Payments made after the deadline lower the base from their
 * date onwards; payments made before it simply reduce the starting balance.
 */
export function interestAccrued(inv: Invoice, today: string) {
  const { status, dueDate } = getStatus(inv, today);
  if (status !== "overdue") return 0;
  // Placeholder rate (12% p.a.) for prototype purposes — revisit against actual MSMED penal interest formula (3x RBI bank rate) before this is treated as a real figure.
  const rate = ILLUSTRATIVE_RATE;
  let balance = inv.amount;
  let from = dueDate;
  let interest = 0;
  for (const p of inv.payments ?? []) {
    if (p.date > dueDate) {
      interest += balance * rate * (Math.max(0, daysBetween(from, p.date)) / 365);
      from = p.date;
    }
    balance = Math.max(0, balance - p.amount);
  }
  interest += balance * rate * (Math.max(0, daysBetween(from, today)) / 365);
  return Math.round(interest);
}

/** Days overdue at which the owner can hand the invoice to a CA partner. */
export const ESCALATION_THRESHOLD_DAYS = 45;

export function canEscalate(info: StatusInfo) {
  return info.status === "overdue" && info.daysOverdue >= ESCALATION_THRESHOLD_DAYS;
}

/* ---------- Seed data (relative to today so the demo always has a live mix) ---------- */

export function seedInvoices(today: string): Invoice[] {
  const ago = (n: number) => addDays(today, -n);
  const sent = (n: number, time = "10:30 am"): Reminder => ({
    date: ago(n),
    time,
    channels: ["whatsapp", "email"],
    message: "",
  });
  const paidInFull = (amount: number, daysAgo: number, ref: string): Payment[] => [
    { id: `p-${ref}`, amount, date: ago(daysAgo), time: "11:20 am", via: "manual", ref, settledOn: ago(daysAgo), settledTime: "11:20 am", settledTo: "main account" },
  ];
  const partPaid = (amount: number, daysAgo: number, ref: string): Payment => ({
    id: `p-${ref}`,
    amount,
    date: ago(daysAgo),
    time: "3:05 pm",
    via: "manual",
    ref,
    settledOn: ago(daysAgo),
    settledTime: "3:05 pm",
    settledTo: "main account",
  });
  const invoices: Omit<Invoice, "virtualAccount">[] = [
    { id: "s1", buyerName: "Kaveri Textiles Pvt Ltd", invoiceNumber: "INV-2026-0398", amount: 72500, invoiceDate: ago(40), termsDays: 15, reminders: [sent(12), sent(4, "4:15 pm")] },
    { id: "s2", buyerName: "Shree Balaji Auto Components", invoiceNumber: "INV-2026-0412", amount: 185000, invoiceDate: ago(58), termsDays: 45, reminders: [sent(3, "11:05 am")], payments: [partPaid(80000, 6, "NEFT/HDFC426170052281")] },
    { id: "s3", buyerName: "Ganesh Packaging Industries", invoiceNumber: "INV-2026-0421", amount: 320000, invoiceDate: ago(50), termsDays: 45 },
    { id: "s9", buyerName: "Deccan Agro Exports", invoiceNumber: "INV-2026-0351", amount: 134000, invoiceDate: ago(68), termsDays: 15, reminders: [sent(40, "9:45 am"), sent(25), sent(10, "5:20 pm")] },
    { id: "s4", buyerName: "Annapurna Foods LLP", invoiceNumber: "INV-2026-0447", amount: 98000, invoiceDate: ago(14), termsDays: 15 },
    { id: "s5", buyerName: "Mehta Engineering Works", invoiceNumber: "INV-2026-0452", amount: 45000, invoiceDate: ago(9), termsDays: 15 },
    { id: "s6", buyerName: "Sai Krishna Pharma Distributors", invoiceNumber: "INV-2026-0439", amount: 240000, invoiceDate: ago(30), termsDays: 45, payments: [partPaid(100000, 5, "RTGS/ICIC426210998104")] },
    { id: "s7", buyerName: "Vardhman Steel Traders", invoiceNumber: "INV-2026-0376", amount: 156000, invoiceDate: ago(70), termsDays: 45, payments: paidInFull(156000, 18, "NEFT/SBIN426055190312"), reminders: [sent(22)] },
    { id: "s8", buyerName: "Lakshmi Electricals", invoiceNumber: "INV-2026-0405", amount: 64800, invoiceDate: ago(25), termsDays: 15, payments: paidInFull(64800, 4, "UPI/426811034921"), reminders: [sent(8, "3:40 pm")] },
    { id: "s10", buyerName: "Om Sai Plastics", invoiceNumber: "INV-2026-0388", amount: 87500, invoiceDate: ago(30), termsDays: 15, payments: paidInFull(87500, 6, "IMPS/426390118834"), reminders: [sent(9, "12:10 pm")] },
  ];
  return invoices.map((inv) => ({ ...inv, virtualAccount: virtualAccountFor(inv.invoiceNumber) }));
}
