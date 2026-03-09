"use client";
// src/app/page.tsx
import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  startOfDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle, Leaf } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Slot {
  id: string;
  date: string;
  duration: number;
}

type Step = "calendar" | "form";

export default function HomePage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>("calendar");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    note: "",
  });

  // Fetch slots do mês atual
  const fetchSlots = useCallback(async (month: Date) => {
    setLoadingSlots(true);
    try {
      const year = month.getFullYear();
      const m = month.getMonth() + 1;
      const res = await fetch(`/api/slots?year=${year}&month=${m}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      toast.error("Erro ao carregar horários.");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(currentMonth);
  }, [currentMonth, fetchSlots]);

  // Dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart); // 0=dom

  // Dias com slots disponíveis
  const availableDays = new Set(
    slots.map((s) => format(new Date(s.date), "yyyy-MM-dd"))
  );

  // Slots do dia selecionado
  const slotsForDay = selectedDate
    ? slots.filter((s) =>
        isSameDay(new Date(s.date), selectedDate)
      )
    : [];

  const handleDayClick = (day: Date) => {
    if (isPast(startOfDay(day)) && !isToday(day)) return;
    const key = format(day, "yyyy-MM-dd");
    if (!availableDays.has(key)) return;
    setSelectedDate(day);
    setSelectedSlot(null);
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return toast.error("Selecione um horário.");
    if (!form.name.trim()) return toast.error("Informe seu nome.");
    if (!form.email.trim()) return toast.error("Informe seu e-mail.");
    if (!form.phone.trim()) return toast.error("Informe seu telefone.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          clientName: form.name,
          clientEmail: form.email,
          clientPhone: form.phone,
          clientNote: form.note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar reserva.");

      router.push(`/pagamento/${data.bookingId}`);
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="bg-white border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-charcoal leading-none">
                Adriana Garibotti
              </p>
              <p className="text-xs text-charcoal-muted">Terapeuta</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-sage-600 bg-sage-50 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>1h · R$ 150</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-charcoal mb-3">
            Agende sua sessão
          </h1>
          <p className="text-charcoal-muted text-lg max-w-md mx-auto">
            Escolha o horário ideal para você. O processo é simples, seguro e rápido.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-delay">
          {[
            { key: "calendar", label: "Horário", icon: Calendar },
            { key: "form", label: "Seus dados", icon: CheckCircle },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isDone = step === "form" && s.key === "calendar";
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-cream-200" />}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isActive && "bg-sage-500 text-white",
                    isDone && "bg-sage-100 text-sage-600",
                    !isActive && !isDone && "text-charcoal-muted"
                  )}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {step === "calendar" && (
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
            {/* Calendário */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl font-semibold text-charcoal capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-charcoal-muted" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-charcoal-muted" />
                  </button>
                </div>
              </div>

              {/* Grid de dias da semana */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold text-charcoal-muted py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid do calendário */}
              <div className="grid grid-cols-7 gap-y-1">
                {/* Espaços vazios */}
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const isAvail = availableDays.has(key);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDay = isToday(day);
                  const isPastDay = isPast(startOfDay(day)) && !isTodayDay;
                  const notCurrent = !isSameMonth(day, currentMonth);

                  return (
                    <div key={key} className="flex justify-center">
                      <button
                        onClick={() => handleDayClick(day)}
                        disabled={isPastDay || !isAvail || notCurrent}
                        className={cn(
                          "calendar-day",
                          isSelected && "selected",
                          !isSelected && isAvail && !isPastDay && "available",
                          isTodayDay && !isSelected && "today",
                          (isPastDay || !isAvail || notCurrent) && "disabled"
                        )}
                      >
                        {format(day, "d")}
                        {isAvail && !isPastDay && !isSelected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-400" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {loadingSlots && (
                <div className="mt-3 text-center text-xs text-charcoal-muted animate-pulse">
                  Carregando horários...
                </div>
              )}
            </div>

            {/* Horários do dia */}
            <div className="card">
              <h2 className="font-serif text-xl font-semibold text-charcoal mb-2">
                {selectedDate
                  ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                  : "Selecione uma data"}
              </h2>
              <p className="text-sm text-charcoal-muted mb-5">
                {selectedDate
                  ? "Horários disponíveis para este dia:"
                  : "Clique em um dia com • para ver os horários."}
              </p>

              {selectedDate && slotsForDay.length === 0 && (
                <div className="text-center py-8 text-charcoal-muted text-sm">
                  Nenhum horário disponível neste dia.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {slotsForDay.map((slot) => {
                  const time = format(new Date(slot.date), "HH:mm");
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "time-slot",
                        isSelected ? "selected" : "available"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>

              {selectedSlot && (
                <div className="mt-6 animate-fade-in">
                  <div className="bg-sage-50 rounded-xl p-4 mb-4 border border-sage-100">
                    <p className="text-sm text-sage-700 font-medium">
                      ✓ Horário selecionado
                    </p>
                    <p className="text-sage-600 text-sm">
                      {format(new Date(selectedSlot.date), "EEEE, d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <button
                    className="btn-primary w-full"
                    onClick={() => setStep("form")}
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="max-w-lg mx-auto animate-fade-in">
            {/* Resumo */}
            <div className="card mb-5 bg-sage-50 border-sage-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-sage-600 font-medium uppercase tracking-wider mb-1">
                    Sessão selecionada
                  </p>
                  <p className="font-serif text-lg font-semibold text-charcoal">
                    {selectedSlot &&
                      format(
                        new Date(selectedSlot.date),
                        "EEEE, d 'de' MMMM 'às' HH:mm",
                        { locale: ptBR }
                      )}
                  </p>
                  <p className="text-sm text-charcoal-muted mt-1">1 hora · Online</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl font-semibold text-sage-600">
                    R$ 150
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div className="card">
              <h2 className="font-serif text-2xl font-semibold text-charcoal mb-6">
                Seus dados
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    Nome completo <span className="text-terracotta">*</span>
                  </label>
                  <input
                    className="input-field"
                    placeholder="Seu nome completo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    E-mail <span className="text-terracotta">*</span>
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    WhatsApp <span className="text-terracotta">*</span>
                  </label>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    Motivo / Observações{" "}
                    <span className="text-charcoal-muted font-normal">(opcional)</span>
                  </label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Compartilhe o que te traz até aqui, se quiser..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-5 text-xs text-amber-700 flex gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Após confirmar, você terá <strong>10 minutos</strong> para concluir
                  o pagamento. Caso o prazo expire, o horário será liberado.
                </span>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setStep("calendar");
                    setSelectedSlot(null);
                  }}
                >
                  Voltar
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Reservando..." : "Ir para pagamento →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-charcoal-muted mt-12 border-t border-cream-200">
        <p>© 2024 Adriana Garibotti · Pagamentos seguros via Mercado Pago</p>
      </footer>
    </div>
  );
}
