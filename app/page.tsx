"use client";

import { useCallback, useEffect, useState } from "react";
import AddInvoiceSheet from "@/components/AddInvoiceSheet";
import BankCreditSheet from "@/components/BankCreditSheet";
import ConnectBankSheet from "@/components/ConnectBankSheet";
import Dashboard from "@/components/Dashboard";
import EscalateSheet from "@/components/EscalateSheet";
import InvoiceDetailSheet from "@/components/InvoiceDetailSheet";
import InvoiceList from "@/components/InvoiceList";
import LoginScreen from "@/components/LoginScreen";
import ReminderSheet from "@/components/ReminderSheet";
import { channelLabel, nowTime } from "@/lib/business";
import { clearSession, loadSession, saveSession, type Session } from "@/lib/session";
import {
  formatDate,
  formatINR,
  getStatus,
  seedInvoices,
  todayISO,
  type BankCredit,
  type Channel,
  type Invoice,
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
  const [tab, setTab] = useState<Tab>("invoices");
  const [bank, setBank] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [credit, setCredit] = useState<{ key: number; prefillId?: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [escalateId, setEscalateId] = useState<string | null>(null);

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

  const addInvoice = (inv: Omit<Invoice, "id">) => {
    const id = `u${Date.now()}`;
    setInvoices((list) => [...list, { ...inv, id }]);
    setTab("invoices");
    setToast(`Invoice ${inv.invoiceNumber} added`);
    flash(id);
  };

  const confirmCredit = (invoiceId: string, c: BankCredit) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    setInvoices((list) =>
      list.map((i) =>
        i.id === invoiceId ? { ...i, paidOn: today!, paymentRef: c.reference || undefined, paidVia: "manual" } : i,
      ),
    );
    setCredit(null);
    if (inv) setToast(`${formatINR(c.amount)} from ${inv.buyerName} matched · ${inv.invoiceNumber} marked paid`);
    flash(invoiceId);
  };

  // Simulated Account Aggregator fetch: 1–2 open sample invoices turn out to be paid already.
  const connectBank = (bankName: string) => {
    const open = invoices.filter((i) => !i.paidOn && i.id.startsWith("s"));
    const shuffled = [...open].sort(() => Math.random() - 0.5);
    const matched = shuffled.slice(0, Math.min(open.length, 1 + Math.floor(Math.random() * 2)));
    const ids = new Set(matched.map((i) => i.id));
    setInvoices((list) =>
      list.map((i) => (ids.has(i.id) ? { ...i, paidOn: today!, paidVia: "bank", paymentRef: randomRef("NEFT/") } : i)),
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
  };

  const openEscalate = useCallback((id: string) => {
    setDetailId(null);
    setEscalateId(id);
  }, []);
  const closeEscalate = useCallback(() => setEscalateId(null), []);

  const logIn = (businessName: string) => {
    const next = { businessName };
    saveSession(next);
    setSession(next);
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
    setCredit(null);
    setDetailId(null);
    setReminderId(null);
    setEscalateId(null);
    setHighlightIds([]);
    setToast(null);
    setSession(null);
  };

  const openCredit = useCallback((prefillId?: string) => {
    setDetailId(null);
    setCredit({ key: Date.now(), prefillId });
  }, []);
  const openReminder = useCallback((id: string) => {
    setDetailId(null);
    setReminderId(id);
  }, []);
  const closeCredit = useCallback(() => setCredit(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeConnect = useCallback(() => setConnectOpen(false), []);
  const closeDetail = useCallback(() => setDetailId(null), []);
  const closeReminder = useCallback(() => setReminderId(null), []);

  const detail = invoices.find((i) => i.id === detailId);
  const reminderInv = invoices.find((i) => i.id === reminderId);
  const escalateInv = invoices.find((i) => i.id === escalateId);

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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paid/25 px-3 py-1.5 text-xs font-bold text-[#8fe0b6]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5fd49a]" />
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
              className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-white/90"
            >
              + Add invoice
            </button>
          </div>

          <nav className="mt-7 flex w-fit rounded-full bg-white/10 p-1 text-sm font-bold" aria-label="Sections">
            {(["invoices", "dashboard"] as Tab[]).map((t) => (
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
              onMarkPaid={openCredit}
              onSendReminder={openReminder}
              onEscalate={openEscalate}
            />
          ) : (
            <Dashboard invoices={invoices} today={today} />
          )}
        </div>
      </main>

      {today && <AddInvoiceSheet open={addOpen} today={today} invoices={invoices} onClose={closeAdd} onAdd={addInvoice} />}

      {connectOpen && <ConnectBankSheet open onClose={closeConnect} onConnected={connectBank} />}

      {credit && (
        <BankCreditSheet
          key={credit.key}
          open
          invoices={invoices}
          prefillId={credit.prefillId}
          onClose={closeCredit}
          onConfirm={confirmCredit}
        />
      )}

      {detail && today && (
        <InvoiceDetailSheet
          invoice={detail}
          today={today}
          onClose={closeDetail}
          onSendReminder={() => openReminder(detail.id)}
          onMarkPaid={() => openCredit(detail.id)}
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
        className={`pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 transition ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        {toast && <div className="max-w-md rounded-2xl bg-ink px-5 py-3 text-center text-sm font-semibold text-white shadow-xl">{toast}</div>}
      </div>
    </div>
  );
}
