export const dynamic = 'force-dynamic'
// src/app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPixPayment, createPreference } from "@/lib/mercadopago";

// POST /api/payments/create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, method } = body as { bookingId: string; method: "pix" | "card" };

    if (!bookingId || !method) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // Verificar reserva
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Esta reserva não está mais disponível para pagamento." },
        { status: 400 }
      );
    }

    if (new Date(booking.expiresAt) < new Date()) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Reserva expirada." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (method === "pix") {
      // Se já tem PIX gerado, retornar o existente
      if (booking.payment?.pixQrCode) {
        return NextResponse.json({
          qrCode: booking.payment.pixQrCode,
          qrCodeBase64: booking.payment.pixQrCodeBase64,
        });
      }

      const pixResult = await createPixPayment({
        bookingId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
      });

      const pixInfo = pixResult.point_of_interaction?.transaction_data;

      // Salvar no banco
      await prisma.payment.upsert({
        where: { bookingId },
        update: {
          mpPaymentId: String(pixResult.id),
          mpStatus: pixResult.status,
          pixQrCode: pixInfo?.qr_code,
          pixQrCodeBase64: pixInfo?.qr_code_base64,
          pixExpiresAt: pixInfo?.ticket_url ? new Date(Date.now() + 10 * 60 * 1000) : undefined,
          paymentMethod: "pix",
        },
        create: {
          bookingId,
          mpPaymentId: String(pixResult.id),
          mpStatus: pixResult.status,
          pixQrCode: pixInfo?.qr_code,
          pixQrCodeBase64: pixInfo?.qr_code_base64,
          paymentMethod: "pix",
          amount: 150,
        },
      });

      return NextResponse.json({
        qrCode: pixInfo?.qr_code,
        qrCodeBase64: pixInfo?.qr_code_base64,
      });
    }

    if (method === "card") {
      // Se já tem preferência, retornar a URL existente
      if (booking.payment?.mpPreferenceId) {
        const isSandbox = process.env.MP_ACCESS_TOKEN?.startsWith("TEST");
        const checkoutUrl = isSandbox
          ? `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${booking.payment.mpPreferenceId}`
          : `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${booking.payment.mpPreferenceId}`;
        return NextResponse.json({ checkoutUrl });
      }

      const preference = await createPreference({
        bookingId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        successUrl: `${appUrl}/confirmacao/${bookingId}`,
        failureUrl: `${appUrl}/pagamento/${bookingId}`,
        pendingUrl: `${appUrl}/pagamento/${bookingId}`,
      });

      // Salvar preferência
      await prisma.payment.upsert({
        where: { bookingId },
        update: {
          mpPreferenceId: preference.id,
          paymentMethod: "card",
        },
        create: {
          bookingId,
          mpPreferenceId: preference.id,
          paymentMethod: "card",
          amount: 150,
        },
      });

      const checkoutUrl = preference.sandbox_init_point || preference.init_point;
      return NextResponse.json({ checkoutUrl });
    }

    return NextResponse.json({ error: "Método inválido." }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/payments/create]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar pagamento." },
      { status: 500 }
    );
  }
}

