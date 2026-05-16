"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { Users, MoreVertical, UserPlus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Role = "CLINIC_OWNER" | "CLINIC_STAFF" | "CONFIRMATION_AGENT" | "DOCTOR";

const ROLE_LABELS: Record<Role, string> = {
  CLINIC_OWNER: "Gérant",
  CLINIC_STAFF: "Personnel",
  CONFIRMATION_AGENT: "Agent",
  DOCTOR: "Médecin",
};

const ROLE_COLORS: Record<Role, string> = {
  CLINIC_OWNER: "bg-purple-100 text-purple-800",
  CLINIC_STAFF: "bg-blue-100 text-blue-800",
  CONFIRMATION_AGENT: "bg-teal-100 text-teal-800",
  DOCTOR: "bg-green-100 text-green-800",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  avatar: string | null;
  jobTitle: string | null;
  department: string | null;
  lastActive: Date | null;
  createdAt: Date;
  invitedAt: Date | null;
  permissions: Record<string, boolean> | null;
};

const AvatarCircle = ({ name }: { name: string }) => (
  <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold shrink-0">
    {name.charAt(0).toUpperCase()}
  </div>
);

const RoleBadge = ({ role }: { role: string }) => {
  const color = ROLE_COLORS[role as Role] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{ROLE_LABELS[role as Role] ?? role}</span>;
};

const StatusBadge = ({ member }: { member: Member }) => {
  if (member.isActive && !member.invitedAt) return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 w-fit">Actif</span>
      {member.lastActive && <span className="text-xs text-gray-400">Actif il y a {formatDistanceToNow(new Date(member.lastActive), { locale: fr })}</span>}
    </div>
  );
  if (!member.isActive && member.invitedAt) return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 w-fit">Invité</span>
      <span className="text-xs text-gray-400">Invité le {format(new Date(member.invitedAt), "dd MMM yyyy", { locale: fr })}</span>
    </div>
  );
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 w-fit">Inactif</span>;
};

function MemberRow({
  member,
  onEditRole,
  onRemove,
}: {
  member: Member;
  onEditRole: (m: Member) => void;
  onRemove: (m: Member) => void;
}) {
  const utils = trpc.useUtils();

  const updateMut = trpc.team.update.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const resendMut = trpc.team.resendInvite.useMutation({
    onSuccess: () => toast({ title: "Invitation renvoyée!" }),
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const tenure = formatDistanceToNow(new Date(member.createdAt), { locale: fr });

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <AvatarCircle name={member.name} />
          <div>
            <p className="font-semibold text-sm text-gray-900">{member.name}</p>
            <p className="text-xs text-gray-500">{member.email}</p>
            {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
      <td className="px-4 py-3"><StatusBadge member={member} /></td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-700">{format(new Date(member.createdAt), "dd MMM yyyy", { locale: fr })}</p>
        <p className="text-xs text-gray-400">{tenure}</p>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditRole(member)}>Modifier le rôle</DropdownMenuItem>
            {member.invitedAt && (
              <DropdownMenuItem onClick={() => resendMut.mutate({ userId: member.id })}>
                Renvoyer l&apos;invitation
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {member.isActive ? (
              <DropdownMenuItem
                className="text-orange-600"
                onClick={() => updateMut.mutate({ userId: member.id, isActive: false })}
              >
                Désactiver
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-green-600"
                onClick={() => updateMut.mutate({ userId: member.id, isActive: true })}
              >
                Réactiver
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600" onClick={() => onRemove(member)}>
              Retirer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    role: "" as Role | "",
    sendEmail: true,
    welcomeMessage: "",
  });

  const inviteMut = trpc.team.invite.useMutation({
    onSuccess: () => {
      toast({ title: "Invitation envoyée!" });
      onClose();
      setForm({ name: "", email: "", phone: "", role: "", sendEmail: true, welcomeMessage: "" });
      utils.team.list.invalidate();
    },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) return;
    inviteMut.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role as Role,
      sendEmail: form.sendEmail,
      welcomeMessage: form.welcomeMessage || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLINIC_OWNER">Gérant</SelectItem>
                <SelectItem value="CLINIC_STAFF">Personnel</SelectItem>
                <SelectItem value="CONFIRMATION_AGENT">Agent</SelectItem>
                <SelectItem value="DOCTOR">Médecin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.sendEmail}
              onCheckedChange={(v) => setForm((f) => ({ ...f, sendEmail: v }))}
              id="sendEmail"
            />
            <label htmlFor="sendEmail" className="text-sm text-gray-700">Envoyer l&apos;invitation par email</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message personnalisé <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <Textarea
              value={form.welcomeMessage}
              onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value.slice(0, 200) }))}
              placeholder="Message de bienvenue..."
              rows={3}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.welcomeMessage.length}/200</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={inviteMut.isPending || !form.role}>
              {inviteMut.isPending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [role, setRole] = useState<Role | "">((member?.role as Role) ?? "");
  React.useEffect(() => { setRole((member?.role as Role) ?? ""); }, [member]);

  const updateMut = trpc.team.update.useMutation({
    onSuccess: () => {
      toast({ title: "Rôle mis à jour!" });
      onClose();
      utils.team.list.invalidate();
    },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Modifier le rôle</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CLINIC_OWNER">Gérant</SelectItem>
              <SelectItem value="CLINIC_STAFF">Personnel</SelectItem>
              <SelectItem value="CONFIRMATION_AGENT">Agent</SelectItem>
              <SelectItem value="DOCTOR">Médecin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!role || updateMut.isPending}
            onClick={() => member && role && updateMut.mutate({ userId: member.id, role: role as Role })}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const removeMut = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast({ title: "Membre retiré" });
      onClose();
      utils.team.list.invalidate();
    },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Retirer le membre</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-600">
          Êtes-vous sûr de vouloir retirer <strong>{member?.name}</strong> de l&apos;équipe ?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            variant="destructive"
            disabled={removeMut.isPending}
            onClick={() => member && removeMut.mutate({ userId: member.id })}
          >
            Retirer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClinicTeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "invited">("all");

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.team.list.useQuery({
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter,
  });

  const members = data ?? [];
  const total = members.length;
  const active = members.filter((m) => m.isActive && !m.invitedAt).length;
  const pending = members.filter((m) => !m.isActive && m.invitedAt).length;

  const handleEditRole = useCallback((m: Member) => setEditMember(m), []);
  const handleRemove = useCallback((m: Member) => setRemoveMember(m), []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Users className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Équipe</h1>
            <p className="text-sm text-gray-500">Gérez les membres de votre équipe</p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Inviter un membre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total membres", value: total },
          { label: "Actifs", value: active },
          { label: "En attente", value: pending },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="CLINIC_OWNER">Gérant</SelectItem>
            <SelectItem value="CLINIC_STAFF">Personnel</SelectItem>
            <SelectItem value="CONFIRMATION_AGENT">Agent</SelectItem>
            <SelectItem value="DOCTOR">Médecin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
            <SelectItem value="invited">Invités</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
            <Users className="h-10 w-10" />
            <p className="text-sm">Aucun membre trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Membre", "Rôle", "Statut", "Depuis", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m as Member}
                  onEditRole={handleEditRole}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EditRoleDialog member={editMember} onClose={() => setEditMember(null)} />
      <RemoveDialog member={removeMember} onClose={() => setRemoveMember(null)} />
    </div>
  );
}
