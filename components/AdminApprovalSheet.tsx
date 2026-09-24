"use client";

import { useState } from "react";
import Sheet, { Field, inputClass } from "./Sheet";
import { btn, IconAlert, IconShield, Steps } from "./ui";
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
      <Steps
        current={1}
        labels={["Admin approval", action === "edit" ? "Edit invoice" : "Confirm delete"]}
        next={action === "edit" ? "the edit form opens with this invoice's details" : "you confirm the delete"}
      />
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
          <p role="alert" className="flex items-center gap-2 rounded-xl bg-over-bg px-3.5 py-2.5 text-sm font-semibold text-over">
            <IconAlert size={14} />
            {errors.auth}
          </p>
        )}
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className={btn("secondary")}
          >
            Cancel
          </button>
          <button type="submit" className={btn("primary")}>
            <IconShield size={16} />
            Submit
          </button>
        </div>
      </form>
    </Sheet>
  );
}
