"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip as ChartTooltip,
} from "recharts";
import { shortDate } from "@/lib/madfit-utils";
import type { WeightEntry } from "@/components/fit/weight-tracker";

/**
 * Split into its own module so recharts stays out of the Fit route's initial
 * bundle — the chart only renders on the Progress tab. Loaded via next/dynamic
 * from weight-tracker.tsx.
 */
export default function WeightChart({
  entries,
  goal,
}: {
  entries: WeightEntry[];
  goal?: number | null;
}) {
  const data = useMemo(
    () => entries.map((e) => ({ date: e.date, label: shortDate(e.date), kg: e.weightKg })),
    [entries]
  );

  const domain = useMemo<[number, number]>(() => {
    const values = entries.map((e) => e.weightKg);
    if (goal != null) values.push(goal);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.8, (max - min) * 0.25);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [entries, goal]);

  return (
    // `currentColor` lets the axes inherit the theme's muted foreground in both
    // light and dark mode — recharts cannot read CSS custom properties directly.
    <div className="h-[200px] w-full text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.18}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="currentColor"
            strokeOpacity={0.35}
            tick={{ fill: "currentColor", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={domain}
            stroke="currentColor"
            strokeOpacity={0.35}
            tick={{ fill: "currentColor", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {goal != null && (
            <ReferenceLine
              y={goal}
              stroke="#7F9270"
              strokeDasharray="5 4"
              label={{
                value: `Goal ${goal}`,
                position: "insideTopRight",
                fill: "#7F9270",
                fontSize: 10,
              }}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "#C96442", strokeOpacity: 0.3 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgb(var(--border-rgb))",
              background: "rgb(var(--card-rgb))",
              fontSize: 12,
              fontWeight: 700,
            }}
            labelStyle={{ color: "rgb(var(--muted-foreground-rgb))" }}
            formatter={(v: any) => [`${v} kg`, "Weight"]}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#C96442"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#C96442", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
