"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/contexts/LanguageContext";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  PENDING: "warning",
  CONFIRMING: "default",
  CONFIRMED: "success",
  ATTENDED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "secondary",
  RESCHEDULED: "outline",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useT();
  const variant = STATUS_VARIANTS[status] ?? "secondary";
  const label = t(`appointments.status.${status}`) || status;
  return <Badge variant={variant}>{label}</Badge>;
}
