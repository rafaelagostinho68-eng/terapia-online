// src/app/api/admin/slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/slots
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const slots = await prisma.availableSlot.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      bookings: {
        where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
        select: { id: true, status: true, clientName: true },
      },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ slots });
}

// POST /api/admin/slots - Criar horários
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { dates, duration = 60 } = body;

  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "Datas inválidas." }, { status: 400 });
  }

  const created = await prisma.availableSlot.createMany({
    data: dates.map((d: string) => ({ date: new Date(d), duration, isActive: true })),
    skipDuplicates: true,
  });

  return NextResponse.json({ created: created.count });
}

// DELETE /api/admin/slots/[id]
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get("id");

  if (!slotId) return NextResponse.json({ error: "ID necessário." }, { status: 400 });

  await prisma.availableSlot.update({
    where: { id: slotId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
