"use client";

import { useState } from "react";
import { Field, inputClass } from "./Sheet";
import { APP_NAME } from "@/lib/business";
import { DEMO_BUSINESS } from "@/lib/session";

interface Props {
  onLogin: (businessName: string) => void;
}

/** Mock login: any non-empty details are accepted. */
export default function LoginScreen({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Enter your business name or email",
      password: password ? undefined : "Enter your password",
    };
    setErrors(next);
    if (next.name || next.password) return;
    onLogin(name.trim());
  };

  return (
    <div className="min-h-dvh bg-paper">
      <div className="bg-ink px-4 pb-28 pt-8 text-white sm:pt-12">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-extrabold">₹</div>
            <span className="text-sm font-semibold tracking-wide text-white/70">{APP_NAME}</span>
          </div>
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Get paid on time</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-white/65">
            Track every invoice against its MSMED Act deadline, and follow up before it slips.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-20 max-w-md px-4 pb-16">
        <div className="rounded-[28px] bg-card p-5 shadow-[0_-8px_30px_-12px_rgba(15,29,46,0.35)] sm:p-7">
          <h2 className="text-xl font-bold tracking-tight">Log in</h2>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label="Business name or email" error={errors.name}>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma Precision Tools"
                autoComplete="username"
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white transition hover:bg-brand-dark active:scale-[0.99]"
            >
              Log in
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <button
            onClick={() => onLogin(DEMO_BUSINESS)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3.5 text-left transition hover:border-brand hover:bg-brand/5"
          >
            <span>
              <span className="block text-sm font-bold">Demo login</span>
              <span className="block text-sm text-ink-soft">{DEMO_BUSINESS}</span>
            </span>
            <span className="text-lg font-bold text-brand">→</span>
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">Prototype: any business name and password will log you in.</p>
      </main>
    </div>
  );
}
