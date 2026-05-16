"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { Search, ChevronLeft, ChevronRight, Loader2, UserPlus, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth,
  isSameDay, isToday, isPast, startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

type Step = 1 | 2 | 3 | 4;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedPatientId?: string;
}

const SOURCES = [
  "instagram", "facebook", "whatsapp", "phone", "walk_in", "website", "referral", "manual",
] as const;

export function BookingModal({ open, onClose, onSuccess, preselectedPatientId }: Props) {
  const t = useT();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(preselectedPatientId ? 2 : 1);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId || "");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: "", phone: "" });

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [customTime, setCustomTime] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Queries
  const { data: patientsData } = trpc.patient.list.useQuery({ limit: 200, page: 1 });
  const { data: services } = trpc.service.list.useQuery();
  const { data: doctors } = trpc.doctor.list.useQuery();

  const selectedService = services?.find((s) => s.id === selectedServiceId);
  const selectedPatient = patientsData?.patients?.find((p) => p.id === selectedPatientId);

  const availabilityDateStr = selectedDate ? selectedDate.toISOString() : "";
  const { data: availability, isLoading: slotsLoading } = trpc.appointment.checkAvailability.useQuery(
    {
      doctorId: selectedDoctorId || undefined,
      date: availabilityDateStr,
      duration: selectedService?.duration ?? 30,
    },
    { enabled: !!selectedDate && !!selectedServiceId }
  );

  const createPatient = trpc.patient.create.useMutation({
    onSuccess: (p) => {
      setSelectedPatientId(p.id);
      setShowQuickAdd(false);
      setQuickAddForm({ name: "", phone: "" });
      setStep(2);
    },
  });

  const createAppointment = trpc.appointment.create.useMutation({
    onSuccess: () => {
      toast({ title: t("appointments.booking_success"), variant: "success" });
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      handleClose();
      onSuccess?.();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep(preselectedPatientId ? 2 : 1);
      setPatientSearch("");
      setSelectedPatientId(preselectedPatientId || "");
      setSelectedServiceId("");
      setSelectedDoctorId("");
      setSelectedDate(null);
      setSelectedTime("");
      setCustomTime(false);
      setCustomTimeValue("");
      setSource("manual");
      setNotes("");
      setPaid(false);
    }, 300);
  }

  function handleBook() {
    if (!selectedPatientId || !selectedServiceId || !selectedDate) return;
    const timeStr = customTime ? customTimeValue : selectedTime;
    if (!timeStr) return;

    const [h, m] = timeStr.split(":").map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(h, m, 0, 0);

    createAppointment.mutate({
      patientId: selectedPatientId,
      serviceId: selectedServiceId,
      doctorId: selectedDoctorId || undefined,
      date: dateTime.toISOString(),
      duration: selectedService?.duration,
      source,
      notes: notes || undefined,
      paid,
      paymentMethod: paid ? paymentMethod : undefined,
    });
  }

  // Calendar helpers
  const calStart = startOfWeek(startOfMonth(calendarMonth), { locale: fr });
  const calEnd = endOfWeek(endOfMonth(calendarMonth), { locale: fr });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const filteredPatients = (patientsData?.patients ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const morningSlots = availability?.slots.filter((s) => {
    const h = parseInt(s.time.split(":")[0]);
    return h < 13;
  }) ?? [];
  const afternoonSlots = availability?.slots.filter((s) => {
    const h = parseInt(s.time.split(":")[0]);
    return h >= 13;
  }) ?? [];

  const stepTitles = [
    t("appointments.step_patient"),
    t("appointments.step_service"),
    t("appointments.step_datetime"),
    t("appointments.step_confirm"),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("appointments.new")}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === s
                    ? "bg-teal-600 text-white"
                    : step > s
                    ? "bg-teal-100 text-teal-700"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={cn("text-xs hidden sm:inline", step === s ? "font-semibold text-teal-700" : "text-gray-400")}>
                {stepTitles[s - 1]}
              </span>
              {s < 4 && <div className={cn("h-px w-4 sm:w-8 flex-shrink-0", step > s ? "bg-teal-400" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Patient ── */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder={t("appointments.search_patient")}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredPatients.length === 0 ? (
                <p className="p-4 text-sm text-center text-gray-400">{t("appointments.no_patients_found")}</p>
              ) : (
                filteredPatients.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors",
                      selectedPatientId === p.id && "bg-teal-50 border-l-2 border-teal-500"
                    )}
                    onClick={() => { setSelectedPatientId(p.id); setStep(2); }}
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-sm">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Quick add */}
            <div className="border-t pt-3">
              {!showQuickAdd ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowQuickAdd(true)}>
                  <UserPlus className="h-4 w-4" />
                  {t("appointments.new_patient")}
                </Button>
              ) : (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">{t("appointments.new_patient")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t("common.name")} *</Label>
                      <Input
                        value={quickAddForm.name}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                        placeholder="Ahmed Benali"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("common.phone")} *</Label>
                      <Input
                        value={quickAddForm.phone}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, phone: e.target.value })}
                        placeholder="0555 000 000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!quickAddForm.name || !quickAddForm.phone || createPatient.isPending}
                      onClick={() => createPatient.mutate({ name: quickAddForm.name, phone: quickAddForm.phone })}
                    >
                      {createPatient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {t("appointments.save_continue")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Service & Doctor ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("appointments.step_patient")}: <span className="font-semibold text-gray-900">{selectedPatient?.name}</span>
            </p>

            <div>
              <Label className="mb-2 block">{t("appointments.choose_service")} *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {services?.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedServiceId(svc.id); setSelectedTime(""); }}
                    className={cn(
                      "text-left p-3 rounded-lg border-2 transition-all",
                      selectedServiceId === svc.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: svc.color || "#0d9488" }}
                      />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{svc.name}</p>
                        <p className="text-xs text-gray-500">{svc.duration} min</p>
                        <p className="text-sm font-bold text-teal-700 mt-0.5">
                          {svc.price.toLocaleString()} DA
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {doctors && doctors.length > 0 && (
              <div>
                <Label className="mb-2 block">{t("appointments.select_doctor")}</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("appointments.no_doctor")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("appointments.no_doctor")}</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.name}{d.specialty ? ` — ${d.specialty}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4" />{t("common.back")}</Button>
              <Button disabled={!selectedServiceId} onClick={() => setStep(3)}>
                {t("common.next")}<ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Date & Time ── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Mini calendar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="font-semibold text-sm capitalize">
                  {format(calendarMonth, "MMMM yyyy", { locale: fr })}
                </p>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
                {calDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const isPastDay = isPast(startOfDay(day)) && !isToday(day);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isTodayDay = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPastDay || !isCurrentMonth}
                      onClick={() => { setSelectedDate(day); setSelectedTime(""); }}
                      className={cn(
                        "text-center py-1.5 text-sm rounded transition-colors",
                        !isCurrentMonth && "opacity-0 pointer-events-none",
                        isPastDay && "text-gray-300 cursor-not-allowed",
                        isSelected && "bg-teal-600 text-white font-bold",
                        isTodayDay && !isSelected && "border border-teal-400 text-teal-700 font-semibold",
                        !isSelected && !isPastDay && isCurrentMonth && "hover:bg-gray-100"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium">
                    {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                  </p>
                </div>

                {slotsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-teal-600" /></div>
                ) : availability?.closed ? (
                  <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    {t("appointments.clinic_closed")}
                  </p>
                ) : (
                  <>
                    {morningSlots.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">{t("appointments.morning")}</p>
                        <div className="flex flex-wrap gap-2">
                          {morningSlots.map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => { setSelectedTime(slot.time); setCustomTime(false); }}
                              className={cn(
                                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                !slot.available && "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through",
                                slot.available && selectedTime === slot.time && "bg-teal-600 text-white border-teal-600",
                                slot.available && selectedTime !== slot.time && "border-gray-300 hover:border-teal-400"
                              )}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">{t("appointments.afternoon")}</p>
                        <div className="flex flex-wrap gap-2">
                          {afternoonSlots.map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => { setSelectedTime(slot.time); setCustomTime(false); }}
                              className={cn(
                                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                !slot.available && "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through",
                                slot.available && selectedTime === slot.time && "bg-teal-600 text-white border-teal-600",
                                slot.available && selectedTime !== slot.time && "border-gray-300 hover:border-teal-400"
                              )}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {(availability?.slots ?? []).length === 0 && (
                      <p className="text-sm text-gray-500">{t("appointments.no_slots_available")}</p>
                    )}
                  </>
                )}

                {/* Custom time */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customTime}
                    onChange={(e) => { setCustomTime(e.target.checked); setSelectedTime(""); }}
                    className="accent-teal-600"
                  />
                  <span className="text-xs text-gray-500">{t("appointments.custom_time")}</span>
                </label>
                {customTime && (
                  <Input
                    type="time"
                    value={customTimeValue}
                    onChange={(e) => setCustomTimeValue(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4" />{t("common.back")}</Button>
              <Button
                disabled={!selectedDate || (!selectedTime && !customTimeValue)}
                onClick={() => setStep(4)}
              >
                {t("common.next")}<ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirm ── */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-800 mb-3">{t("appointments.review")}</p>
              {[
                { label: t("appointments.step_patient"), value: selectedPatient?.name },
                { label: t("common.phone"), value: selectedPatient?.phone },
                { label: t("appointments.step_service"), value: selectedService?.name },
                {
                  label: t("common.date"),
                  value: selectedDate
                    ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                    : "",
                },
                { label: t("common.time"), value: customTime ? customTimeValue : selectedTime },
                { label: t("common.duration"), value: `${selectedService?.duration} min` },
                {
                  label: t("common.price"),
                  value: `${selectedService?.price.toLocaleString()} DA`,
                },
                ...(selectedDoctorId
                  ? [{ label: t("appointments.step_service"), value: doctors?.find((d) => d.id === selectedDoctorId)?.name }]
                  : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Source */}
            <div>
              <Label className="mb-1 block">{t("appointments.source_label")} *</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`appointments.source_${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="paid"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="accent-teal-600 w-4 h-4"
              />
              <Label htmlFor="paid">{t("appointments.also_mark_paid")}</Label>
              {paid && (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-32 ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("appointments.cash")}</SelectItem>
                    <SelectItem value="card">{t("appointments.card")}</SelectItem>
                    <SelectItem value="transfer">{t("appointments.transfer")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1 block">{t("common.notes")}</Label>
              <textarea
                className="w-full min-h-[72px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Notes internes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="h-4 w-4" />{t("common.back")}</Button>
              <Button
                onClick={handleBook}
                disabled={createAppointment.isPending}
                className="flex-1"
              >
                {createAppointment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("appointments.book_appointment")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
