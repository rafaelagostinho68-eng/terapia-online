export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clients = await prisma.client.findMany({
    include: {
      bookings: {
        orderBy: { createdAt: 'desc' },
        include: { slot: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, notes, date, time, value, observations } = body

  // Find or create client
  let client = await prisma.client.findFirst({ where: { email } })
  if (!client) {
    client = await prisma.client.create({ data: { name, email, phone: phone ?? '', notes: notes ?? '' } })
  }

  // If date+time provided, create a manual booking
  if (date && time) {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const startTime = new Date(year, month - 1, day, hour, minute, 0)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 1)

    const slot = await prisma.availableSlot.create({
      data: { startTime, endTime, isBooked: true }
    })

    await prisma.booking.create({
      data: {
        slotId: slot.id,
        clientId: client.id,
        clientName: name,
        clientEmail: email,
        clientPhone: phone ?? '',
        notes: observations ?? '',
        value: value ?? 150,
        status: 'MANUAL',
        isManual: true
      }
    })
  }

  return NextResponse.json({ ok: true, client })
}
