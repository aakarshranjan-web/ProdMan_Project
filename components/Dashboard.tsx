"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatINR, type Invoice } from "@/lib/invoices";
import { agingBuckets, collectionRate, expectedInflows, rateTrend, SCHEDULED_OUTFLOWS, summary } from "@/lib/metrics";

const INK = "#0f1d2e";
const INK_SOFT = "#52606f";
const LINE = "#e4e0d6";
const BRAND = "#0b6e5f";
/** Sequential, one hue: older debt reads darker. */
const AGING_COLORS = ["#e8866f", "#cf4a33", "#9e2414"];

function compactINR(n: number) {
  if (n >= 100000) return `₹${Number((n / 100000).toFixed(2))}L`;
  if (n >= 1000) return `₹${Number((n / 1000).toFixed(1))}K`;
  return formatINR(n);
}

function Card({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "over" }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`tnum mt-2 text-2xl font-extrabold tracking-tight sm:text-[28px] ${tone === "over" ? "text-over" : ""}`}>{value}</p>
      {note && <p className="mt-1 text-xs leading-snug text-ink-soft">{note}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4 sm:p-6">
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-lg">{children}</div>;
}

export default function Dashboard({ invoices, today }: { invoices: Invoice[]; today: string }) {
  const s = summary(invoices, today);
  const rate = collectionRate(invoices, today);
  const aging = agingBuckets(invoices, today);
  const trend = rateTrend(today, rate.pct);
  const inflows = expectedInflows(invoices, today);
  const projected = inflows.total - SCHEDULED_OUTFLOWS;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Total outstanding" value={formatINR(s.outstanding)} note="All unpaid invoices" />
        <Card label="Total overdue" value={formatINR(s.overdue)} note="Past the MSMED deadline" tone={s.overdue ? "over" : undefined} />
        <Card label="Overdue invoices" value={String(s.overdueCount)} note={s.overdueCount === 1 ? "invoice needs chasing" : "invoices need chasing"} />
        <Card
          label="Collection rate"
          value={rate.pct === null ? "—" : `${rate.pct}%`}
          note={
            rate.decided
              ? `${rate.paidWithin7} of ${rate.decided} reminded invoices paid within 7 days of first reminder`
              : "Paid within 7 days of first reminder"
          }
        />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Panel title="Overdue by age" subtitle="How long overdue invoices have been past their deadline">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 30, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: LINE }} tick={{ fill: INK_SOFT, fontSize: 12, fontWeight: 600 }} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(15,29,46,0.04)" }}
                  content={({ active, payload }) => {
                    const b = active && payload?.[0]?.payload;
                    if (!b) return null;
                    return (
                      <TooltipBox>
                        <p className="font-bold">{b.label} overdue</p>
                        <p className="tnum">{formatINR(b.amount)}</p>
                        <p className="text-xs text-ink-soft">{b.count === 1 ? "1 invoice" : `${b.count} invoices`}</p>
                      </TooltipBox>
                    );
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={72} minPointSize={2} isAnimationActive={false}>
                  {aging.map((b, i) => (
                    <Cell key={b.label} fill={AGING_COLORS[i]} />
                  ))}
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(v) => (Number(v) ? compactINR(Number(v)) : "₹0")}
                    style={{ fill: INK, fontSize: 13, fontWeight: 800 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">Overdue amounts by age</caption>
            <tbody>
              <tr className="text-ink-soft">
                {aging.map((b) => (
                  <td key={b.label} className="w-1/3 text-center text-xs">
                    <span className="sr-only">{b.label}: {formatINR(b.amount)}, </span>
                    {b.count === 1 ? "1 invoice" : `${b.count} invoices`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Collection rate over time" subtitle="Share of reminded invoices paid within 7 days, last 6 weeks">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 24, right: 20, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={{ stroke: LINE }}
                  tick={{ fill: INK_SOFT, fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickFormatter={(w: string) => w.replace("Wk of ", "")}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: INK_SOFT, fontSize: 11 }}
                  width={44}
                />
                <Tooltip
                  cursor={{ stroke: INK_SOFT, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    const p = active && payload?.[0]?.payload;
                    if (!p) return null;
                    return (
                      <TooltipBox>
                        <p className="font-bold">{p.week}</p>
                        <p className="tnum">{p.rate}% paid within 7 days</p>
                        {p.live && <p className="text-xs text-ink-soft">Live from your invoices</p>}
                      </TooltipBox>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={BRAND}
                  strokeWidth={2}
                  dot={{ r: 4, fill: BRAND, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: BRAND, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="rate"
                    position="top"
                    offset={10}
                    content={({ x, y, value, index }) =>
                      index === trend.length - 1 ? (
                        <text x={Number(x)} y={Number(y) - 12} textAnchor="middle" fill={INK} fontSize={13} fontWeight={800}>
                          {value}%
                        </text>
                      ) : null
                    }
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-ink-soft">Earlier weeks are sample data. This week is calculated from your invoices.</p>
          <table className="sr-only">
            <caption>Collection rate by week</caption>
            <tbody>
              {trend.map((t) => (
                <tr key={t.week}>
                  <th>{t.week}</th>
                  <td>{t.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Cash position this month" subtitle={`A simple estimate to ${formatDate(inflows.end)}, not a forecast`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-2xl bg-paper p-4">
            <p className="text-sm font-semibold text-ink-soft">Expected inflows</p>
            <p className="tnum mt-1 text-2xl font-extrabold">{formatINR(inflows.total)}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Overdue {formatINR(inflows.overdue)} + due by month end {formatINR(inflows.dueSoon)}
            </p>
          </div>
          <div className="hidden place-items-center text-2xl font-bold text-ink-soft sm:grid">−</div>
          <div className="rounded-2xl bg-paper p-4">
            <p className="text-sm font-semibold text-ink-soft">Scheduled outflows</p>
            <p className="tnum mt-1 text-2xl font-extrabold">{formatINR(SCHEDULED_OUTFLOWS)}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">Supplier payments, rent and salaries</p>
          </div>
          <div className="hidden place-items-center text-2xl font-bold text-ink-soft sm:grid">=</div>
          <div className={`rounded-2xl p-4 ${projected >= 0 ? "bg-paid-bg" : "bg-over-bg"}`}>
            <p className="text-sm font-semibold text-ink-soft">Projected cash position</p>
            <p className={`tnum mt-1 text-2xl font-extrabold ${projected >= 0 ? "text-paid" : "text-over"}`}>
              {projected < 0 ? "−" : ""}
              {formatINR(Math.abs(projected))}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {projected >= 0 ? "If every invoice due this month is collected" : "Short even if every invoice is collected"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Assumes every unpaid invoice due by month end, including overdue ones, gets paid this month. Outflows are a fixed sample figure.
        </p>
      </Panel>
    </div>
  );
}
