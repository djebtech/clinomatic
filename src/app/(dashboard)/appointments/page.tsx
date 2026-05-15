"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useT } from "@/contexts/LanguageContext";

export default function AppointmentsPage() {
  const t = useT();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [mobileDay, setMobileDay] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { locale: fr });
  const weekEnd = endOfWeek(currentWeek, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: appointments, isLoading } = trpc.appointment.list.useQuery({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const getAppointmentsForDay = (day: Date) =>
    appointments?.filter(
      (apt) => new Date(apt.date).toDateString() === day.toDateString()
    ) ?? [];

  const mobileDayApts = getAppointmentsForDay(mobileDay);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{t("appointments.title")}</h1>
          <p className="text-gray-600 text-xs md:text-sm">{t("appointments.subtitle")}</p>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <Link href="/appointments/new">
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("appointments.new")}</span>
            <span className="sm:hidden ml-1">+</span>
          </Link>
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-3 md:px-4 py-3 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setCurrentWeek(subWeeks(currentWeek, 1));
            setMobileDay(subDays(mobileDay, 7));
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 text-sm md:text-base">
            {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-gray-600">{appointments?.length ?? 0} {t("appointments.title").toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setCurrentWeek(addWeeks(currentWeek, 1));
            setMobileDay(addDays(mobileDay, 7));
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          {/* ── MOBILE: single-day view ── */}
          <div className="md:hidden space-y-3">
            {/* Day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {days.map((day) => {
                const isSelected = day.toDateString() === mobileDay.toDateString();
                const isToday = day.toDateString() === new Date().toDateString();
                const count = getAppointmentsForDay(day).length;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setMobileDay(day)}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors min-w-[48px]",
                      isSelected
                        ? "bg-teal-600 text-white"
                        : isToday
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : "bg-white border border-gray-200 text-gray-600"
                    )}
                  >
                    <span className="capitalize">{format(day, "EEE", { locale: fr })}</span>
                    <span className="text-base font-bold">{format(day, "d")}</span>
                    {count > 0 && (
                      <span className={cn("text-[10px] mt-0.5", isSelected ? "text-teal-100" : "text-teal-600")}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day appointments list */}
            <div className="space-y-2">
              {mobileDayApts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">{t("appointments.no_appointments")}</p>
                </div>
              ) : (
                mobileDayApts.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/appointments/${apt.id}`}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-teal-300 hover:shadow-sm transition-all"
                  >
                    <div className="bg-teal-50 rounded-lg px-2.5 py-2 text-center flex-shrink-0">
                      <p className="text-xs font-bold text-teal-700">
                        {format(new Date(apt.date), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{apt.patient.name}</p>
                      <p className="text-xs text-gray-600 truncate">{apt.service.name}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* ── DESKTOP: 7-column week grid ── */}
          <div className="hidden md:grid grid-cols-7 gap-2">
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
                        <p className="font-semibold text-teal-700">{format(new Date(apt.date), "HH:mm")}</p>
                        <p className="text-gray-800 truncate">{apt.patient.name}</p>
                        <p className="text-gray-600 truncate">{apt.service.name}</p>
                        <div className="mt-1"><StatusBadge status={apt.status} /></div>
                      </Link>
                    ))}
                    {dayApts.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-xs text-gray-300">{t("appointments.free")}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
