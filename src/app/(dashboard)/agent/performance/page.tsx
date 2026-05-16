"use client";

import { trpc } from "@/lib/trpc";
import { useT } from "@/contexts/LanguageContext";
import {
  CheckCircle2, Phone, TrendingUp, Flame, Award,
  MessageCircle, MessageSquare, Clock, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentPerformancePage() {
  const t = useT();

  const { data: stats, isLoading } = trpc.confirmationManager.getMyStats.useQuery();
  const s = stats as any;

  const confirmationRate = s?.confirmationRate ?? 0;
  const totalCalls = s?.totalCalls ?? 0;
  const totalConfirmed = s?.totalConfirmed ?? 0;
  const weekConfirmed = s?.weekConfirmed ?? 0;
  const currentStreak = s?.currentStreak ?? 0;
  const bestStreak = s?.bestStreak ?? 0;
  const totalWhatsApp = s?.totalWhatsAppSent ?? 0;
  const totalSMS = s?.totalSMSSent ?? 0;
  const avgTime = s?.avgConfirmTime;
  const score = s?.score ?? 0;

  const rateColor =
    confirmationRate >= 70 ? "text-green-600" :
    confirmationRate >= 40 ? "text-amber-600" : "text-red-600";

  const scoreColor =
    score >= 70 ? "bg-green-100 text-green-700 border-green-200" :
    score >= 40 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("agent_performance.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t("agent_performance.subtitle")}</p>
        </div>
        {/* Performance Score Badge */}
        <div className={cn("flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 font-bold", scoreColor)}>
          <span className="text-3xl">{score}</span>
          <span className="text-xs">{t("agent_performance.score")}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalConfirmed}</p>
          <p className="text-xs text-gray-500 mt-1">{t("agent_performance.total_confirmed")}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCalls}</p>
          <p className="text-xs text-gray-500 mt-1">{t("agent_performance.total_calls")}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <p className={cn("text-3xl font-bold", rateColor)}>{Math.round(confirmationRate)}%</p>
          <p className="text-xs text-gray-500 mt-1">{t("agent_performance.confirmation_rate")}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{weekConfirmed}</p>
          <p className="text-xs text-gray-500 mt-1">{t("agent_performance.week_confirmed")}</p>
        </div>
      </div>

      {/* Streak + Channels */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Streaks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streaks
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t("agent_performance.current_streak")}</p>
                <p className="text-xs text-gray-500">{t("agent_performance.days")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Flame className={cn("h-5 w-5", currentStreak > 0 ? "text-orange-500" : "text-gray-300")} />
                <span className="text-2xl font-bold text-gray-900">{currentStreak}</span>
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{t("agent_performance.best_streak")}</p>
                <p className="text-xs text-gray-500">{t("agent_performance.days")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-gray-900">{bestStreak}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Communication Channels</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{t("agent_performance.total_calls")}</span>
                  <span className="font-bold text-gray-900">{totalCalls}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className="h-1.5 bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (totalCalls / Math.max(totalCalls + totalWhatsApp + totalSMS, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{t("agent_performance.whatsapp_sent")}</span>
                  <span className="font-bold text-gray-900">{totalWhatsApp}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className="h-1.5 bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, (totalWhatsApp / Math.max(totalCalls + totalWhatsApp + totalSMS, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{t("agent_performance.sms_sent")}</span>
                  <span className="font-bold text-gray-900">{totalSMS}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className="h-1.5 bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (totalSMS / Math.max(totalCalls + totalWhatsApp + totalSMS, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avg Time */}
      {avgTime != null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{Math.round(avgTime)} {t("agent_performance.minutes")}</p>
            <p className="text-sm text-gray-500">{t("agent_performance.avg_time")}</p>
          </div>
        </div>
      )}

      {/* Confirmation Rate Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">{t("agent_performance.confirmation_rate")}</h3>
          <span className={cn("text-2xl font-bold", rateColor)}>{Math.round(confirmationRate)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-3 rounded-full transition-all",
              confirmationRate >= 70 ? "bg-green-500" : confirmationRate >= 40 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${Math.min(100, confirmationRate)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>0%</span>
          <span className="text-amber-500">40%</span>
          <span className="text-green-500">70%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
