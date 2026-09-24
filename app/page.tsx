"use client";

import { useCallback, useEffect, useState } from "react";
import AddInvoiceSheet from "@/components/AddInvoiceSheet";
import AdminApprovalSheet from "@/components/AdminApprovalSheet";
import ConnectBankSheet from "@/components/ConnectBankSheet";
import Dashboard from "@/components/Dashboard";
import DeleteInvoiceSheet from "@/components/DeleteInvoiceSheet";
import EscalateSheet from "@/components/EscalateSheet";
import InvoiceDetailSheet from "@/components/InvoiceDetailSheet";
import InvoiceList from "@/components/InvoiceList";
import LoginScreen from "@/components/LoginScreen";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { IconCheck } from "@/components/ui";
import ReminderSheet from "@/components/ReminderSheet";
import { channelLabel, nowTime } from "@/lib/business";
import { clearSession, loadSession, saveSession, type Session } from "@/lib/session";
import {
  formatDate,
  formatINR,
  getStatus,
  seedInvoices,
  todayISO,
  type Channel,
  type Invoice,
  type InvoiceFields,
  type Payment,
  balanceDue,
  virtualAccountFor,
} from "@/lib/invoices";

type Tab = "invoices" | "dashboard";

function initials(name: string) {
  const words = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

function randomRef(prefix: string) {
  return `${prefix}${Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("")}`;
}

export default function Home() {
  // "Today" comes from the viewer's device clock, so it's resolved after mount.
  const [today, setToday] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // undefined until localStorage has been checked on the client.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // The dashboard is the landing screen, including after a refresh while logged in.
  const [tab, setTab] = useState<Tab>("dashboard");
  const [bank, setBank] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [escalateId, setEscalateId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Edit/Delete first go through the admin approval popup; the approver's "Requested by" name is carried forward.
  const [approval, setApproval] = useState<{ action: "edit" | "delete"; invoiceId: string } | null>(null);
  const [requestedBy, setRequestedBy] = useState("");

  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = todayISO();
    setToday(t);
    setInvoices(seedInvoices(t));
    setSession(loadSession());
  }, []);

  // Keep "today" current while the app stays open, so statuses (and the 45-day
  // escalation cut-off) roll over at midnight without a refresh.
  useEffect(() => {
    if (!today) return;
    const id = setInterval(() => {
      const t = todayISO();
      setToday((prev) => (prev === t ? prev : t));
    }, 60_000);
    return () => clearInterval(id);
  }, [today]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const flash = (...ids: string[]) => {
    setHighlightIds(ids);
    setTimeout(() => setHighlightIds((h) => (h === ids ? [] : h)), 2500);
  };

  const addInvoice = (inv: InvoiceFields) => {
    const id = `u${Date.now()}`;
    setInvoices((list) => [...list, { ...inv, id, virtualAccount: virtualAccountFor(inv.invoiceNumber) }]);
    setTab("invoices");
    setToast(`Invoice ${inv.invoiceNumber} added`);
    flash(id);
  };

  // Money lands in the invoice's virtual account first; a moment later it is swept to the main account.
  const SETTLE_MS = 2000;

  const settleLater = (payments: { invoiceId: string; paymentId: string }[], settledTo: string, announce?: string) => {
    setTimeout(() => {
      const date = todayISO();
      const time = nowTime();
      const byInvoice = new Map<string, Set<string>>();
      payments.forEach(({ invoiceId, paymentId }) => byInvoice.set(invoiceId, (byInvoice.get(invoiceId) ?? new Set()).add(paymentId)));
      setInvoices((list) =>
        list.map((i) =>
          byInvoice.has(i.id)
            ? {
                ...i,
                payments: i.payments?.map((p) =>
                  byInvoice.get(i.id)!.has(p.id) ? { ...p, settledOn: date, settledTime: time, settledTo } : p,
                ),
              }
            : i,
        ),
      );
      if (announce) setToast(announce);
    }, SETTLE_MS);
  };

  const mainAccount = (bankName: string | null) => (bankName ? `${bankName} ••••4821` : "main account");

  const recordPayment = (invoiceId: string, amount: number) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const payment: Payment = { id: `p${Date.now()}`, amount, date: today!, time: nowTime(), via: "manual" };
    setInvoices((list) => list.map((i) => (i.id === invoiceId ? { ...i, payments: [...(i.payments ?? []), payment] } : i)));
    setPaymentId(null);
    setToast(`${formatINR(amount)} received in ${inv.virtualAccount} · settling to your main account`);
    flash(invoiceId);
    const to = mainAccount(bank);
    settleLater([{ invoiceId, paymentId: payment.id }], to, `${formatINR(amount)} settled to ${to}`);
  };

  // Simulated Account Aggregator fetch: 1–2 open sample invoices turn out to be paid already.
  const connectBank = (bankName: string) => {
    const open = invoices.filter((i) => balanceDue(i) > 0 && i.id.startsWith("s"));
    const shuffled = [...open].sort(() => Math.random() - 0.5);
    const matched = shuffled.slice(0, Math.min(open.length, 1 + Math.floor(Math.random() * 2)));
    const time = nowTime();
    const received = matched.map((inv, n) => ({
      invoiceId: inv.id,
      payment: {
        id: `p${Date.now()}-${n}`,
        amount: balanceDue(inv),
        date: today!,
        time,
        via: "bank",
        ref: randomRef("NEFT/"),
      } satisfies Payment,
    }));
    setInvoices((list) =>
      list.map((i) => {
        const r = received.find((x) => x.invoiceId === i.id);
        return r ? { ...i, payments: [...(i.payments ?? []), r.payment] } : i;
      }),
    );
    settleLater(
      received.map((r) => ({ invoiceId: r.invoiceId, paymentId: r.payment.id })),
      mainAccount(bankName),
    );
    setBank(bankName);
    setConnectOpen(false);
    setTab("invoices");
    setToast(
      matched.length
        ? `${bankName} connected · ${matched.length === 1 ? "1 invoice" : `${matched.length} invoices`} auto-matched from bank statement`
        : `${bankName} connected`,
    );
    flash(...matched.map((i) => i.id));
  };

  const sendReminder = (invoiceId: string, message: string, channels: Channel[]) => {
    const date = today!;
    setInvoices((list) =>
      list.map((i) =>
        i.id === invoiceId ? { ...i, reminders: [...(i.reminders ?? []), { date, time: nowTime(), channels, message }] } : i,
      ),
    );
    const inv = invoices.find((i) => i.id === invoiceId);
    setReminderId(null);
    if (inv) setToast(`Reminder sent to ${inv.buyerName} via ${channelLabel(channels)} · ${formatDate(date)}`);
    flash(invoiceId);
  };

  const requestCA = (invoiceId: string, caName: string) => {
    setInvoices((list) =>
      list.map((i) => (i.id === invoiceId ? { ...i, escalation: { caName, date: today!, time: nowTime() } } : i)),
    );
    setToast(`Connection request sent to ${caName}`);
  };

  const openEscalate = useCallback((id: string) => {
    setDetailId(null);
    setEscalateId(id);
  }, []);
  const closeEscalate = useCallback(() => setEscalateId(null), []);

  // Only the invoice's own fields change; reminders, escalation and payment stay as they were.
  const updateInvoice = (id: string, fields: InvoiceFields) => {
    setInvoices((list) =>
      list.map((i) =>
        i.id === id
          ? {
              ...i,
              buyerName: fields.buyerName,
              invoiceNumber: fields.invoiceNumber,
              amount: fields.amount,
              invoiceDate: fields.invoiceDate,
              termsDays: fields.termsDays,
            }
          : i,
      ),
    );
    setEditId(null);
    setToast(`Invoice ${fields.invoiceNumber} updated`);
    flash(id);
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    setInvoices((list) => list.filter((i) => i.id !== id));
    setDeleteId(null);
    if (inv) setToast(`Invoice ${inv.invoiceNumber} deleted`);
  };

  const logIn = (businessName: string) => {
    const next = { businessName };
    saveSession(next);
    setSession(next);
    setTab("dashboard");
  };

  // Logging out wipes every demo action so the next login starts from the sample data.
  const logOut = () => {
    clearSession();
    const t = todayISO();
    setToday(t);
    setInvoices(seedInvoices(t));
    setTab("invoices");
    setBank(null);
    setAddOpen(false);
    setConnectOpen(false);
    setPaymentId(null);
    setDetailId(null);
    setReminderId(null);
    setEscalateId(null);
    setHighlightIds([]);
    setToast(null);
    setSession(null);
  };

  const openPayment = useCallback((id: string) => {
    setDetailId(null);
    setPaymentId(id);
  }, []);
  const openReminder = useCallback((id: string) => {
    setDetailId(null);
    setReminderId(id);
  }, []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  const closeDetail = useCallback(() => setDetailId(null), []);
  const closeReminder = useCallback(() => setReminderId(null), []);

  const detail = invoices.find((i) => i.id === detailId);
  const reminderInv = invoices.find((i) => i.id === reminderId);
  const escalateInv = invoices.find((i) => i.id === escalateId);
  const editInv = invoices.find((i) => i.id === editId);
  const paymentInv = invoices.find((i) => i.id === paymentId);
  const deleteInv = invoices.find((i) => i.id === deleteId);
  const approvalInv = invoices.find((i) => i.id === approval?.invoiceId);

  if (session === undefined) return <div className="min-h-dvh bg-ink" />;
  if (session === null) return <LoginScreen onLogin={logIn} />;

  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pt-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-extrabold">₹</div>
              <span className="hidden text-sm font-semibold tracking-wide text-white/70 sm:inline">Invoice Tracker</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {bank ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/40 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-inset ring-white/15">
                  <IconCheck size={12} />
                  Bank connected ✓<span className="hidden font-semibold text-white/60 sm:inline">· {bank}</span>
                </span>
              ) : (
                <button
                  onClick={() => setConnectOpen(true)}
                  className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
                >
                  Connect bank<span className="hidden sm:inline"> account</span>
                </button>
              )}
              <div className="flex min-w-0 items-center gap-2 border-l border-white/15 pl-2 sm:gap-3 sm:pl-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-extrabold">
                    {initials(session.businessName)}
                  </span>
                  <span className="hidden max-w-[14rem] truncate text-sm font-semibold sm:inline" title={session.businessName}>
                    {session.businessName}
                  </span>
                </div>
                <button
                  onClick={logOut}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 truncate text-sm font-semibold text-white/80 sm:hidden">{session.businessName}</p>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {tab === "invoices" ? "Who owes you, and since when" : "Collections at a glance"}
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/65">
                {tab === "invoices"
                  ? "Deadlines follow the MSMED Act: buyers must pay within 15 days, or up to 45 days with a written agreement."
                  : "What you're owed, how late it is, and whether reminders are working."}
                {today && <span className="text-white/85"> Today is {formatDate(today)}.</span>}
              </p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white/95 active:translate-y-0"
            >
              + Add invoice
            </button>
          </div>

          <nav className="mt-7 flex w-fit rounded-full bg-white/10 p-1 text-sm font-bold" aria-label="Sections">
            {(["dashboard", "invoices"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={`rounded-full px-4 py-2 transition ${tab === t ? "bg-white text-ink" : "text-white/70 hover:text-white"}`}
              >
                {t === "invoices" ? "Invoices" : "Dashboard"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto -mt-12 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-[28px] bg-paper p-4 shadow-[0_-8px_30px_-12px_rgba(15,29,46,0.35)] sm:p-6">
          {!today ? (
            <div className="h-64 animate-pulse rounded-3xl bg-line/50" />
          ) : tab === "invoices" ? (
            <InvoiceList
              invoices={invoices}
              today={today}
              highlightIds={highlightIds}
              onOpen={setDetailId}
              onRecordPayment={openPayment}
              onSendReminder={openReminder}
              onEscalate={openEscalate}
              onEdit={(id) => setApproval({ action: "edit", invoiceId: id })}
              onDelete={(id) => setApproval({ action: "delete", invoiceId: id })}
            />
          ) : (
            <Dashboard invoices={invoices} today={today} />
          )}
        </div>
      </main>

      {today && <AddInvoiceSheet open={addOpen} today={today} invoices={invoices} onClose={closeAdd} onAdd={addInvoice} />}

      {connectOpen && <ConnectBankSheet open onClose={closeConnect} onConnected={connectBank} />}

      {paymentInv && today && (
        <RecordPaymentSheet
          key={paymentInv.id}
          invoice={paymentInv}
          today={today}
          onClose={() => setPaymentId(null)}
          onRecord={(amount) => recordPayment(paymentInv.id, amount)}
        />
      )}

      {detail && today && (
        <InvoiceDetailSheet
          invoice={detail}
          today={today}
          onClose={closeDetail}
          onSendReminder={() => openReminder(detail.id)}
          onRecordPayment={() => openPayment(detail.id)}
          onEscalate={() => openEscalate(detail.id)}
        />
      )}

      {reminderInv && today && (
        <ReminderSheet
          invoice={reminderInv}
          daysOverdue={getStatus(reminderInv, today).daysOverdue}
          businessName={session.businessName}
          onClose={closeReminder}
          onSend={(message, channels) => sendReminder(reminderInv.id, message, channels)}
        />
      )}

      {approvalInv && approval && (
        <AdminApprovalSheet
          key={`${approval.action}-${approvalInv.id}`}
          action={approval.action}
          invoice={approvalInv}
          onCancel={() => setApproval(null)}
          onApproved={(name) => {
            setRequestedBy(name);
            setApproval(null);
            setToast(`Admin approval granted · ${approval.action === "edit" ? "you can now edit" : "confirm to delete"} ${approvalInv.invoiceNumber}`);
            if (approval.action === "edit") setEditId(approvalInv.id);
            else setDeleteId(approvalInv.id);
          }}
        />
      )}

      {editInv && today && (
        <AddInvoiceSheet
          key={editInv.id}
          open
          editing={editInv}
          requestedBy={requestedBy}
          today={today}
          invoices={invoices}
          onClose={() => setEditId(null)}
          onAdd={(fields) => updateInvoice(editInv.id, fields)}
        />
      )}

      {deleteInv && (
        <DeleteInvoiceSheet invoice={deleteInv} requestedBy={requestedBy} onCancel={() => setDeleteId(null)} onConfirm={() => deleteInvoice(deleteInv.id)} />
      )}

      {escalateInv && today && (
        <EscalateSheet
          key={escalateInv.id}
          invoice={escalateInv}
          daysOverdue={getStatus(escalateInv, today).daysOverdue}
          onClose={closeEscalate}
          onRequest={(caName) => requestCA(escalateInv.id, caName)}
        />
      )}

      <div
        aria-live="polite"
        // Top on phones (bottom sheets fill the lower screen); bottom-right on wider screens, clear of centred dialogs.
        className={`pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 transition sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:justify-end sm:px-0 ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 sm:translate-y-4"
        }`}
      >
        {toast && (
          <div className="flex max-w-md items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 sm:max-w-xs text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-white">
              <IconCheck size={13} />
            </span>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
