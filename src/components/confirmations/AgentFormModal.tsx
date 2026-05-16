"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  dailyTarget?: number | null;
  employmentType?: string | null;
}

interface Props {
  open: boolean;
  agent?: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgentFormModal({ open, agent, onClose, onSuccess }: Props) {
  const t = useT();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dailyTarget, setDailyTarget] = useState("30");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setEmail(agent.email ?? "");
      setPhone(agent.phone);
      setDailyTarget(String(agent.dailyTarget ?? 30));
      setEmploymentType(agent.employmentType ?? "full_time");
      setTempPassword("");
    } else {
      setName(""); setEmail(""); setPhone("");
      setDailyTarget("30"); setEmploymentType("full_time"); setTempPassword("");
    }
  }, [agent, open]);

  const create = trpc.confirmationManager.createAgent.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_manager.agent_created"), variant: "success" });
      utils.confirmationManager.getAgentList.invalidate();
      utils.confirmationManager.getManagerStats.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const update = trpc.confirmationManager.updateAgent.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_manager.agent_updated"), variant: "success" });
      utils.confirmationManager.getAgentList.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (agent) {
      update.mutate({
        id: agent.id,
        name,
        email: email || undefined,
        phone,
        dailyTarget: parseInt(dailyTarget),
        employmentType,
      });
    } else {
      if (!tempPassword) return;
      create.mutate({
        name,
        email: email || undefined,
        phone,
        dailyTarget: parseInt(dailyTarget),
        employmentType,
        tempPassword,
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {agent ? t("confirmation_manager.edit_agent") : t("confirmation_manager.add_agent")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block">{t("confirmation_manager.agent_name")} *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block">{t("confirmation_manager.agent_phone")} *</Label>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213..." />
          </div>
          <div>
            <Label className="mb-1 block">{t("confirmation_manager.agent_email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">{t("confirmation_manager.agent_daily_target")}</Label>
              <Input
                type="number"
                min="1"
                max="200"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block">{t("confirmation_manager.agent_employment")}</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">{t("confirmation_manager.employment_full_time")}</SelectItem>
                  <SelectItem value="part_time">{t("confirmation_manager.employment_part_time")}</SelectItem>
                  <SelectItem value="freelance">{t("confirmation_manager.employment_freelance")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!agent && (
            <div>
              <Label className="mb-1 block">{t("confirmation_manager.agent_temp_password")} *</Label>
              <Input
                type="password"
                required={!agent}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-teal-600 hover:bg-teal-700">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {agent ? t("confirmation_manager.update_agent") : t("confirmation_manager.create_agent")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
