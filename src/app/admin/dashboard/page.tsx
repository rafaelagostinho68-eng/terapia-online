"use client";
// src/app/admin/dashboard/page.tsx
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Users, DollarSign, Clock, LogOut, Plus, Trash2,
  ChevronLeft, ChevronRight, BarChart3, CheckCircle, XCircle, Leaf,
  RefreshCw, Settings
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency, STATUS_LABELS } from "@/lib/utils";

interface BookingRow {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  slot: { date: string };
  payment?: { mpStatus: string; paymentMethod: string; paidAt: string; amount: number };
}

interface AdminSlot {
  id: string;
  date: string;
  duration: number;
  isActive: boolean;
  bookings: { id: string; status: string; clientName: string }[];
}

type Tab = "overview" | "agenda" | "sessoes";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addingSlots, setAddingSlots] = useState(false);

  // Horários padrão para adicionar
  const DEFAULT_HOURS = [9, 10, 11, 14, 15, 16, 17];
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin");
  }, [status, router]);

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  }, []);

  const fetchSlots = useCallback(async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const res = await fetch(`/api/admin/slots?year=${year}&month=${month}`);
    const data = await res.json();
    setSlots(data.slots || []);
  }, [currentMonth]);

  useEffect(() => {
    Promise.all([fetchBookings(), fetchSlots()]).finally(() => setLoading(false));
  }, [fetchBookings, fetchSlots]);

  useEffect(() => {
    fetchSlots();
  }, [currentMonth, fetchSlots]);

  // Estatísticas
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    pending: bookings.filter((b) => b.status === "PENDING_PAYMENT").length,
    revenue: bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => sum + (b.payment?.amount || 150), 0),
  };

  // Calendário do admin
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart);

  const slotsByDay = new Map<string, AdminSlot[]>();
  slots.forEach((s) => {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    if (!slotsByDay.has(key)) slotsByDay.set(key, []);
    slotsByDay.get(key)!.push(s);
  });

  const slotsForSelectedDay = selectedDay
    ? (slotsByDay.get(format(selectedDay, "yyyy-MM-dd")) || [])
    : [];

  const addSlotsForDay = async () => {
    if (!selectedDay || selectedHours.length === 0) {
      return toast.error("Selecione pelo menos um horário.");
    }
    setAddingSlots(true);
    try {
      const dates = selectedHours.map((h) => {
        const d = new Date(selectedDay);
        d.setHours(h, 0, 0, 0);
        return d.toISOString();
      });
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates }),
      });
      const data = await res.json();
      toast.success(`${data.created} horário(s) adicionado(s)!`);
      setSelectedHours([]);
      fetchSlots();
    } catch {
      toast.error("Erro ao adicionar horários.");
    } finally {
      setAddingSlots(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm("Remover este horário?")) return;
    const res = await fetch(`/api/admin/slots?id=${slotId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Horário removido.");
      fetchSlots();
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-20">
        {/* Logo */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sage-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{session?.user?.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Terapeuta</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {(
            [
              { key: "overview", icon: BarChart3, label: "Visão Geral" },
              { key: "agenda", icon: Calendar, label: "Minha Agenda" },
              { key: "sessoes", icon: Users, label: "Sessões" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                activeTab === item.key
                  ? "bg-sage-500/20 text-sage-400 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
            Ver site
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/admin" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-56 p-8">
        {/* ===== VISÃO GERAL ===== */}
        {activeTab === "overview" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-serif font-semibold mb-8">Visão Geral</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: "Total de Reservas", value: stats.total, color: "text-blue-400" },
                { icon: CheckCircle, label: "Confirmadas", value: stats.confirmed, color: "text-sage-400" },
                { icon: Clock, label: "Aguardando Pag.", value: stats.pending, color: "text-amber-400" },
                {
                  icon: DollarSign,
                  label: "Receita Total",
                  value: formatCurrency(stats.revenue),
                  color: "text-emerald-400",
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-400 font-medium">{stat.label}</p>
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Últimas reservas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-medium text-white">Últimas Reservas</h2>
                <button onClick={fetchBookings} className="text-zinc-500 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th>Cliente</th>
                      <th>Data da Sessão</th>
                      <th>Status</th>
                      <th>Pagamento</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 10).map((b) => {
                      const statusInfo = STATUS_LABELS[b.status] || { label: b.status, color: "" };
                      return (
                        <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td>
                            <div>
                              <p className="font-medium text-white">{b.clientName}</p>
                              <p className="text-xs text-zinc-500">{b.clientEmail}</p>
                            </div>
                          </td>
                          <td className="text-zinc-300">
                            {format(new Date(b.slot.date), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td>
                            <span
                              className={cn(
                                "badge text-xs",
                                b.status === "CONFIRMED" && "bg-sage-900/50 text-sage-400",
                                b.status === "PENDING_PAYMENT" && "bg-amber-900/50 text-amber-400",
                                b.status === "EXPIRED" && "bg-zinc-800 text-zinc-500",
                                b.status === "CANCELLED" && "bg-red-900/50 text-red-400"
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="text-zinc-400 text-xs capitalize">
                            {b.payment?.paymentMethod || "-"}
                          </td>
                          <td className="text-emerald-400 font-medium">
                            {b.status === "CONFIRMED" ? formatCurrency(b.payment?.amount || 150) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-zinc-500">
                          Nenhuma reserva encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== AGENDA ===== */}
        {activeTab === "agenda" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-serif font-semibold">Minha Agenda</h1>
              <p className="text-sm text-zinc-400">Gerencie seus horários disponíveis</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Calendário */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-medium capitalize text-white">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </h2>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {weekDays.map((d) => (
                    <div key={d} className="text-center text-xs text-zinc-500 font-medium py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {Array.from({ length: startWeekday }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const daySlots = slotsByDay.get(key) || [];
                    const hasSlots = daySlots.length > 0;
                    const hasConfirmed = daySlots.some((s) =>
                      s.bookings.some((b) => b.status === "CONFIRMED")
                    );
                    const isSelected = selectedDay && isSameDay(day, selectedDay);

                    return (
                      <div key={key} className="flex justify-center">
                        <button
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "w-10 h-10 rounded-full text-sm flex flex-col items-center justify-center relative transition-all",
                            isSelected
                              ? "bg-sage-500 text-white"
                              : "text-zinc-300 hover:bg-zinc-700"
                          )}
                        >
                          {format(day, "d")}
                          {hasSlots && !isSelected && (
                            <span
                              className={cn(
                                "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                hasConfirmed ? "bg-sage-400" : "bg-amber-400"
                              )}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalhes do dia */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                {selectedDay ? (
                  <>
                    <h2 className="font-medium text-white mb-1 capitalize">
                      {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h2>
                    <p className="text-xs text-zinc-400 mb-5">
                      {slotsForSelectedDay.length} horário(s) cadastrado(s)
                    </p>

                    {/* Horários existentes */}
                    <div className="space-y-2 mb-5">
                      {slotsForSelectedDay.map((slot) => {
                        const booking = slot.bookings[0];
                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium text-sm">
                                {format(new Date(slot.date), "HH:mm")}
                              </span>
                              {booking ? (
                                <span
                                  className={cn(
                                    "badge text-xs",
                                    booking.status === "CONFIRMED"
                                      ? "bg-sage-900/50 text-sage-400"
                                      : "bg-amber-900/50 text-amber-400"
                                  )}
                                >
                                  {booking.clientName} ·{" "}
                                  {booking.status === "CONFIRMED" ? "Confirmado" : "Pendente"}
                                </span>
                              ) : (
                                <span className="badge bg-zinc-700 text-zinc-400 text-xs">
                                  Disponível
                                </span>
                              )}
                            </div>
                            {!booking && (
                              <button
                                onClick={() => deleteSlot(slot.id)}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {slotsForSelectedDay.length === 0 && (
                        <p className="text-zinc-500 text-sm text-center py-4">
                          Nenhum horário neste dia.
                        </p>
                      )}
                    </div>

                    {/* Adicionar horários */}
                    <div className="border-t border-zinc-700 pt-4">
                      <p className="text-sm font-medium text-zinc-300 mb-3">Adicionar horários:</p>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {DEFAULT_HOURS.map((h) => {
                          const selected = selectedHours.includes(h);
                          const alreadyExists = slotsForSelectedDay.some(
                            (s) => new Date(s.date).getHours() === h
                          );
                          return (
                            <button
                              key={h}
                              disabled={alreadyExists}
                              onClick={() =>
                                setSelectedHours((prev) =>
                                  prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
                                )
                              }
                              className={cn(
                                "py-2 rounded-lg text-sm font-medium transition-all",
                                alreadyExists
                                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                  : selected
                                  ? "bg-sage-500 text-white"
                                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              )}
                            >
                              {String(h).padStart(2, "0")}:00
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={addSlotsForDay}
                        disabled={addingSlots || selectedHours.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-sage-500 hover:bg-sage-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        {addingSlots ? "Adicionando..." : `Adicionar ${selectedHours.length} horário(s)`}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-sm py-8">
                    Clique em um dia no calendário para gerenciar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== SESSÕES ===== */}
        {activeTab === "sessoes" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-serif font-semibold">Sessões</h1>
              <button
                onClick={fetchBookings}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th>Cliente</th>
                      <th>Contato</th>
                      <th>Data da Sessão</th>
                      <th>Status</th>
                      <th>Pagamento</th>
                      <th>Reservado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const statusInfo = STATUS_LABELS[b.status] || { label: b.status, color: "" };
                      return (
                        <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td>
                            <div>
                              <p className="font-medium text-white">{b.clientName}</p>
                              <p className="text-xs text-zinc-500">{b.clientEmail}</p>
                            </div>
                          </td>
                          <td className="text-zinc-400 text-sm">{b.clientPhone}</td>
                          <td className="text-zinc-300 text-sm">
                            {format(new Date(b.slot.date), "dd/MM/yyyy")}
                            <br />
                            <span className="text-xs text-zinc-500">
                              {format(new Date(b.slot.date), "HH:mm")}
                            </span>
                          </td>
                          <td>
                            <span
                              className={cn(
                                "badge text-xs",
                                b.status === "CONFIRMED" && "bg-sage-900/50 text-sage-400",
                                b.status === "PENDING_PAYMENT" && "bg-amber-900/50 text-amber-400",
                                b.status === "EXPIRED" && "bg-zinc-800 text-zinc-500",
                                b.status === "CANCELLED" && "bg-red-900/50 text-red-400"
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>
                            <div>
                              <p className="text-sm text-zinc-300 capitalize">
                                {b.payment?.paymentMethod || "-"}
                              </p>
                              {b.status === "CONFIRMED" && (
                                <p className="text-xs text-emerald-400">
                                  {formatCurrency(b.payment?.amount || 150)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="text-zinc-500 text-xs">
                            {format(new Date(b.createdAt), "dd/MM HH:mm")}
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-zinc-500">
                          Nenhuma sessão encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
