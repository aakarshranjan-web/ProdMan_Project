import type { InvoiceStatus } from "@/lib/invoices";

const STYLES: Record<InvoiceStatus, { label: string; cls: string; dot: string }> = {
  paid: { label: "Paid", cls: "bg-paid-bg text-paid", dot: "bg-paid" },
  "due-soon": { label: "Due soon", cls: "bg-due-bg text-due", dot: "bg-[#e0a100]" },
  overdue: { label: "Overdue", cls: "bg-over-bg text-over", dot: "bg-over" },
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
