import { IconAlert, IconCheck, IconClock, IconHalf } from "./ui";
import type { InvoiceStatus } from "@/lib/invoices";

const STYLES: Record<InvoiceStatus, { label: string; cls: string; Icon: typeof IconCheck }> = {
  paid: { label: "Paid", cls: "bg-paid-bg text-paid ring-paid/15", Icon: IconCheck },
  "due-soon": { label: "Due soon", cls: "bg-due-bg text-due ring-due/15", Icon: IconClock },
  overdue: { label: "Overdue", cls: "bg-over-bg text-over ring-over/15", Icon: IconAlert },
};

/** Colour plus icon, so status reads at a glance and never relies on colour alone. */
export default function StatusBadge({ status, partial = false }: { status: InvoiceStatus; partial?: boolean }) {
  const s = STYLES[status];
  const label = partial ? (status === "overdue" ? "Partially paid — Overdue" : "Partially paid") : s.label;
  const cls = partial ? "bg-part-bg text-part ring-part/15" : s.cls;
  const Icon = partial ? (status === "overdue" ? IconAlert : IconHalf) : s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${cls}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
