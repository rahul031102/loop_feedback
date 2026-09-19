"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sparkles } from "lucide-react";
import type { Sentiment } from "@prisma/client";
import { SENTIMENT_LABELS } from "@/lib/labels";

interface SentimentChartProps {
  data: { sentiment: Sentiment | "UNCLASSIFIED"; count: number }[];
}

const COLORS: Record<string, string> = {
  POSITIVE: "#34D399",
  NEUTRAL: "#94A3B8",
  NEGATIVE: "#FB7185",
  UNCLASSIFIED: "rgba(255,255,255,0.14)",
};

export function SentimentChart({ data }: SentimentChartProps) {
  const classifiedCount = data
    .filter((d) => d.sentiment !== "UNCLASSIFIED")
    .reduce((sum, d) => sum + d.count, 0);

  if (classifiedCount === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-3">
          <Sparkles className="h-4 w-4 text-fg-3" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-fg">Not yet classified</p>
        <p className="max-w-[220px] text-xs text-fg-3">
          Sentiment is assigned by Claude on ingestion - arriving in Milestone 3.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.sentiment === "UNCLASSIFIED" ? "Unclassified" : SENTIMENT_LABELS[d.sentiment],
    value: d.count,
    key: d.sentiment,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(13,15,26,0.92)",
            backdropFilter: "blur(12px)",
            color: "#F3F5FA",
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#9BA3B7" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
