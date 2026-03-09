export const dynamic = 'force-dynamic'
// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bookings/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        slot: true,
        payment: {
          select: {
            pixQrCode: true,
            pixQrCodeBase64: true,
            mpPreferenceId: true,
            mpStatus: true,
            paymentMethod: true,
            paidAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("[GET /api/bookings/:id]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

