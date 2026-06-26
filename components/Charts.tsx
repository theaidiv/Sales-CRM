"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, ReferenceLine,
  RadialBarChart, RadialBar,
} from "recharts";
import { inr } from "@/lib/utils";
import { useDrill, type DrillDetail } from "@/components/DrillDown";

const COLORS = ["#001689", "#0FBDFF", "#0099A8", "#4d63c4", "#7de9ff", "#1bb0c0", "#2a40ab"];
type Details = Record<string, DrillDetail>;

function TooltipBox({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-200 bg-white/95 px-3 py-2 shadow-card-hover backdrop-blur">
      {label != null && <p className="mb-1 text-xs font-semibold text-ink-700">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-xs text-ink-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold text-ink-800">{money ? inr(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function useDrillClick(details?: Details) {
  const { open } = useDrill();
  return (key?: string) => {
    if (details && key && details[key]) open(details[key]);
  };
}

export function CategoryPie({ data, details }: { data: { name: string; value: number }[]; details?: Details }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={50} paddingAngle={3}
          onClick={(d: any) => drill(d?.name)} className={details ? "cursor-pointer" : ""}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<TooltipBox money={false} />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PipelineBar({ data, details }: { data: { stage: string; value: number; count: number }[]; details?: Details }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }} onClick={(s: any) => drill(s?.activeLabel)}>
        <defs>
          <linearGradient id="pipeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#001689" /><stop offset="100%" stopColor="#7de9ff" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#0016890d" }} />
        <Bar dataKey="value" fill="url(#pipeFill)" radius={[6, 6, 0, 0]} className={details ? "cursor-pointer" : ""} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectionBreakdownBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={120} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#0016890d" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ForecastArea({ data }: { data: { name: string; worst: number; expected: number; best: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="best" stroke="#10b981" fill="#10b98118" name="Best case" strokeWidth={2} />
        <Area type="monotone" dataKey="expected" stroke="#001689" fill="#00168922" name="Expected" strokeWidth={2} />
        <Area type="monotone" dataKey="worst" stroke="#ef4444" fill="#ef444418" name="Worst case" strokeWidth={2} />
        <Line type="monotone" dataKey="target" stroke="#0f172a" strokeDasharray="5 5" dot={false} name="Target" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrend({ data, details }: { data: { month: string; revenue: number }[]; details?: Details }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: 10, right: 10, top: 10 }} onClick={(s: any) => drill(s?.activeLabel)}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#001689" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#001689" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="revenue" stroke="#001689" strokeWidth={2.5} fill="url(#revFill)" name="Revenue"
          activeDot={{ r: 5, className: details ? "cursor-pointer" : "" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function YoYBar({ data }: { data: { fy: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="fy" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#0016890d" }} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? "#001689" : "#aab6e6"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TeamBar({ data, details }: { data: { name: string; achieved: number; target: number }[]; details?: Details }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }} onClick={(s: any) => drill(s?.activeLabel)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#0016890d" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Target" />
        <Bar dataKey="achieved" fill="#001689" radius={[6, 6, 0, 0]} name="Achieved" className={details ? "cursor-pointer" : ""} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Additional charts for Projections & Forecasts ----

/** Generic donut with optional drill-down per slice. */
export function DonutChart({ data, details, money = true }: { data: { name: string; value: number }[]; details?: Details; money?: boolean }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} innerRadius={54} paddingAngle={3}
          onClick={(d: any) => drill(d?.name)} className={details ? "cursor-pointer" : ""}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<TooltipBox money={money} />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal ranked bar (e.g. projection by owner / top customers), drillable. */
export function RankedBar({ data, details, color = "#001689" }: { data: { name: string; value: number }[]; details?: Details; color?: string }) {
  const drill = useDrillClick(details);
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 24 }} onClick={(s: any) => drill(s?.activeLabel)}>
        <defs>
          <linearGradient id="rankFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} /><stop offset="100%" stopColor="#0FBDFF" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={120} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#0016890d" }} />
        <Bar dataKey="value" fill="url(#rankFill)" radius={[0, 6, 6, 0]} className={details ? "cursor-pointer" : ""} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Actual history + forecast continuation with an 80% confidence band. */
export function HistoryForecastChart({ data }: { data: { name: string; actual?: number | null; forecast?: number | null; low?: number | null; high?: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#001689" stopOpacity={0.3} /><stop offset="100%" stopColor="#001689" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* confidence band: high then low(white) masks to a band */}
        <Area type="monotone" dataKey="high" stroke="none" fill="#0FBDFF" fillOpacity={0.16} name="80% interval" connectNulls={false} />
        <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={1} legendType="none" connectNulls={false} />
        <Area type="monotone" dataKey="actual" stroke="#001689" strokeWidth={2.5} fill="url(#histFill)" name="Actual" connectNulls={false} />
        <Line type="monotone" dataKey="forecast" stroke="#0FBDFF" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="Forecast" connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** 12-month seasonal index pattern (multiplicative, 1.0 = average). */
export function SeasonalityBar({ data }: { data: { month: string; index: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, "auto"]} tickFormatter={(v) => `${v.toFixed?.(1) ?? v}×`} width={36} />
        <Tooltip content={<TooltipBox money={false} />} />
        <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" />
        <Bar dataKey="index" radius={[5, 5, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.index >= 1 ? "#0099A8" : "#aab6e6"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Radial gauge for a single 0-100 metric (e.g. attainment / confidence). */
export function RadialGauge({ value, label }: { value: number; label: string }) {
  const data = [{ name: label, value: Math.max(0, Math.min(100, value)) }];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
        <defs>
          <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#001689" /><stop offset="100%" stopColor="#0FBDFF" />
          </linearGradient>
        </defs>
        <RadialBar dataKey="value" cornerRadius={10} fill="url(#gaugeFill)" background={{ fill: "#eef1fb" }} />
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-900 font-display" style={{ fontSize: 26, fontWeight: 800 }}>{Math.round(value)}%</text>
        <text x="50%" y="66%" textAnchor="middle" className="fill-ink-400" style={{ fontSize: 11 }}>{label}</text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
