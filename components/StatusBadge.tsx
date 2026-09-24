import type { InvoiceStatus } from "@/lib/invoices";

const STYLES: Record<InvoiceStatus, { label: string; cls: string; dot: string }> = {
  paid: { label: "Paid", cls: "bg-paid-bg text-paid", dot: "bg-paid" },
  "due-soon": { label: "Due soon", cls: "bg-due-bg text-due", dot: "bg-[#e0a100]" },
  overdue: { label: "Overdue", cls: "bg-over-bg text-over", dot: "bg-over" },
};

const PARTIAL = { cls: "bg-part-bg text-part", dot: "bg-[#e0730f]" };

export default function StatusBadge({ status, partial = false }: { status: InvoiceStatus; partial?: boolean }) {
  const s = STYLES[status];
  const label = partial ? (status === "overdue" ? "Partially paid — Overdue" : "Partially paid") : s.label;
  const cls = partial ? PARTIAL.cls : s.cls;
  const dot = partial ? (status === "overdue" ? "bg-over" : PARTIAL.dot) : s.dot;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
