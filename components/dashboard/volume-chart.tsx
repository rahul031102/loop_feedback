"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";

interface VolumeChartProps {
  data: { date: string; count: number }[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4C7DFF" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4C7DFF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#666E82" }}
          axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#666E82" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(13,15,26,0.92)",
            backdropFilter: "blur(12px)",
            fontFamily: "var(--font-plex-mono)",
            color: "#F3F5FA",
          }}
          labelStyle={{ fontFamily: "var(--font-inter)", fontWeight: 600, color: "#F3F5FA" }}
          itemStyle={{ color: "#9BA3B7" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#4C7DFF"
          strokeWidth={2}
          fill="url(#volumeFill)"
          name="Items"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
