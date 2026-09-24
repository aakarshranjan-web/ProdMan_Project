/** Shared presentation pieces so every screen uses the same buttons, icons, steps and empty states. */

const base =
  "inline-flex items-center justify-center gap-2 font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

const sizes = {
  lg: "w-full rounded-xl px-5 py-3.5 text-base",
  md: "rounded-xl px-4 py-2.5 text-sm",
  sm: "rounded-lg px-3 py-1.5 text-xs",
};

const variants = {
  /** The one main action on a screen or row. */
  primary: "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20",
  /** Supporting actions. */
  secondary: "border border-line bg-card text-ink hover:border-ink/25 hover:bg-paper",
  /** Low-emphasis actions that sit beside a primary one. */
  ghost: "text-brand hover:bg-brand/10",
  /** Irreversible actions. */
  danger: "bg-over text-white shadow-sm shadow-over/20 hover:brightness-95",
};

export function btn(variant: keyof typeof variants, size: keyof typeof sizes = "lg") {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

type IconProps = { className?: string; size?: number };

function Svg({ size = 14, className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5l9.5 16.5h-19z" />
    <path d="M12 10v4M12 17.2v.3" />
  </Svg>
);
export const IconHalf = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
  </Svg>
);
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
  </Svg>
);
export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5 5h14l2 8v6H3v-6z" />
  </Svg>
);

export function Spinner({ className = "h-5 w-5 border-2 border-line border-t-brand" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full ${className}`} aria-hidden />;
}

/** "Step 1 of 2" header for multi-step flows, with a line on what comes next. */
export function Steps({ current, labels, next }: { current: number; labels: string[]; next?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          Step {current} of {labels.length} · {labels[current - 1]}
        </p>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {labels.map((l, i) => (
          <span key={l} className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
      {next && <p className="mt-2 text-xs text-ink-soft">Next: {next}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-paper/40 px-4 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-card text-ink-soft shadow-sm">
        <IconInbox size={18} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Tick-in-a-circle confirmation block used when a flow finishes. */
export function SuccessState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-paid-bg text-paid">
        <IconCheck size={26} />
      </span>
      <p className="mt-4 text-lg font-bold">{title}</p>
      {children}
    </div>
  );
}
