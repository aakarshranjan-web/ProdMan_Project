import { formatINR, type Invoice } from "./invoices";

/** The supplier using the app (the signed-in MSME in the real product). */
export const BUSINESS_NAME = "Sharma Precision Tools";

const PAY_DOMAIN = "pay.invoicetracker.in";

export function paymentLink(inv: Invoice) {
  const slug = inv.invoiceNumber.toLowerCase().replace(/^inv-?/, "").replace(/[^a-z0-9]+/g, "-");
  return `${PAY_DOMAIN}/inv-${slug}`;
}

/**
 * Reminder copy. The 43B(h) wording ("defers the ... deduction", "may trigger
 * non-deductible penal interest") is deliberate. Don't reword it.
 */
export function reminderMessage(inv: Invoice, daysOverdue: number) {
  const days = `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}`;
  return (
    `Hi ${inv.buyerName}, this is a reminder that Invoice #${inv.invoiceNumber} (${formatINR(inv.amount)}) is now ` +
    `${days} past the MSMED Act payment deadline. Under Section 43B(h), late payment to a registered micro or ` +
    `small enterprise defers the buyer's tax deduction to the year of actual payment, and may trigger ` +
    `non-deductible penal interest. You can pay securely here: ${paymentLink(inv)}. Thank you, ${BUSINESS_NAME}.`
  );
}

export function channelLabel(channels: string[]) {
  return channels.map((c) => (c === "whatsapp" ? "WhatsApp" : "Email")).join(" + ");
}

export function nowTime() {
  return new Date()
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
}
