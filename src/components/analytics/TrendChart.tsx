"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TrendChartProps {
  data?: Array<{
    week: string;
    bookings: number;
    confirmed: number;
    attended: number;
    noShows: number;
  }>;
}

const LINES = [
  { key: "bookings", color: "#0d9488", label: "Total" },
  { key: "confirmed", color: "#0891b2", label: "Confirmed" },
  { key: "attended", color: "#059669", label: "Attended" },
  { key: "noShows", color: "#ef4444", label: "No-shows" },
] as const;

type LineKey = (typeof LINES)[number]["key"];

/** Inner chart that always has data */
function TrendChartInner({
  data,
}: {
  data: Array<{
    week: string;
    bookings: number;
    confirmed: number;
    attended: number;
    noShows: number;
  }>;
}) {
  const [hidden, setHidden] = useState<Set<LineKey>>(new Set());

  const toggle = (key: LineKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {LINES.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
              hidden.has(l.key)
                ? "border-gray-200 text-gray-400 bg-gray-50"
                : "border-transparent text-white"
            }`}
            style={
              hidden.has(l.key)
                ? {}
                : { backgroundColor: l.color, borderColor: l.color }
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hidden.has(l.key) ? "#d1d5db" : "white" }}
            />
            {l.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          {LINES.map((l) =>
            hidden.has(l.key) ? null : (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={2}
                name={l.label}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Self-fetching wrapper used when no data prop is provided (e.g. dashboard page) */
function TrendChartSelfFetch() {
  const { data, isLoading } = trpc.analytics.getWeeklyTrend.useQuery({ weeks: 6 });

  if (isLoading) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
      </div>
    );
  }

  return <TrendChartInner data={data ?? []} />;
}

export function TrendChart({ data }: TrendChartProps) {
  if (data !== undefined) {
    return <TrendChartInner data={data} />;
  }
  return <TrendChartSelfFetch />;
}
