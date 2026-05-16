"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { BookingModal } from "@/components/appointments/BookingModal";
import { AppointmentDetailModal } from "@/components/appointments/AppointmentDetailModal";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { useT } from "@/contexts/LanguageContext";
import {
  CalendarPlus, Search, List, CalendarDays, Filter,
  ChevronLeft, ChevronRight, MoreVertical, Users,
  TrendingUp, TrendingDown, Clock, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Trash2,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  addDays, subDays, eachDayOfInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";
type AptStatus =
  | "PENDING" | "CONFIRMING" | "CONFIRMED"
  | "ATTENDED" | "NO_SHOW" | "CANCELLED" | "RESCHEDULED";

const STATUS_COLORS: Record<AptStatus, string> = {
  PENDING:     "bg-amber-100 text-amber-800",
  CONFIRMING:  "bg-yellow-100 text-yellow-800",
  CONFIRMED:   "bg-emerald-100 text-emerald-800",
  ATTENDED:    "bg-blue-100 text-blue-800",
  NO_SHOW:     "bg-red-100 text-red-800",
  CANCELLED:   "bg-gray-100 text-gray-600",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};

const SOURCE_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  whatsapp: "💬",
  phone: "📞",
  walk_in: "🚶",
  website: "🌐",
  referral: "🤝",
  manual: "✏️",
};

