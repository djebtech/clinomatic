"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useT } from "@/contexts/LanguageContext";
import { ConfirmationPanel } from "@/components/confirmations/ConfirmationPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList, Phone, MessageCircle, Calendar, Clock,
  AlertTriangle, CheckCircle2, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Priority = "all" | "urgent" | "today" | "tomorrow" | "week";
type SortBy = "oldest" | "soonest" | "clinic";

export default function AgentQueuePage() {
  const t = useT();

  const [priority, setPriority] = useState<Priority>("all");
  const [sortBy, setSortBy] = useState<SortBy>("oldest");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: queue, isLoading, refetch } = trpc.confirmationManager.getMyQueue.useQuery({
    priority,
    sortBy,
  });

  const { data: myStats } = trpc.confirmationManager.getMyStats.useQuery();

  const priorityConfig = {
    urgent: { label: t("agent_queue.priority_urgent"), color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", icon: AlertTriangle },
    warning: { label: t("agent_queue.priority_warning"), color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: Clock },
    normal: { label: t("agent_queue.priority_normal"), color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", icon: CheckCircle2 },
  } as const;

  const items = ((queue as any)?.appointments as any[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header + mini stats */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("agent_queue.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t("agent_queue.subtitle")}</p>
        </div>
        {myStats && (
          <div className="hidden md:flex gap-4 text-center">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-teal-700">{(myStats as any).todayConfirmed ?? 0}</p>
              <p className="text-xs text-gray-500">{t("confirmation_manager.stats_today")}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-amber-600">{(myStats as any).pendingCount ?? 0}</p>
              <p className="text-xs text-gray-500">{t("confirmation_manager.stats_pending")}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-gray-900">{Math.round((myStats as any).confirmationRate ?? 0)}%</p>
              <p className="text-xs text-gray-500">{t("agent_performance.confirmation_rate")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Priority filter chips */}
        <div className="flex gap-2">
          {([
            { value: "all", label: t("agent_queue.filter_all"), active: "bg-gray-900 text-white border-gray-900" },
            { value: "urgent", label: t("agent_queue.filter_urgent"), active: "bg-red-600 text-white border-red-600" },
            { value: "today", label: "Today", active: "bg-blue-600 text-white border-blue-600" },
            { value: "tomorrow", label: "Tomorrow", active: "bg-purple-600 text-white border-purple-600" },
            { value: "week", label: "This Week", active: "bg-teal-600 text-white border-teal-600" },
          ] as { value: Priority; label: string; active: string }[]).map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                priority === p.value
                  ? p.active
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto w-44">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">{t("agent_queue.sort_created")}</SelectItem>
              <SelectItem value="soonest">{t("agent_queue.sort_date")}</SelectItem>
              <SelectItem value="clinic">{t("agent_queue.clinic")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <ClipboardList className="h-8 w-8 animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Inbox className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-semibold text-lg">{t("agent_queue.empty")}</p>
          <p className="text-sm mt-1">{t("agent_queue.empty_sub")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => {
            const pConfig = priorityConfig[item.priority as keyof typeof priorityConfig] ?? priorityConfig.normal;
            const PIcon = pConfig.icon;
            const apptDate = new Date(item.date);
            const isFuture = apptDate > new Date();

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority indicator */}
                  <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", pConfig.dot)} />

                  {/* Patient avatar */}
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold flex-shrink-0 mt-0.5">
                    {(item.patient?.name ?? "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.patient?.name ?? "—"}</p>
                        <p className="text-sm text-gray-500">{item.patient?.phone}</p>
                      </div>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 flex items-center gap-1", pConfig.color)}>
                        <PIcon className="h-3 w-3" />
                        {pConfig.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(apptDate, "EEE d MMM · HH:mm", { locale: fr })}
                      </span>
                      {item.clinic && (
                        <span className="flex items-center gap-1 text-teal-600 font-medium">
                          {item.clinic.name}
                        </span>
                      )}
                      <span>{item.service?.name}</span>
                      {item.doctor && <span>{item.doctor.name}</span>}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-gray-400">
                        {isFuture
                          ? `${t("agent_queue.appt_in")} ${formatDistanceToNow(apptDate, { locale: fr })}`
                          : `${t("agent_queue.pending_for")} ${formatDistanceToNow(new Date(item.createdAt), { locale: fr })}`
                        }
                      </span>
                      {item.confirmAttempts > 0 && (
                        <span className="text-amber-600 font-medium">
                          {item.confirmAttempts} {t("agent_queue.attempts")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex gap-2 pl-11">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("agent_queue.confirm_btn")}
                  </button>
                  <a
                    href={`tel:${item.patient?.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-gray-300 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t("confirmation_panel.method_call")}
                  </a>
                  <a
                    href={`https://wa.me/${(item.patient?.phone ?? "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-gray-300 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Panel */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedItem(null)}
          />
          <ConfirmationPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onSuccess={() => { setSelectedItem(null); refetch(); }}
          />
        </>
      )}
    </div>
  );
}
