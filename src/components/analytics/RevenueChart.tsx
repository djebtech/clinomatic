"use client";

import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RevenueChart() {
  const { data, isLoading } = trpc.analytics.getMonthlyRevenue.useQuery({ months: 6 });

  if (isLoading) return (
    <Card>
      <CardHeader><CardTitle>Revenus mensuels</CardTitle></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-gray-400">Chargement...</div></CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenus mensuels (DA)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} DA`, "Revenus"]} />
            <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