export default function AppointmentsPage() {
  const t = useT();
  const utils = trpc.useUtils();

  // View
  const [view, setView] = useState<ViewMode>("list");

  // List filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Calendar state
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [mobileDay, setMobileDay] = useState(new Date());

  // Modals
  const [bookingOpen, setBookingOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  // Queries
  const { data: stats } = trpc.appointment.stats.useQuery();
  const { data: doctors } = trpc.doctor.list.useQuery();
  const { data: services } = trpc.service.list.useQuery();

  // List query
  const { data: listData, isLoading: listLoading, refetch } = trpc.appointment.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? [statusFilter as AptStatus] : undefined,
    doctorId: doctorFilter !== "all" ? doctorFilter : undefined,
    serviceId: serviceFilter !== "all" ? serviceFilter : undefined,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    page,
    limit: 50,
  });

  // Calendar query
  const weekStart = startOfWeek(currentWeek, { locale: fr });
  const weekEnd = endOfWeek(currentWeek, { locale: fr });
  const { data: calData, isLoading: calLoading } = trpc.appointment.list.useQuery({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    limit: 200,
    page: 1,
  });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAptForDay = (day: Date) =>
    calData?.appointments.filter(
      (a) => new Date(a.date).toDateString() === day.toDateString()
    ) ?? [];

  const mobileDayApts = getAptForDay(mobileDay);

  // Quick actions
  const markAttended = trpc.appointment.markAttended.useMutation({
    onSuccess: () => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); },
  });
  const markNoShow = trpc.appointment.markNoShow.useMutation({
    onSuccess: () => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); },
  });
  const cancel = trpc.appointment.cancel.useMutation({
    onSuccess: () => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); },
  });
  const deleteApt = trpc.appointment.delete.useMutation({
    onSuccess: () => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); },
  });

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isTomorrow = (d: Date) => {
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    return d.toDateString() === tom.toDateString();
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t("appointments.title")}</h1>
          <p className="text-gray-500 text-xs md:text-sm">{t("appointments.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="hidden sm:flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
            >
              <List className="h-3.5 w-3.5" />{t("appointments.list_view")}
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                view === "calendar" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
            >
              <CalendarDays className="h-3.5 w-3.5" />{t("appointments.calendar_view")}
            </button>
          </div>
          <Button size="sm" onClick={() => setBookingOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("appointments.new")}</span>
            <span className="sm:hidden ml-1">+</span>
          </Button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Today */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                <p className="text-xs font-medium text-gray-500">{t("appointments.stats_today")}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.today.total}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {t("appointments.today_breakdown", {
                  confirmed: stats.today.confirmed,
                  pending: stats.today.pending,
                  attended: stats.today.attended,
                })}
              </p>
            </CardContent>
          </Card>

          {/* This week */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {stats.thisWeek.trend >= 0
                  ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />}
                <p className="text-xs font-medium text-gray-500">{t("appointments.stats_week")}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek.count}</p>
              <p className={cn("text-xs mt-0.5", stats.thisWeek.trend >= 0 ? "text-emerald-600" : "text-red-500")}>
                {stats.thisWeek.trend >= 0
                  ? t("appointments.week_trend_up", { pct: stats.thisWeek.trend })
                  : t("appointments.week_trend_down", { pct: Math.abs(stats.thisWeek.trend) })}
              </p>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-medium text-gray-500">{t("appointments.stats_pending")}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending.count}</p>
              {stats.pending.oldestDays !== null && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {t("appointments.oldest_pending", { days: stats.pending.oldestDays })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* No-show rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-gray-500">{t("appointments.stats_no_show")}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.noShowRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("appointments.this_month")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("appointments.search_placeholder")}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder={t("appointments.all_statuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("appointments.all_statuses")}</SelectItem>
                  {(["PENDING","CONFIRMING","CONFIRMED","ATTENDED","NO_SHOW","CANCELLED","RESCHEDULED"] as AptStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{t(`appointments.status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={doctorFilter} onValueChange={(v) => { setDoctorFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder={t("appointments.all_doctors")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("appointments.all_doctors")}</SelectItem>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder={t("appointments.all_services")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("appointments.all_services")}</SelectItem>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder={t("appointments.all_sources")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("appointments.all_sources")}</SelectItem>
                  {["instagram","facebook","whatsapp","phone","walk_in","website","referral","manual"].map((s) => (
                    <SelectItem key={s} value={s}>{t(`appointments.source_${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {listLoading ? (
            <PageLoader />
          ) : !listData?.appointments.length ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <CalendarDays className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">{t("appointments.empty_state")}</p>
              <Button className="mt-4" onClick={() => setBookingOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                {t("appointments.book_first")}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        t("appointments.col_datetime"),
                        t("appointments.col_patient"),
                        t("appointments.col_service"),
                        t("appointments.col_doctor"),
                        t("appointments.col_status"),
                        t("appointments.col_source"),
                        t("appointments.col_actions"),
                      ].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listData.appointments.map((apt) => {
                      const aptDate = new Date(apt.date);
                      const todayApt = isToday(aptDate);
                      const tomorrowApt = isTomorrow(aptDate);
                      return (
                        <tr
                          key={apt.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setDetailId(apt.id)}
                        >
                          {/* Date & time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-gray-900">
                              {format(aptDate, "EEE d MMM", { locale: fr })}
                            </p>
                            <p className="text-xs text-gray-500">{format(aptDate, "HH:mm")}</p>
                            {todayApt && (
                              <Badge className="mt-1 text-[10px] bg-teal-100 text-teal-700 border-0">
                                {t("appointments.today")}
                              </Badge>
                            )}
                            {tomorrowApt && (
                              <Badge className="mt-1 text-[10px] bg-blue-100 text-blue-700 border-0">
                                {t("appointments.tomorrow")}
                              </Badge>
                            )}
                          </td>

                          {/* Patient */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                                {(apt.patient as any).name?.[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate max-w-[140px]">
                                  {(apt.patient as any).name}
                                </p>
                                <p className="text-xs text-gray-500">{(apt.patient as any).phone}</p>
                              </div>
                            </div>
                          </td>

                          {/* Service */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-1 h-8 rounded-full flex-shrink-0"
                                style={{ backgroundColor: (apt.service as any).color || "#0d9488" }}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate max-w-[130px]">
                                  {(apt.service as any).name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(apt.service as any).duration} min · {(apt.service as any).price?.toLocaleString()} DA
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Doctor */}
                          <td className="px-4 py-3">
                            {apt.doctor ? (
                              <div>
                                <p className="text-sm text-gray-800">Dr. {(apt.doctor as any).name}</p>
                                {(apt.doctor as any).specialty && (
                                  <p className="text-xs text-gray-500">{(apt.doctor as any).specialty}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={apt.status} />
                            {apt.confirmer && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {t("appointments.confirmed_by", { name: (apt.confirmer as any).name })}
                              </p>
                            )}
                            {apt.confirmAttempts > 0 && apt.status === "PENDING" && (
                              <p className="text-[10px] text-amber-500 mt-1">
                                {t("appointments.attempts", { count: apt.confirmAttempts })}
                              </p>
                            )}
                          </td>

                          {/* Source */}
                          <td className="px-4 py-3">
                            <span className="text-base" title={apt.source}>
                              {SOURCE_ICONS[apt.source] ?? "•"}
                            </span>
                            <p className="text-[10px] text-gray-400 capitalize">{apt.source.replace("_", " ")}</p>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {["PENDING","CONFIRMING","CONFIRMED"].includes(apt.status) && (
                                <button
                                  title={t("appointments.mark_attended")}
                                  onClick={() => markAttended.mutate({ id: apt.id })}
                                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              {["PENDING","CONFIRMING","CONFIRMED"].includes(apt.status) && (
                                <button
                                  title={t("appointments.mark_no_show")}
                                  onClick={() => markNoShow.mutate({ id: apt.id, reason: "unknown" })}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              {!["CANCELLED","ATTENDED"].includes(apt.status) && (
                                <button
                                  title={t("appointments.reschedule")}
                                  onClick={() => setRescheduleId(apt.id)}
                                  className="p-1.5 rounded hover:bg-purple-50 text-purple-500 transition-colors"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              {!["CANCELLED","ATTENDED"].includes(apt.status) && (
                                <button
                                  title={t("appointments.cancel")}
                                  onClick={() => cancel.mutate({ id: apt.id, reason: "manual" })}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                title={t("appointments.delete")}
                                onClick={() => {
                                  if (confirm(t("common.confirm") + "?")) {
                                    deleteApt.mutate({ id: apt.id });
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-2">
                {listData.appointments.map((apt) => {
                  const aptDate = new Date(apt.date);
                  return (
                    <div
                      key={apt.id}
                      className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 cursor-pointer hover:border-teal-300 transition-all"
                      onClick={() => setDetailId(apt.id)}
                    >
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: (apt.service as any).color || "#0d9488" }}
                      />
                      <div className="bg-teal-50 rounded-lg px-2.5 py-2 text-center flex-shrink-0">
                        <p className="text-xs font-bold text-teal-700">{format(aptDate, "HH:mm")}</p>
                        <p className="text-[10px] text-teal-600">{format(aptDate, "d MMM", { locale: fr })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {(apt.patient as any).name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{(apt.service as any).name}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {listData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    {t("common.page_of", { current: page, total: listData.totalPages })} · {listData.total} RDV
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= listData.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <>
          {/* Week nav */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { setCurrentWeek(subWeeks(currentWeek, 1)); setMobileDay(subDays(mobileDay, 7)); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-sm">
                {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
              </p>
              <p className="text-xs text-gray-500">{calData?.total ?? 0} {t("appointments.title").toLowerCase()}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { setCurrentWeek(addWeeks(currentWeek, 1)); setMobileDay(addDays(mobileDay, 7)); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {calLoading ? <PageLoader /> : (
            <>
              {/* Mobile: single day */}
              <div className="md:hidden space-y-3">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {weekDays.map((day) => {
                    const isSel = day.toDateString() === mobileDay.toDateString();
                    const isTod = day.toDateString() === new Date().toDateString();
                    const count = getAptForDay(day).length;
                    return (
                      <button key={day.toISOString()} onClick={() => setMobileDay(day)}
                        className={cn(
                          "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors min-w-[48px]",
                          isSel ? "bg-teal-600 text-white"
                          : isTod ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-white border border-gray-200 text-gray-600"
                        )}>
                        <span className="capitalize">{format(day, "EEE", { locale: fr })}</span>
                        <span className="text-base font-bold">{format(day, "d")}</span>
                        {count > 0 && (
                          <span className={cn("text-[10px] mt-0.5", isSel ? "text-teal-100" : "text-teal-600")}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {mobileDayApts.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center text-sm text-gray-400">{t("appointments.no_appointments")}</div>
                  ) : mobileDayApts.map((apt) => (
                    <div key={apt.id}
                      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-teal-300 cursor-pointer transition-all"
                      onClick={() => setDetailId(apt.id)}
                    >
                      <div className="bg-teal-50 rounded-lg px-2.5 py-2 text-center flex-shrink-0">
                        <p className="text-xs font-bold text-teal-700">{format(new Date(apt.date), "HH:mm")}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{(apt.patient as any).name}</p>
                        <p className="text-xs text-gray-500 truncate">{(apt.service as any).name}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: 7-col grid */}
              <div className="hidden md:grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayApts = getAptForDay(day);
                  const isTod = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={day.toISOString()} className="space-y-1.5">
                      <div className={cn("text-center py-2 rounded-lg", isTod ? "bg-teal-600 text-white" : "bg-gray-50")}>
                        <p className="text-xs font-medium capitalize">{format(day, "EEE", { locale: fr })}</p>
                        <p className="text-lg font-bold">{format(day, "d")}</p>
                        {dayApts.length > 0 && (
                          <p className={cn("text-xs", isTod ? "text-teal-100" : "text-gray-400")}>
                            {dayApts.length} RDV
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 min-h-[180px]">
                        {dayApts.map((apt) => (
                          <button
                            key={apt.id}
                            onClick={() => setDetailId(apt.id)}
                            className="w-full text-left p-2 rounded-lg border border-gray-100 hover:border-teal-300 hover:shadow-sm transition-all text-xs"
                            style={{ borderLeftWidth: 3, borderLeftColor: (apt.service as any).color || "#0d9488" }}
                          >
                            <p className="font-semibold text-teal-700">{format(new Date(apt.date), "HH:mm")}</p>
                            <p className="text-gray-800 truncate font-medium">{(apt.patient as any).name}</p>
                            <p className="text-gray-500 truncate">{(apt.service as any).name}</p>
                            <div className="mt-1"><StatusBadge status={apt.status} /></div>
                          </button>
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
        </>
      )}

      {/* ── Modals ── */}
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSuccess={() => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); }}
      />

      <AppointmentDetailModal
        appointmentId={detailId}
        onClose={() => setDetailId(null)}
        onRefresh={() => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); }}
      />

      <RescheduleModal
        appointmentId={rescheduleId}
        onClose={() => setRescheduleId(null)}
        onSuccess={() => { utils.appointment.list.invalidate(); utils.appointment.stats.invalidate(); }}
      />
    </div>
  );
}
