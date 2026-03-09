"use client";
// src/app/confirmacao/[id]/page.tsx
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Calendar, Clock, Video, Mail, Leaf } from "lucide-react";

interface BookingData {
  id: string;
  clientName: string;
  clientEmail: string;
  status: string;
  slot: { date: string; duration: number };
}

export default function ConfirmacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booking?.status !== "CONFIRMED") {
          router.push(`/pagamento/${id}`);
          return;
        }
        setBooking(data.booking);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !booking) return null;

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <header className="bg-white border-b border-cream-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif text-lg font-semibold">Adriana Garibotti</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Ícone de sucesso */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-sage-500" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-charcoal mb-2">
              Sessão confirmada!
            </h1>
            <p className="text-charcoal-muted">
              Parabéns, {booking.clientName.split(" ")[0]}! Seu pagamento foi recebido.
            </p>
          </div>

          {/* Detalhes */}
          <div className="card mb-5 animate-fade-in-delay">
            <h2 className="font-medium text-charcoal mb-4">Detalhes da sessão</h2>
            <div className="space-y-3">
              {[
                {
                  icon: Calendar,
                  label: "Data",
                  value: format(new Date(booking.slot.date), "EEEE, d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  }),
                },
                {
                  icon: Clock,
                  label: "Horário",
                  value: format(new Date(booking.slot.date), "HH:mm", { locale: ptBR }) + " (1 hora)",
                },
                { icon: Video, label: "Modalidade", value: "Online (link enviado por e-mail)" },
                { icon: Mail, label: "Confirmação", value: `Enviada para ${booking.clientEmail}` },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-sage-600" />
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-muted">{item.label}</p>
                    <p className="text-sm font-medium text-charcoal capitalize">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos passos */}
          <div className="bg-sage-50 border border-sage-100 rounded-2xl p-5 mb-6 animate-fade-in-delay-2">
            <h3 className="font-medium text-sage-700 mb-3">O que acontece agora?</h3>
            <ol className="space-y-2 text-sm text-sage-700">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Você receberá um e-mail de confirmação com todos os detalhes.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>O link da sessão online será enviado 30 minutos antes do horário.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Se precisar remarcar, entre em contato pelo WhatsApp.</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 animate-fade-in-delay-2">
            <button
              className="btn-primary w-full"
              onClick={() => router.push("/")}
            >
              Agendar outra sessão
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
