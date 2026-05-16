"use client";

import { useState, useEffect, use } from "react";
import { trpc } from "@/lib/trpc";
import {
  MapPin, Phone, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, Calendar, User, MessageCircle, Star,
  Loader2, AlertCircle, PartyPopper, Share2,
} from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Step = "service" | "datetime" | "info" | "confirm" | "success";

interface BookingData {
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  doctorId?: string;
  doctorName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientDob: string;
  patientGender: string;
  notes: string;
  consentWhatsApp: boolean;
  consentTerms: boolean;
}

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [step, setStep] = useState<Step>("service");
  const [booking, setBooking] = useState<Partial<BookingData>>({
    consentWhatsApp: true,
    consentTerms: false,
  });
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Track visit
  const trackVisit = trpc.publicBooking.trackVisit.useMutation();
  useEffect(() => {
    const deviceType = /Mobile|Android|iPhone/.test(navigator.userAgent) ? "mobile" : "desktop";
    trackVisit.mutate({ clinicSlug: slug, referrer: document.referrer || undefined, deviceType });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const { data: clinic, isLoading: clinicLoading, error: clinicError } = trpc.publicBooking.getClinicBySlug.useQuery({ slug });
  const { data: pageStats } = trpc.publicBooking.getPageStats.useQuery({ clinicSlug: slug });

  // Availability query
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { data: availability, isLoading: avLoading } = trpc.publicBooking.checkAvailability.useQuery(
    { clinicSlug: slug, serviceId: booking.serviceId ?? "", doctorId: booking.doctorId, date: selectedDate },
    { enabled: !!booking.serviceId && !!selectedDate }
  );

  const createBooking = trpc.publicBooking.createPublicBooking.useMutation({
    onSuccess: (data) => {
      setBookingResult(data);
      setStep("success");
    },
    onError: (err) => setError(err.message),
  });

  if (clinicLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (clinicError || !clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Clinique introuvable</h1>
          <p className="text-gray-500 mt-2">Cette page de réservation n&apos;existe pas.</p>
        </div>
      </div>
    );
  }

  const customization = clinic.bookingPageCustomization as any ?? {};
  const primaryColor = customization.primaryColor ?? "#0d9488";

  // Generate calendar days (next 30 days)
  const today = startOfDay(new Date());
  const calendarDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const workingHours = clinic.workingHours as Record<string, { open: string; close: string; enabled: boolean }>;
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function isDayAvailable(date: Date) {
    const dayName = DAY_NAMES[date.getDay()];
    return workingHours[dayName]?.enabled ?? false;
  }

  function submitBooking() {
    if (!booking.serviceId || !booking.date || !booking.time) return;
    setError(null);
    const dateTime = new Date(`${booking.date}T${booking.time}`);
    createBooking.mutate({
      clinicSlug: slug,
      serviceId: booking.serviceId,
      doctorId: booking.doctorId,
      date: dateTime.toISOString(),
      patientName: booking.patientName ?? "",
      patientPhone: booking.patientPhone ?? "",
      patientEmail: booking.patientEmail || undefined,
      patientDob: booking.patientDob || undefined,
      patientGender: booking.patientGender || undefined,
      notes: booking.notes || undefined,
      consentWhatsApp: booking.consentWhatsApp ?? true,
      referrer: document.referrer || undefined,
      deviceType: /Mobile|Android|iPhone/.test(navigator.userAgent) ? "mobile" : "desktop",
    });
  }

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (step === "success" && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col">
        <div className="max-w-md mx-auto w-full px-4 py-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rendez-vous confirmé ! 🎉</h1>
            <p className="text-gray-500 mt-2">Vous recevrez une confirmation WhatsApp.</p>
          </div>

          {/* Booking card */}
          <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">Réf. #{bookingResult.bookingRef}</span>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Clinique</span>
                <span className="font-semibold text-gray-900">{bookingResult.clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="font-semibold text-gray-900">{bookingResult.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">
                  {format(new Date(bookingResult.appointmentDate), "EEEE d MMMM yyyy · HH:mm", { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prix</span>
                <span className="font-bold text-teal-700">{bookingResult.servicePrice.toLocaleString()} DA</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "Mon rendez-vous",
                  text: `Rendez-vous à ${bookingResult.clinicName} le ${format(new Date(bookingResult.appointmentDate), "d MMMM yyyy à HH:mm", { locale: fr })}`,
                });
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium text-sm"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>

          <p className="text-sm text-gray-500">
            {bookingResult.clinicPhone && (
              <>Pour toute question, appelez{" "}
                <a href={`tel:${bookingResult.clinicPhone}`} className="text-teal-600 font-medium">
                  {bookingResult.clinicPhone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-teal-700 text-white py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          {clinic.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.logo} alt={clinic.name} className="w-16 h-16 rounded-full mx-auto mb-4 object-cover border-2 border-white/30" />
          )}
          <h1 className="text-3xl font-bold">{clinic.name}</h1>
          {clinic.city && <p className="mt-1 text-teal-100 text-sm flex items-center justify-center gap-1.5">
            <MapPin className="h-4 w-4" /> {clinic.address ?? clinic.city}
          </p>}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            {clinic.phone && (
              <a href={`tel:${clinic.phone}`} className="flex items-center gap-1.5 text-teal-100 hover:text-white">
                <Phone className="h-4 w-4" /> {clinic.phone}
              </a>
            )}
            {clinic.phone && (
              <a href={`https://wa.me/${clinic.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-teal-100 hover:text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-teal-200">
            {pageStats && (
              <>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {pageStats.totalPatients}+ patients
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Disponible 24h/24
                </span>
              </>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Réservation instantanée
            </span>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {step !== "service" && step !== "success" && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            {(["datetime", "info", "confirm"] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  (step === s || (s === "datetime" && ["datetime","info","confirm"].indexOf(step) >= 0))
                    ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
                )}>
                  {idx + 1}
                </div>
                <span className={cn("text-xs hidden sm:inline", step === s ? "text-teal-700 font-medium" : "text-gray-400")}>
                  {s === "datetime" ? "Date & Heure" : s === "info" ? "Vos infos" : "Confirmer"}
                </span>
                {idx < 2 && <div className="h-px flex-1 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── STEP: SERVICE SELECTION ─────────────────────────────────────── */}
        {step === "service" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Choisir un service</h2>
              <p className="text-gray-500 text-sm">{clinic.services.length} services disponibles</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clinic.services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setBooking((b) => ({ ...b, serviceId: service.id, serviceName: service.name, servicePrice: service.price, serviceDuration: service.duration }));
                    setStep("datetime");
                  }}
                  className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-teal-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", service.color ? "" : "bg-teal-500")}
                      style={service.color ? { backgroundColor: service.color } : {}} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{service.name}</p>
                      {service.nameAr && <p className="text-xs text-gray-400 mt-0.5">{service.nameAr}</p>}
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {service.duration} min
                        </span>
                        <span className="text-sm font-bold text-teal-700">
                          {service.price.toLocaleString()} DA
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>

            {/* Doctors section */}
            {clinic.doctors.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Notre Équipe Médicale</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {clinic.doctors.map((doctor) => (
                    <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <div className="w-12 h-12 bg-teal-100 rounded-full mx-auto flex items-center justify-center text-teal-700 font-bold text-lg mb-2">
                        {doctor.name.charAt(0)}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{doctor.name}</p>
                      {doctor.specialty && <p className="text-xs text-gray-500 mt-0.5">{doctor.specialty}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-teal-50 rounded-2xl p-5 border border-teal-100">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Comment ça marche ?</h3>
              <div className="space-y-3">
                {[
                  { n: "1", icon: Calendar, label: "Choisissez votre service et créneau horaire" },
                  { n: "2", icon: User, label: "Entrez vos coordonnées (rapide, 30 secondes)" },
                  { n: "3", icon: CheckCircle2, label: "Recevez une confirmation WhatsApp immédiate" },
                ].map(({ n, icon: Icon, label }) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{n}</div>
                    <Icon className="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── STEP: DATE & TIME ────────────────────────────────────────────── */}
        {step === "datetime" && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("service")} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choisir la date</h2>
                <p className="text-gray-500 text-sm">{booking.serviceName} · {booking.servicePrice?.toLocaleString()} DA</p>
              </div>
            </div>

            {/* Doctor selection (optional) */}
            {clinic.doctors.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Médecin (optionnel)</label>
                <select
                  value={booking.doctorId ?? ""}
                  onChange={(e) => setBooking((b) => ({ ...b, doctorId: e.target.value || undefined, doctorName: clinic.doctors.find(d => d.id === e.target.value)?.name }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Pas de préférence</option>
                  {clinic.doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Calendar */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Sélectionnez une date</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {calendarDays.filter(isDayAvailable).slice(0, 14).map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const selected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "flex flex-col items-center px-3 py-2.5 rounded-xl border text-sm flex-shrink-0 min-w-[56px] transition-all",
                        selected ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"
                      )}
                    >
                      <span className="text-xs uppercase opacity-70">{format(day, "EEE", { locale: fr })}</span>
                      <span className="text-lg font-bold">{format(day, "d")}</span>
                      <span className="text-xs opacity-70">{format(day, "MMM", { locale: fr })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Créneaux disponibles</p>
                {avLoading ? (
                  <div className="flex items-center justify-center h-24 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !availability?.slots.length || availability.reason === "closed" ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {availability?.reason === "closed" ? "Fermé ce jour" : "Aucun créneau disponible"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Morning */}
                    {availability.slots.filter(s => parseInt(s.time.split(":")[0]) < 12).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1.5">🌅 Matin</p>
                        <div className="flex flex-wrap gap-2">
                          {availability.slots.filter(s => parseInt(s.time.split(":")[0]) < 12).map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => { setBooking((b) => ({ ...b, date: selectedDate, time: slot.time })); setStep("info"); }}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                                !slot.available ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" :
                                booking.time === slot.time ? "bg-teal-600 text-white border-teal-600" :
                                "bg-white text-gray-700 border-gray-200 hover:border-teal-400"
                              )}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Afternoon */}
                    {availability.slots.filter(s => parseInt(s.time.split(":")[0]) >= 12).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">🌆 Après-midi</p>
                        <div className="flex flex-wrap gap-2">
                          {availability.slots.filter(s => parseInt(s.time.split(":")[0]) >= 12).map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => { setBooking((b) => ({ ...b, date: selectedDate, time: slot.time })); setStep("info"); }}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                                !slot.available ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" :
                                booking.time === slot.time ? "bg-teal-600 text-white border-teal-600" :
                                "bg-white text-gray-700 border-gray-200 hover:border-teal-400"
                              )}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── STEP: PATIENT INFO ───────────────────────────────────────────── */}
        {step === "info" && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("datetime")} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Vos informations</h2>
            </div>

            {/* Selected summary */}
            <div className="bg-teal-50 rounded-xl border border-teal-100 p-4 text-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{booking.serviceName}</p>
                  <p className="text-teal-700 text-xs mt-0.5">
                    {booking.date && format(new Date(`${booking.date}T${booking.time}`), "EEEE d MMMM · HH:mm", { locale: fr })}
                  </p>
                </div>
                <span className="font-bold text-teal-700">{booking.servicePrice?.toLocaleString()} DA</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Mohammed Benali"
                  value={booking.patientName ?? ""}
                  onChange={(e) => setBooking((b) => ({ ...b, patientName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone * (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  placeholder="+213 555 000 000"
                  value={booking.patientPhone ?? ""}
                  onChange={(e) => setBooking((b) => ({ ...b, patientPhone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  placeholder="email@exemple.com"
                  value={booking.patientEmail ?? ""}
                  onChange={(e) => setBooking((b) => ({ ...b, patientEmail: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={booking.patientDob ?? ""}
                    onChange={(e) => setBooking((b) => ({ ...b, patientDob: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                  <select
                    value={booking.patientGender ?? ""}
                    onChange={(e) => setBooking((b) => ({ ...b, patientGender: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">—</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Motif de consultation</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Douleur dentaire, contrôle annuel..."
                  value={booking.notes ?? ""}
                  onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Consent */}
              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={booking.consentWhatsApp ?? true}
                    onChange={(e) => setBooking((b) => ({ ...b, consentWhatsApp: e.target.checked }))}
                    className="accent-teal-600 w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600">
                    J&apos;accepte de recevoir des rappels et confirmations via WhatsApp
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={booking.consentTerms ?? false}
                    onChange={(e) => setBooking((b) => ({ ...b, consentTerms: e.target.checked }))}
                    className="accent-teal-600 w-4 h-4 mt-0.5 flex-shrink-0"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    J&apos;accepte les <span className="text-teal-600 underline">conditions d&apos;utilisation</span>
                  </span>
                </label>
              </div>

              <button
                disabled={!booking.patientName || !booking.patientPhone || !booking.consentTerms}
                onClick={() => setStep("confirm")}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-base hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CONFIRM ────────────────────────────────────────────────── */}
        {step === "confirm" && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("info")} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Confirmer le rendez-vous</h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Récapitulatif</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Service", value: booking.serviceName },
                  { label: "Date & heure", value: booking.date ? format(new Date(`${booking.date}T${booking.time}`), "EEEE d MMMM yyyy · HH:mm", { locale: fr }) : "" },
                  ...(booking.doctorName ? [{ label: "Médecin", value: booking.doctorName }] : []),
                  { label: "Patient", value: booking.patientName },
                  { label: "Téléphone", value: booking.patientPhone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2.5 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-teal-700">{booking.servicePrice?.toLocaleString()} DA</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={submitBooking}
              disabled={createBooking.isPending}
              className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-base hover:bg-teal-700 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
            >
              {createBooking.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              {createBooking.isPending ? "Réservation en cours…" : "Confirmer le rendez-vous"}
            </button>

            <p className="text-xs text-center text-gray-400">
              En confirmant, vous acceptez d&apos;être contacté par {clinic.name} pour votre rendez-vous.
            </p>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          Powered by{" "}
          <a href="https://clinomatic.vercel.app" target="_blank" rel="noreferrer" className="text-teal-600 font-medium">
            Clinomatic
          </a>
        </div>
      </div>
    </div>
  );
}
