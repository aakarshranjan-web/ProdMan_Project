import { formatDate, formatINR, addDays } from "@/lib/invoices";
import { WHATSAPP_INVOICE } from "@/lib/extract";

interface Props {
  today: string;
  invoiceNumber: string;
  onImport: () => void;
}

/** Mock chat thread with a forwarded invoice image. */
export default function WhatsAppThread({ today, invoiceNumber, onImport }: Props) {
  const inv = WHATSAPP_INVOICE;
  const date = addDays(today, -inv.daysAgo);
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm font-bold">RV</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Ravi Verma (Dispatch)</p>
          <p className="text-xs text-white/70">online</p>
        </div>
      </div>

      <div className="space-y-2.5 bg-[#efe7dd] px-3 py-4">
        <div className="mx-auto w-fit rounded-md bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">Today</div>

        <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">
          Sir, Nirmal Castings dispatch done. Invoice copy below 👇
          <span className="ml-2 align-bottom text-[10px] text-ink-soft">10:42 am</span>
        </div>

        <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white p-1.5 shadow-sm">
          <p className="px-1.5 pb-1 text-[11px] italic text-ink-soft">↪ Forwarded</p>
          {/* Stylised picture of the invoice */}
          <div className="rotate-[-1deg] rounded-md border border-line bg-[#fffdf8] p-3 font-mono text-[10px] leading-relaxed text-ink shadow-inner">
            <div className="flex justify-between border-b border-dashed border-ink/30 pb-1.5">
              <b className="text-[11px]">TAX INVOICE</b>
              <span>{invoiceNumber}</span>
            </div>
            <div className="mt-1.5">
              Bill to: <b>{inv.buyerName}</b>
            </div>
            <div>Date: {formatDate(date)}</div>
            <div>Terms: {inv.termsDays} days</div>
            <div className="mt-1.5 flex justify-between border-t border-dashed border-ink/30 pt-1.5">
              <span>Grand total</span>
              <b>{formatINR(inv.amount)}</b>
            </div>
          </div>
          <span className="block px-1.5 pt-1 text-right text-[10px] text-ink-soft">10:43 am</span>
        </div>
      </div>

      <div className="border-t border-line bg-card p-3">
        <button
          type="button"
          onClick={onImport}
          className="w-full rounded-xl bg-[#128c7e] py-3 text-sm font-bold text-white transition hover:brightness-95"
        >
          Import this invoice
        </button>
      </div>
    </div>
  );
}
