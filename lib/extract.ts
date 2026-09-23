import { addDays, type Invoice, type PaymentTerms } from "./invoices";

export interface ExtractedInvoice {
  buyerName: string;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  termsDays: PaymentTerms;
}

/** The invoice pictured in the mock WhatsApp thread. */
export const WHATSAPP_INVOICE = {
  buyerName: "Nirmal Castings Pvt Ltd",
  amount: 112400,
  termsDays: 45 as PaymentTerms,
  daysAgo: 3,
};

const PHOTO_POOL: { buyerName: string; amount: number; termsDays: PaymentTerms; daysAgo: number }[] = [
  { buyerName: "Shiv Shakti Fabricators", amount: 86250, termsDays: 15, daysAgo: 2 },
  { buyerName: "Patel Agro Implements", amount: 204000, termsDays: 45, daysAgo: 5 },
  { buyerName: "Kumar Hydraulics LLP", amount: 58900, termsDays: 15, daysAgo: 1 },
  { buyerName: "Rathi Polymers Pvt Ltd", amount: 145600, termsDays: 45, daysAgo: 4 },
];

/** Next free number in the INV-YYYY-NNNN series. */
export function nextInvoiceNumber(invoices: Invoice[], today: string) {
  const year = today.slice(0, 4);
  const used = invoices
    .map((i) => /^INV-\d{4}-(\d+)$/i.exec(i.invoiceNumber)?.[1])
    .filter(Boolean)
    .map(Number);
  const n = (used.length ? Math.max(...used) : 0) + 1;
  return `INV-${year}-${String(n).padStart(4, "0")}`;
}

/** Stand-in for OCR: returns plausible values for a photographed invoice. */
export function mockExtractFromPhoto(invoices: Invoice[], today: string): ExtractedInvoice {
  const taken = new Set(invoices.map((i) => i.buyerName));
  const pool = PHOTO_POOL.filter((p) => !taken.has(p.buyerName));
  const pick = (pool.length ? pool : PHOTO_POOL)[Math.floor(Math.random() * (pool.length || PHOTO_POOL.length))];
  return {
    buyerName: pick.buyerName,
    invoiceNumber: nextInvoiceNumber(invoices, today),
    amount: pick.amount,
    invoiceDate: addDays(today, -pick.daysAgo),
    termsDays: pick.termsDays,
  };
}

export function mockExtractFromWhatsApp(invoices: Invoice[], today: string): ExtractedInvoice {
  return {
    buyerName: WHATSAPP_INVOICE.buyerName,
    invoiceNumber: nextInvoiceNumber(invoices, today),
    amount: WHATSAPP_INVOICE.amount,
    invoiceDate: addDays(today, -WHATSAPP_INVOICE.daysAgo),
    termsDays: WHATSAPP_INVOICE.termsDays,
  };
}
