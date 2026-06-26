"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export interface SheetSummary {
  monthLabel: string;
  scopeLabel: string;
  target: number;
  projected: number;
  gap: number;
  confidence: number;
  breakdown: { name: string; value: number }[];
}
export interface SheetRow {
  company: string;
  category: string;
  owner: string;
  country: string;
  expected: number;
  basis: string;
}

export function NextMonthExport({ summary, rows, monthKey }: { summary: SheetSummary; rows: SheetRow[]; monthKey: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    const XLSX = await import("xlsx");

    const summaryAoa: (string | number)[][] = [
      ["Monthly Projection Sheet"],
      ["Month", summary.monthLabel],
      ["Scope", summary.scopeLabel],
      [],
      ["Target", summary.target],
      ["Projected Revenue", summary.projected],
      ["Gap to Target", summary.gap],
      ["Confidence %", summary.confidence],
      [],
      ["Revenue Source", "Expected ₹"],
      ...summary.breakdown.map((b) => [b.name, b.value]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);
    ws1["!cols"] = [{ wch: 24 }, { wch: 18 }];

    const ws2 = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Company: r.company, Category: r.category, Owner: r.owner,
        Country: r.country, "Expected ₹": r.expected, Basis: r.basis,
      }))
    );
    ws2["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    XLSX.utils.book_append_sheet(wb, ws2, "By Customer");
    XLSX.writeFile(wb, `Projection_${monthKey}.xlsx`);
    setBusy(false);
  }

  return (
    <button onClick={download} disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
      <Download size={16} /> {busy ? "Preparing…" : "Download Excel"}
    </button>
  );
}
