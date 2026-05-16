"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useT } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { AgentFormModal } from "@/components/confirmations/AgentFormModal";
import { ClinicAssignmentModal } from "@/components/confirmations/ClinicAssignmentModal";
import {
  Users, ClipboardList, Clock, CheckCircle2, TrendingUp,
  Plus, Pencil, Building2, Trophy, Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "agents" | "leaderboard";
type LeaderboardPeriod = "today" | "week" | "month";

export default function ConfirmationManagerPage() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("agents");
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<any | null>(null);
  const [assignAgent, setAssignAgent] = useState<{ id: string; name: string } | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.confirmationManager.getManagerStats.useQuery();
  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = trpc.confirmationManager.getAgentList.useQuery();
  const { data: leaderboard } = trpc.confirmationManager.getLeaderboard.useQuery({ period }, { enabled: tab === "leaderboard" });

  const statCards = [
    { key: "agents", label: t("confirmation_manager.stats_agents"), value: (stats as any)?.agentCount ?? 0, icon: Users, color: "text-teal-600 bg-teal-50" },
    { key: "pending", label: t("confirmation_manager.stats_pending"), value: (stats as any)?.pendingCount ?? 0, icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
    { key: "oldest", label: t("confirmation_manager.stats_oldest"), value: (stats as any)?.oldestDays ?? 0, icon: Clock, color: "text-red-600 bg-red-50" },
    { key: "today", label: t("confirmation_manager.stats_today"), value: (stats as any)?.todayConfirmed ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    { key: "rate", label: t("confirmation_manager.stats_success_rate"), value: `${Math.round((stats as any)?.successRate ?? 0)}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  ];

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500 font-bold text-sm w-5 text-center">{rank}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("confirmation_manager.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t("confirmation_manager.subtitle")}</p>
        </div>
        <Button
          onClick={() => { setEditAgent(null); setShowForm(true); }}
          className="bg-teal-600 hover:bg-teal-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("confirmation_manager.add_agent")}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(({ key, label, value, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{statsLoading ? "—" : value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["agents", "leaderboard"] as TabKey[]).map((t_key) => (
          <button
            key={t_key}
            onClick={() => setTab(t_key)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              tab === t_key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t_key === "agents" ? t("confirmation_manager.agents_tab") : t("confirmation_manager.leaderboard_tab")}
          </button>
        ))}
      </div>

      {/* AGENTS TAB */}
      {tab === "agents" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {agentsLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>
          ) : !agents || (agents as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p>{t("confirmation_manager.no_agents")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{t("confirmation_manager.agent_name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{t("confirmation_manager.agent_phone")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t("confirmation_manager.score")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t("confirmation_manager.pending")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t("confirmation_manager.confirmed_today")}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(agents as any[]).map((agent: any) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{agent.name}</p>
                          <p className="text-xs text-gray-500">{agent.email ?? agent.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-sm text-gray-600">{agent.phone}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm",
                        agent.performanceScore >= 70 ? "bg-green-100 text-green-700" :
                        agent.performanceScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>
                        {agent.performanceScore ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-amber-700">{agent.pendingCount ?? 0}</td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-green-700">{agent.todayConfirmed ?? 0}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAssignAgent({ id: agent.id, name: agent.name })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600"
                          title={t("confirmation_manager.assign_clinics")}
                        >
                          <Building2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditAgent(agent); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600"
                          title={t("confirmation_manager.edit_agent")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {tab === "leaderboard" && (
        <div className="space-y-4">
          {/* Period selector */}
          <div className="flex gap-2">
            {(["today", "week", "month"] as LeaderboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                  period === p
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                )}
              >
                {p === "today" ? t("confirmation_manager.period_today") :
                 p === "week" ? t("confirmation_manager.period_week") : t("confirmation_manager.period_month")}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!leaderboard || (leaderboard as any[]).length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <p>{t("confirmation_manager.no_agents")}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(leaderboard as any[]).map((entry: any, idx: number) => (
                  <div key={entry.userId} className={cn(
                    "flex items-center gap-4 px-5 py-4",
                    idx === 0 ? "bg-yellow-50" : idx === 1 ? "bg-gray-50" : idx === 2 ? "bg-amber-50/50" : ""
                  )}>
                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                      {rankIcon(idx + 1)}
                    </div>
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold flex-shrink-0">
                      {(entry.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{entry.name}</p>
                      <p className="text-xs text-gray-500">{entry.email ?? ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-700">{entry.confirmed ?? 0}</p>
                      <p className="text-xs text-gray-500">confirmed</p>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                      entry.score >= 70 ? "bg-green-100 text-green-700" :
                      entry.score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {entry.score ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AgentFormModal
        open={showForm}
        agent={editAgent}
        onClose={() => { setShowForm(false); setEditAgent(null); }}
        onSuccess={() => refetchAgents()}
      />
      <ClinicAssignmentModal
        open={!!assignAgent}
        agentId={assignAgent?.id ?? null}
        agentName={assignAgent?.name}
        onClose={() => setAssignAgent(null)}
        onSuccess={() => refetchAgents()}
      />
    </div>
  );
}
