"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; bookings: number }>;
}

function formatRevenueTick(value: number): string {
  if (value === 0) return "0";
  return `${(value / 1000).toFixed(0)}K`;
}

function formatRevenueTooltip(value: number): string {
  return `${(value / 1000).toFixed(1)}K DA`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatRevenueTick} />
        <Tooltip
          formatter={(value) => [formatRevenueTooltip(Number(value)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
      </BarChart>
    </ResponsiveContainer>
  );
}
