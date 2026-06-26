"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area,
} from "recharts";
import { inr } from "@/lib/utils";

const COLORS = ["#3563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

function tip(value: number) {
  return inr(value);
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v} customers`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PipelineBar({ data }: { data: { stage: string; value: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip formatter={(v: number, n) => (n === "value" ? tip(v) : v)} />
        <Bar dataKey="value" fill="#3563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectionBreakdownBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => inr(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip formatter={(v: number) => tip(v)} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
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
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip formatter={(v: number) => tip(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="best" stroke="#10b981" fill="#10b98122" name="Best case" />
        <Area type="monotone" dataKey="expected" stroke="#3563eb" fill="#3563eb22" name="Expected" />
        <Area type="monotone" dataKey="worst" stroke="#ef4444" fill="#ef444422" name="Worst case" />
        <Line type="monotone" dataKey="target" stroke="#0f172a" strokeDasharray="5 5" dot={false} name="Target" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TeamBar({ data }: { data: { name: string; achieved: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inr(v)} width={55} />
        <Tooltip formatter={(v: number) => tip(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Target" />
        <Bar dataKey="achieved" fill="#3563eb" radius={[4, 4, 0, 0]} name="Achieved" />
      </BarChart>
    </ResponsiveContainer>
  );
}
