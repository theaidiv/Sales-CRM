"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area,
} from "recharts";
import { inr } from "@/lib/utils";
import { useDrill, type DrillDetail } from "@/components/DrillDown";

const COLORS = ["#14b8a6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
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
            <stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#14b8a60d" }} />
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
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#14b8a60d" }} />
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
        <Area type="monotone" dataKey="expected" stroke="#14b8a6" fill="#14b8a622" name="Expected" strokeWidth={2} />
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
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2.5} fill="url(#revFill)" name="Revenue"
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
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#14b8a60d" }} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? "#14b8a6" : "#99f6e4"} />)}
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
        <Tooltip content={<TooltipBox />} cursor={{ fill: "#14b8a60d" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Target" />
        <Bar dataKey="achieved" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Achieved" className={details ? "cursor-pointer" : ""} />
      </BarChart>
    </ResponsiveContainer>
  );
}
