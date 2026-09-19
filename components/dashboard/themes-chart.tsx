"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tags } from "lucide-react";

interface ThemesChartProps {
  data: { id: string; name: string; color: string; count: number }[];
}

export function ThemesChart({ data }: ThemesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-3">
          <Tags className="h-4 w-4 text-fg-3" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-fg">No themes assigned yet</p>
        <p className="max-w-[240px] text-xs text-fg-3">
          Theme clustering runs in Milestone 3 - 8 candidate themes are already seeded and ready.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        barCategoryGap={10}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#666E82" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "#9BA3B7" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(13,15,26,0.92)",
            backdropFilter: "blur(12px)",
            color: "#F3F5FA",
          }}
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
