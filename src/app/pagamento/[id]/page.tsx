"use client";
// src/app/pagamento/[id]/page.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  CreditCard,
  Smartphone,
  Copy,
  CheckCircle,
  AlertCircle,
  Leaf,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency } from "@/lib/utils";

interface BookingData {
  id: string;
  clientName: string;
  clientEmail: string;
  status: string;
  expiresAt: string;
  slot: { date: string; duration: number };
  payment?: {
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    mpPreferenceId?: string;
  };
}

type PaymentMethod = "pix" | "card";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();

  // Buscar dados da reserva
  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.booking.status === "CONFIRMED") {
        router.push(`/confirmacao/${id}`);
        return;
      }
      if (data.booking.status === "EXPIRED" || data.booking.status === "CANCELLED") {
        setExpired(true);
      }

      setBooking(data.booking);

      // Restaurar PIX se já gerado
      if (data.booking.payment?.pixQrCode) {
        setPixData({
          qrCode: data.booking.payment.pixQrCode,
          qrCodeBase64: data.booking.payment.pixQrCodeBase64 || "",
        });
      }
      if (data.booking.payment?.mpPreferenceId) {
        setMpPreferenceId(data.booking.payment.mpPreferenceId);
      }
    } catch {
      toast.error("Reserva não encontrada.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Cronômetro regressivo
  useEffect(() => {
    if (!booking || expired) return;
    const expiresAt = new Date(booking.expiresAt).getTime();

    const tick = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      setTimeLeft(Math.floor(diff / 1000));
      if (diff <= 0) {
        setExpired(true);
        clearInterval(timerRef.current);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [booking, expired]);

  // Polling de status a cada 5s
  useEffect(() => {
    if (expired) return;
    pollRef.current = setInterval(fetchBooking, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchBooking, expired]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Gerar pagamento PIX
  const generatePix = async () => {
    setCreatingPayment(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, method: "pix" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPixData({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64 });
      toast.success("PIX gerado! Escaneie o QR Code.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setCreatingPayment(false);
    }
  };

  // Abrir checkout MP (cartão)
  const openCardCheckout = async () => {
    setCreatingPayment(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, method: "card" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir checkout.");
      setCreatingPayment(false);
    }
  };

  const copyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopiedPix(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Formatar cronômetro
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progress = booking
    ? (timeLeft / ((new Date(booking.expiresAt).getTime() - new Date(booking.slot.date).getTime()) / 1000)) * 100
    : 100;

  // SVG countdown ring
  const RADIUS = 38;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const totalSeconds = 10 * 60;
  const strokeDashoffset = CIRCUMFERENCE * (1 - timeLeft / totalSeconds);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-sage-200 border-t-sage-500 animate-spin mx-auto mb-4" />
          <p className="text-charcoal-muted text-sm">Carregando sua reserva...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center card">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">
            Reserva expirada
          </h1>
          <p className="text-charcoal-muted mb-6">
            O prazo de 10 minutos para pagamento foi excedido e o horário foi liberado.
          </p>
          <button className="btn-primary w-full" onClick={() => router.push("/")}>
            Escolher novo horário
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="bg-white border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-lg font-semibold">Adriana Garibotti</span>
          </div>
          <div className="text-sm text-charcoal-muted">Pagamento seguro</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Coluna principal */}
          <div className="md:col-span-3 space-y-5">
            <div className="animate-fade-in">
              <h1 className="font-serif text-3xl font-semibold text-charcoal mb-1">
                Conclua o pagamento
              </h1>
              <p className="text-charcoal-muted">
                Olá, {booking.clientName.split(" ")[0]}! Finalize para confirmar sua sessão.
              </p>
            </div>

            {/* Método de pagamento */}
            <div className="card animate-fade-in-delay">
              <h2 className="font-medium text-charcoal mb-4">Forma de pagamento</h2>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {(
                  [
                    { key: "pix", icon: Smartphone, label: "PIX", sub: "Instantâneo" },
                    { key: "card", icon: CreditCard, label: "Cartão", sub: "Crédito / Débito" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                      paymentMethod === m.key
                        ? "border-sage-500 bg-sage-50"
                        : "border-cream-200 hover:border-sage-200"
                    )}
                  >
                    <m.icon
                      className={cn(
                        "w-6 h-6",
                        paymentMethod === m.key ? "text-sage-600" : "text-charcoal-muted"
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-medium text-sm",
                          paymentMethod === m.key ? "text-sage-700" : "text-charcoal"
                        )}
                      >
                        {m.label}
                      </p>
                      <p className="text-xs text-charcoal-muted">{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* PIX */}
              {paymentMethod === "pix" && (
                <div>
                  {!pixData ? (
                    <button
                      className="btn-primary w-full"
                      onClick={generatePix}
                      disabled={creatingPayment}
                    >
                      {creatingPayment ? "Gerando PIX..." : "Gerar QR Code PIX"}
                    </button>
                  ) : (
                    <div className="pix-container animate-fade-in">
                      {pixData.qrCodeBase64 && (
                        <img
                          src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                          alt="QR Code PIX"
                          className="w-48 h-48 rounded-xl"
                        />
                      )}
                      <div className="w-full">
                        <p className="text-xs text-sage-600 font-medium mb-2 text-center">
                          Código PIX Copia e Cola:
                        </p>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={pixData.qrCode}
                            className="input-field text-xs flex-1 bg-white"
                          />
                          <button
                            onClick={copyPix}
                            className={cn(
                              "p-3 rounded-xl border-2 transition-all flex-shrink-0",
                              copiedPix
                                ? "border-sage-500 bg-sage-500 text-white"
                                : "border-sage-200 text-sage-600 hover:bg-sage-50"
                            )}
                          >
                            {copiedPix ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-charcoal-muted text-center">
                        Abra o app do seu banco, vá em PIX e escaneie o QR Code acima.
                        A confirmação é automática.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cartão */}
              {paymentMethod === "card" && (
                <button
                  className="btn-primary w-full"
                  onClick={openCardCheckout}
                  disabled={creatingPayment}
                >
                  {creatingPayment ? "Redirecionando..." : "Pagar com Cartão →"}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar - resumo + cronômetro */}
          <div className="md:col-span-2 space-y-4">
            {/* Cronômetro */}
            <div className="card text-center animate-fade-in">
              <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider mb-3">
                Tempo restante
              </p>
              <div className="relative inline-flex items-center justify-center mb-3">
                <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                  <circle
                    cx="50" cy="50" r={RADIUS}
                    fill="none"
                    stroke="#E8E0D8"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50" cy="50" r={RADIUS}
                    fill="none"
                    stroke={timeLeft < 120 ? "#DC2626" : "#4A6741"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span
                    className={cn(
                      "text-2xl font-bold font-sans tabular-nums",
                      timeLeft < 120 ? "text-red-600" : "text-charcoal"
                    )}
                  >
                    {timerDisplay}
                  </span>
                </div>
              </div>
              <p className="text-xs text-charcoal-muted">
                {timeLeft < 120
                  ? "⚠️ Menos de 2 minutos!"
                  : "Seu horário está reservado"}
              </p>
            </div>

            {/* Resumo da sessão */}
            <div className="card animate-fade-in-delay">
              <h3 className="font-medium text-charcoal mb-4">Resumo</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Sessão</span>
                  <span className="text-charcoal font-medium">Terapia Individual</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Data</span>
                  <span className="text-charcoal font-medium text-right">
                    {format(new Date(booking.slot.date), "d/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Horário</span>
                  <span className="text-charcoal font-medium">
                    {format(new Date(booking.slot.date), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Duração</span>
                  <span className="text-charcoal font-medium">60 minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Modalidade</span>
                  <span className="text-charcoal font-medium">Online</span>
                </div>
                <div className="border-t border-cream-200 pt-3 flex justify-between">
                  <span className="font-semibold text-charcoal">Total</span>
                  <span className="font-bold text-sage-600 text-lg">R$ 150,00</span>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="text-center text-xs text-charcoal-muted space-y-1">
              <p>🔒 Pagamento protegido por Mercado Pago</p>
              <p>Seus dados estão seguros e criptografados</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
