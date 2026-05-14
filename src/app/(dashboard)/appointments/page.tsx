"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AppointmentsPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { locale: fr });
  const weekEnd = endOfWeek(currentWeek, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: appointments, isLoading } = trpc.appointment.list.useQuery({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const getAppointmentsForDay = (day: Date) => {
    return appointments?.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === day.toDateString();
    }) ?? [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-gray-500 text-sm">المواعيد — vue hebdomadaire</p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <CalendarPlus className="h-4 w-4" />
            Nouveau RDV
          </Link>
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-gray-900">
            {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-gray-500">{appointments?.length ?? 0} rendez-vous</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayApts = getAppointmentsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={day.toISOString()} className="space-y-2">
                <div className={cn("text-center py-2 rounded-lg", isToday ? "bg-teal-600 text-white" : "bg-gray-50")}>
                  <p className="text-xs font-medium capitalize">{format(day, "EEE", { locale: fr })}</p>
                  <p className="text-lg font-bold">{format(day, "d")}</p>
                </div>
                <div className="space-y-1 min-h-[200px]">
                  {dayApts.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/appointments/${apt.id}`}
                      className="block p-2 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all text-xs"
                    >
                      <p className="font-semibold text-teal-700">
                        {format(new Date(apt.date), "HH:mm")}
                      </p>
                      <p className="text-gray-800 truncate">{apt.patient.name}</p>
                      <p className="text-gray-500 truncate">{apt.service.name}</p>
                      <div className="mt-1">
                        <StatusBadge status={apt.status} />
                      </div>
                    </Link>
                  ))}
                  {dayApts.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-gray-300">Libre</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
