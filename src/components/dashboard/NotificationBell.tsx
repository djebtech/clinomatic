"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Calendar, DollarSign, Settings, User, AlertTriangle, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

// ── TYPE MAP ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  APPOINTMENT_CREATED:   { icon: Calendar,      color: "text-blue-600",  bg: "bg-blue-50" },
  APPOINTMENT_CONFIRMED: { icon: Check,          color: "text-green-600", bg: "bg-green-50" },
  APPOINTMENT_CANCELLED: { icon: X,              color: "text-red-600",   bg: "bg-red-50" },
  APPOINTMENT_NO_SHOW:   { icon: AlertTriangle,  color: "text-orange-600",bg: "bg-orange-50" },
  APPOINTMENT_ASSIGNED:  { icon: Calendar,       color: "text-teal-600",  bg: "bg-teal-50" },
  PAYMENT_RECEIVED:      { icon: DollarSign,     color: "text-green-600", bg: "bg-green-50" },
  INVOICE_GENERATED:     { icon: DollarSign,     color: "text-blue-600",  bg: "bg-blue-50" },
  PAYMENT_OVERDUE:       { icon: AlertTriangle,  color: "text-red-600",   bg: "bg-red-50" },
  PLAN_CHANGED:          { icon: Zap,            color: "text-purple-600",bg: "bg-purple-50" },
  WHATSAPP_DISCONNECTED: { icon: AlertTriangle,  color: "text-red-600",   bg: "bg-red-50" },
  USAGE_LIMIT_APPROACHING:{ icon: AlertTriangle, color: "text-orange-600",bg: "bg-orange-50" },
  TEAM_MEMBER_ADDED:     { icon: User,           color: "text-teal-600",  bg: "bg-teal-50" },
  SETTINGS_CHANGED:      { icon: Settings,       color: "text-gray-600",  bg: "bg-gray-50" },
  PATIENT_REGISTERED:    { icon: User,           color: "text-blue-600",  bg: "bg-blue-50" },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: Bell, color: "text-gray-600", bg: "bg-gray-50" };
}

// ── NOTIFICATION ITEM ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
  linkUrl?: string | null;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ id, type, title, message, read, createdAt, linkUrl, onMarkRead, onDelete }: NotificationItemProps) {
  const cfg = getConfig(type);
  const Icon = cfg.icon;
  const [hovered, setHovered] = useState(false);

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        !read && "bg-blue-50/40",
        hovered && "bg-gray-50"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", read ? "font-normal text-gray-700" : "font-semibold text-gray-900")}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{message}</p>
        <p className="mt-1 text-xs text-gray-400">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })}
        </p>
      </div>

      {/* Actions */}
      <div className={cn("flex flex-col items-center gap-1 flex-shrink-0 transition-opacity", hovered ? "opacity-100" : "opacity-0")}>
        {!read && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(id); }}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600"
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Delete"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unread dot */}
      {!read && (
        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );

  if (linkUrl) {
    return <Link href={linkUrl} className="block hover:no-underline">{content}</Link>;
  }
  return <div>{content}</div>;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: countData } = trpc.notification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s
  });
  const { data, isLoading } = trpc.notification.list.useQuery(
    { unreadOnly: tab === "unread", limit: 20 },
    { enabled: open }
  );

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const deleteNotif = trpc.notification.delete.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = countData?.count ?? 0;
  const notifications = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 max-w-[calc(100vw-1rem)] rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium transition-colors",
                  tab === t
                    ? "border-b-2 border-teal-600 text-teal-700"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t === "all" ? "Toutes" : `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full animate-pulse bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune notification</p>
                <p className="text-xs mt-1">Vous êtes à jour!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  title={n.title}
                  message={n.message}
                  read={n.read}
                  createdAt={n.createdAt}
                  linkUrl={n.linkUrl}
                  onMarkRead={(id) => markAsRead.mutate({ id })}
                  onDelete={(id) => deleteNotif.mutate({ id })}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 flex justify-center">
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Préférences de notification →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
