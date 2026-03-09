// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/mercadopago";
import crypto from "crypto";

// Verificar assinatura do webhook MP
function verifyWebhookSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Em dev, pular verificação

  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";
  const dataId = new URL(req.url).searchParams.get("data.id") || "";

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(",ts=")[1] || ""}`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const expected = xSignature.split(",v1=")[1]?.split(",")[0];

  return hash === expected;
}

// POST /api/payments/webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const data = JSON.parse(body);

    // Verificar assinatura (comentar em dev)
    // if (!verifyWebhookSignature(req, body)) {
    //   return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    // }

    console.log("[Webhook MP]", JSON.stringify(data));

    // MP envia notificação de pagamento
    if (data.type === "payment" && data.data?.id) {
      const paymentId = String(data.data.id);

      // Buscar detalhes do pagamento no MP
      const mpPayment = await getPaymentStatus(paymentId);

      if (!mpPayment || !mpPayment.external_reference) {
        return NextResponse.json({ ok: true });
      }

      const bookingId = mpPayment.external_reference;
      const status = mpPayment.status; // approved, rejected, pending, cancelled

      // Atualizar payment no banco
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { bookingId },
            { mpPaymentId: paymentId },
          ],
        },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            mpPaymentId: paymentId,
            mpStatus: status,
            mpStatusDetail: mpPayment.status_detail,
            paidAt: status === "approved" ? new Date() : undefined,
          },
        });
      }

      // Atualizar status da reserva
      if (status === "approved") {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking && booking.status !== "CONFIRMED") {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" },
          });
          console.log(`[Webhook] Reserva ${bookingId} CONFIRMADA via pagamento ${paymentId}`);

          // TODO: Enviar e-mail de confirmação aqui
          // await sendConfirmationEmail(booking);
        }
      } else if (["rejected", "cancelled"].includes(status || "")) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Webhook MP Error]", error);
    // Sempre retornar 200 para MP não retentar
    return NextResponse.json({ ok: true });
  }
}

// MP faz GET para verificar disponibilidade
export async function GET() {
  return NextResponse.json({ ok: true });
}
