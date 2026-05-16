"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { Loader2, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  agentId: string | null;
  agentName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClinicAssignmentModal({ open, agentId, agentName, onClose, onSuccess }: Props) {
  const t = useT();
  const utils = trpc.useUtils();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: clinics, isLoading } = trpc.confirmationManager.getAllClinicsWithAssignments.useQuery(
    undefined,
    { enabled: open }
  );

  useEffect(() => {
    if (!clinics || !agentId) return;
    const already = (clinics as any[])
      .filter((c: any) => c.agentAssignments?.some((a: any) => a.agentId === agentId))
      .map((c: any) => c.id);
    setSelectedIds(already);
  }, [clinics, agentId]);

  const assign = trpc.confirmationManager.assignClinics.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_manager.clinics_updated"), variant: "success" });
      utils.confirmationManager.getAgentList.invalidate();
      utils.confirmationManager.getAllClinicsWithAssignments.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("confirmation_manager.assign_clinics")}
            {agentName && <span className="text-gray-500 font-normal ml-2 text-base">— {agentName}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {((clinics as any[]) ?? []).map((clinic: any) => {
              const selected = selectedIds.includes(clinic.id);
              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => toggle(clinic.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all",
                    selected
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2",
                    selected ? "bg-teal-600 border-teal-600" : "border-gray-300"
                  )}>
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{clinic.name}</p>
                    <p className="text-xs text-gray-500">{clinic.city ?? clinic.slug}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-teal-600 hover:bg-teal-700"
            disabled={assign.isPending || !agentId}
            onClick={() => assign.mutate({ agentId: agentId!, clinicIds: selectedIds })}
          >
            {assign.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t("confirmation_manager.assign_clinics")} ({selectedIds.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
