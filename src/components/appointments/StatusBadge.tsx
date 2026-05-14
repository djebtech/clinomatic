import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  PENDING: { label: "En attente", labelAr: "قيد الانتظار", variant: "warning" },
  CONFIRMING: { label: "En cours", labelAr: "جاري التأكيد", variant: "default" },
  CONFIRMED: { label: "Confirmé", labelAr: "مؤكد", variant: "success" },
  ATTENDED: { label: "Présent", labelAr: "حضر", variant: "success" },
  NO_SHOW: { label: "Absent", labelAr: "غائب", variant: "destructive" },
  CANCELLED: { label: "Annulé", labelAr: "ملغي", variant: "secondary" },
  RESCHEDULED: { label: "Reporté", labelAr: "مؤجل", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
  showArabic?: boolean;
}

export function StatusBadge({ status, showArabic }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, labelAr: status, variant: "secondary" as const };
  return (
    <Badge variant={config.variant}>
      {showArabic ? config.labelAr : config.label}
    </Badge>
  );
}
