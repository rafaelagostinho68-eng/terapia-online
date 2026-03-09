// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BookingSchema = z.object({
  slotId: z.string().min(1),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  clientNote: z.string().optional(),
});

// POST /api/bookings - Criar reserva e bloquear vaga por 10 min
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { slotId, clientName, clientEmail, clientPhone, clientNote } = parsed.data;

    // Usar transação para garantir atomicidade
    const booking = await prisma.$transaction(async (tx) => {
      // Expirar reservas antigas
      await tx.booking.updateMany({
        where: {
          status: "PENDING_PAYMENT",
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      // Verificar se o slot existe e está ativo
      const slot = await tx.availableSlot.findUnique({
        where: { id: slotId, isActive: true },
        include: {
          bookings: {
            where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
          },
        },
      });

      if (!slot) {
        throw new Error("Horário não encontrado ou inativo.");
      }

      // Verificar conflito
      const activeBooking = slot.bookings.find(
        (b) =>
          b.status === "CONFIRMED" ||
          (b.status === "PENDING_PAYMENT" && new Date(b.expiresAt) > new Date())
      );

      if (activeBooking) {
        throw new Error(
          "Este horário acabou de ser reservado por outra pessoa. Escolha outro."
        );
      }

      // Calcular expiração (10 minutos)
      const timeoutMinutes = parseInt(process.env.RESERVATION_TIMEOUT_MINUTES || "10");
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

      // Criar reserva
      const newBooking = await tx.booking.create({
        data: {
          slotId,
          clientName,
          clientEmail,
          clientPhone,
          clientNote,
          status: "PENDING_PAYMENT",
          expiresAt,
        },
      });

      return newBooking;
    });

    return NextResponse.json({ bookingId: booking.id }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/bookings]", error);
    const userMessage = error.message?.includes("Erro")
      ? error.message
      : error.message || "Erro ao criar reserva.";
    return NextResponse.json({ error: userMessage }, { status: 400 });
  }
}
