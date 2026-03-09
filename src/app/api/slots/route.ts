export const dynamic = 'force-dynamic'
// src/app/api/slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

// GET /api/slots?year=2024&month=3
// Retorna slots disponíveis (sem booking CONFIRMED ou PENDING_PAYMENT ativo)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const monthDate = new Date(year, month - 1, 1);
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);

  try {
    // Primeiro, expirar reservas vencidas
    await prisma.booking.updateMany({
      where: {
        status: "PENDING_PAYMENT",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    // Buscar slots ativos com seus bookings
    const slots = await prisma.availableSlot.findMany({
      where: {
        isActive: true,
        date: { gte: start, lte: end },
      },
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
          },
          select: { id: true, status: true, expiresAt: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // Filtrar apenas slots disponíveis (sem booking ativo)
    const availableSlots = slots
      .filter((slot) => {
        const activeBooking = slot.bookings.find(
          (b) =>
            b.status === "CONFIRMED" ||
            (b.status === "PENDING_PAYMENT" && new Date(b.expiresAt) > new Date())
        );
        return !activeBooking;
      })
      .map((slot) => ({
        id: slot.id,
        date: slot.date.toISOString(),
        duration: slot.duration,
      }));

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error("[GET /api/slots]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/slots - Admin: criar slot(s)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dates, duration = 60 } = body; // dates: string[]

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    }

    const created = await prisma.availableSlot.createMany({
      data: dates.map((d: string) => ({
        date: new Date(d),
        duration,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/slots]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'
