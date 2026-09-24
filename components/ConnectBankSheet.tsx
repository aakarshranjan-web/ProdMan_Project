"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { btn, Spinner, Steps } from "./ui";

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w) && w !== "Bank" && w !== "of")
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (bank: string) => void;
}

/** Mock Account Aggregator consent: pick a bank, then approve read-only access. */
export default function ConnectBankSheet({ open, onClose, onConnected }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [bank, setBank] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const approve = () => {
    if (!bank) return;
    setApproving(true);
    setTimeout(() => onConnected(bank), 1500);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 1 ? "Connect bank account" : "Approve read-only access"}
      subtitle={
        step === 1
          ? "We'll read incoming payments to match them to your invoices automatically."
          : "Shared through an RBI-regulated Account Aggregator. You can revoke this any time."
      }
    >
      <Steps
        current={step}
        labels={["Select your bank", "Approve read-only access"]}
        next={
          step === 1
            ? "review and approve read-only access"
            : "we fetch your statement and auto-match payments to open invoices"
        }
      />

      {step === 1 ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {BANKS.map((b) => (
              <button
                key={b}
                onClick={() => setBank(b)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm font-bold transition ${
                  bank === b ? "border-brand bg-brand/5 ring-4 ring-brand/10" : "border-line hover:border-ink/25 hover:bg-paper/60"
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper text-xs font-extrabold text-ink-soft">
                  {initials(b)}
                </span>
                <span className="leading-tight">{b}</span>
              </button>
            ))}
          </div>
          <button
            disabled={!bank}
            onClick={() => setStep(2)}
            className={`${btn("primary")} mt-5`}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-line">
            <div className="flex items-center gap-3 border-b border-line p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper text-xs font-extrabold text-ink-soft">
                {bank && initials(bank)}
              </span>
              <div>
                <p className="font-bold">{bank}</p>
                <p className="font-mono text-xs text-ink-soft">Current account ••••4821</p>
              </div>
            </div>
            <dl className="divide-y divide-line text-sm">
              {[
                ["Access", "Read-only. We can't move money."],
                ["Data shared", "Account statement & transactions"],
                ["Purpose", "Match incoming payments to invoices"],
                ["Fetch frequency", "Once a day"],
                ["Valid for", "12 months"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button
            onClick={approve}
            disabled={approving}
            className={`${btn("primary")} mt-5 disabled:opacity-80`}
          >
            {approving && <Spinner className="h-4 w-4 border-2 border-white/40 border-t-white" />}
            {approving ? "Fetching statement…" : "Approve"}
          </button>
          {!approving && (
            <button onClick={() => setStep(1)} className="mt-3 w-full text-sm font-semibold text-ink-soft hover:text-ink">
              ← Choose a different bank
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
