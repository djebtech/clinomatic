"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#ea580c", "#84cc16"];
const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  phone: "Téléphone",
  walk_in: "Sur place",
  manual: "Manuel",
};

interface SourceChartProps {
  data: Array<{ source: string; _count: { id: number } }>;
}

export function SourceChart({ data }: SourceChartProps) {
  const chartData = data.map((d) => ({
    name: SOURCE_LABELS[d.source] || d.source,
    value: d._count.id,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources de réservation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
