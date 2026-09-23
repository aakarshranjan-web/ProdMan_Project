export type PaymentTerms = 15 | 45;

export interface Invoice {
  id: string;
  buyerName: string;
  invoiceNumber: string;
  amount: number;
  /** Local calendar date, YYYY-MM-DD */
  invoiceDate: string;
  termsDays: PaymentTerms;
  paidOn?: string;
  paymentRef?: string;
}

export type InvoiceStatus = "paid" | "due-soon" | "overdue";

export interface StatusInfo {
  status: InvoiceStatus;
  dueDate: string;
  /** Positive when overdue, 0 otherwise */
  daysOverdue: number;
  /** Days remaining until the due date (0 = due today); only meaningful when due-soon */
  daysLeft: number;
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

export function getStatus(inv: Invoice, today: string): StatusInfo {
  const dueDate = addDays(inv.invoiceDate, inv.termsDays);
  const diff = daysBetween(dueDate, today);
  if (inv.paidOn) return { status: "paid", dueDate, daysOverdue: 0, daysLeft: 0 };
  if (diff > 0) return { status: "overdue", dueDate, daysOverdue: diff, daysLeft: 0 };
  return { status: "due-soon", dueDate, daysOverdue: 0, daysLeft: -diff };
}

/* ---------- Smart matching of a bank credit to an invoice ---------- */

export interface BankCredit {
  payerName: string;
  amount: number;
  reference: string;
}

export interface MatchResult {
  invoice: Invoice;
  reasons: string[];
}

const NOISE = new Set(["pvt", "private", "ltd", "limited", "llp", "and", "co", "the", "m/s", "ms", "&"]);

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NOISE.has(t));
}

/** Share of the buyer's meaningful name words that appear in the payer name. */
function nameSimilarity(payer: string, buyer: string) {
  const b = nameTokens(buyer);
  if (b.length === 0) return 0;
  const p = new Set(nameTokens(payer));
  return b.filter((t) => p.has(t)).length / b.length;
}

function normalizeRef(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Mimics reconciling an Account Aggregator credit against open invoices.
 * The amount must match exactly; payer name and reference narration break ties
 * and must give at least one supporting signal.
 */
export function matchCredit(credit: BankCredit, invoices: Invoice[]): MatchResult | null {
  const ref = normalizeRef(credit.reference);
  let best: { invoice: Invoice; score: number; reasons: string[] } | null = null;

  for (const inv of invoices) {
    if (inv.paidOn || inv.amount !== credit.amount) continue;

    const reasons = [`Amount ${formatINR(credit.amount)} matches exactly`];
    let score = 1;

    const invRef = normalizeRef(inv.invoiceNumber);
    if (ref && invRef && ref.includes(invRef)) {
      score += 2;
      reasons.push(`Narration mentions ${inv.invoiceNumber}`);
    }

    const sim = nameSimilarity(credit.payerName, inv.buyerName);
    if (sim >= 0.5) {
      score += sim;
      reasons.push(`Payer name matches "${inv.buyerName}"`);
    }

    if (score > 1 && (!best || score > best.score)) best = { invoice: inv, score, reasons };
  }

  return best ? { invoice: best.invoice, reasons: best.reasons } : null;
}

/* ---------- Seed data (relative to today so the demo always has a live mix) ---------- */

export function seedInvoices(today: string): Invoice[] {
  const ago = (n: number) => addDays(today, -n);
  return [
    { id: "s1", buyerName: "Kaveri Textiles Pvt Ltd", invoiceNumber: "INV-2026-0398", amount: 72500, invoiceDate: ago(40), termsDays: 15 },
    { id: "s2", buyerName: "Shree Balaji Auto Components", invoiceNumber: "INV-2026-0412", amount: 185000, invoiceDate: ago(58), termsDays: 45 },
    { id: "s3", buyerName: "Ganesh Packaging Industries", invoiceNumber: "INV-2026-0421", amount: 320000, invoiceDate: ago(50), termsDays: 45 },
    { id: "s4", buyerName: "Annapurna Foods LLP", invoiceNumber: "INV-2026-0447", amount: 98000, invoiceDate: ago(14), termsDays: 15 },
    { id: "s5", buyerName: "Mehta Engineering Works", invoiceNumber: "INV-2026-0452", amount: 45000, invoiceDate: ago(9), termsDays: 15 },
    { id: "s6", buyerName: "Sai Krishna Pharma Distributors", invoiceNumber: "INV-2026-0439", amount: 240000, invoiceDate: ago(30), termsDays: 45 },
    { id: "s7", buyerName: "Vardhman Steel Traders", invoiceNumber: "INV-2026-0376", amount: 156000, invoiceDate: ago(62), termsDays: 45, paidOn: ago(20), paymentRef: "NEFT/SBIN426055190312" },
    { id: "s8", buyerName: "Lakshmi Electricals", invoiceNumber: "INV-2026-0405", amount: 64800, invoiceDate: ago(25), termsDays: 15, paidOn: ago(12), paymentRef: "UPI/426811034921" },
  ];
}
