"use client";

import { useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import { isDemoAdmin } from "@/lib/admin";
import type { Invoice } from "@/lib/invoices";

interface Props {
  action: "edit" | "delete";
  invoice: Invoice;
  onCancel: () => void;
  onApproved: (requestedBy: string) => void;
}

/** Mock admin gate in front of Edit/Delete. Checks the demo credentials in lib/admin.ts. */
export default function AdminApprovalSheet({ action, invoice, onCancel, onApproved }: Props) {
  const [requestedBy, setRequestedBy] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ requestedBy?: string; auth?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedBy.trim()) return setErrors({ requestedBy: "Enter who is requesting this change" });
    if (!isDemoAdmin(username, password)) {
      setPassword("");
      return setErrors({ auth: "Incorrect admin credentials" });
    }
    onApproved(requestedBy.trim());
  };

  return (
    <Sheet
      open
      onClose={onCancel}
      title="Admin Approval Required"
      subtitle={`${action === "edit" ? "Editing" : "Deleting"} ${invoice.invoiceNumber} (${invoice.buyerName}) needs a system admin to approve it.`}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Requested by" error={errors.requestedBy}>
          <input
            className={inputClass}
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
        </Field>
        <Field label="System Admin Username">
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="System Admin Password">
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
        </Field>
        {errors.auth && (
          <p role="alert" className="rounded-xl bg-over-bg px-3.5 py-2.5 text-sm font-semibold text-over">
            {errors.auth}
          </p>
        )}
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line py-3.5 text-base font-bold text-ink-soft hover:bg-paper hover:text-ink"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-ink py-3.5 text-base font-bold text-white transition hover:bg-ink/90">
            Submit
          </button>
        </div>
      </form>
    </Sheet>
  );
}
