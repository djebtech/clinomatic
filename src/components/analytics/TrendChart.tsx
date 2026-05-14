"use client";

import { trpc } from "@/lib/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TrendChart() {
  const { data, isLoading } = trpc.analytics.getWeeklyTrend.useQuery({ weeks: 6 });

  if (isLoading) return (
    <Card>
      <CardHeader><CardTitle>Tendance hebdomadaire</CardTitle></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-gray-400">Chargement...</div></CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendance hebdomadaire</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="bookings" stroke="#0d9488" strokeWidth={2} name="Réservations" dot={false} />
            <Line type="monotone" dataKey="confirmed" stroke="#0891b2" strokeWidth={2} name="Confirmés" dot={false} />
            <Line type="monotone" dataKey="attended" stroke="#059669" strokeWidth={2} name="Présents" dot={false} />
            <Line type="monotone" dataKey="noShows" stroke="#ef4444" strokeWidth={2} name="Absents" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
