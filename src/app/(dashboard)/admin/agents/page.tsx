"use client";

import { trpc } from "@/lib/trpc";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function AdminAgentsPage() {
  const { data: performance, isLoading } = trpc.admin.getAgentPerformance.useQuery();

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance des agents</h1>
          <p className="text-gray-500 text-sm">أداء الوكلاء — {performance?.length} agents</p>
        </div>
      </div>

      <div className="space-y-4">
        {performance?.map((perf, idx) => (
          <Card key={perf.id}>
            <CardContent className="p-5 flex items-center gap-5">
              <div className="flex-shrink-0 text-center w-8">
                {idx === 0 ? (
                  <Trophy className="h-6 w-6 text-yellow-500 mx-auto" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{perf.user.name}</p>
                <p className="text-sm text-gray-500">{perf.user.phone}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-teal-600">{perf.totalConfirmed}</p>
                  <p className="text-xs text-gray-400">Total confirmés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{perf.weekConfirmed}</p>
                  <p className="text-xs text-gray-400">Cette semaine</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{perf.confirmationRate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-400">Taux</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {performance?.length === 0 && (
          <div className="text-center py-12 text-gray-400">Aucune donnée de performance</div>
        )}
      </div>
    </div>
  );
}
