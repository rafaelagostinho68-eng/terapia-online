export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { startHour, endHour, intervalMin, workDays, daysAhead } = await req.json()

  const start = startHour ?? 8
  const end = endHour ?? 18
  const interval = intervalMin ?? 60
  const days = workDays ?? '1,2,3,4,5'
  const ahead = daysAhead ?? 30

  const workDaysArr = days.split(',').map(Number)

  // Save schedule settings
  await prisma.scheduleSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', startHour: start, endHour: end, intervalMin: interval, workDays: days },
    update: { startHour: start, endHour: end, intervalMin: interval, workDays: days }
  })

  const slots: { startTime: Date; endTime: Date }[] = []
  const now = new Date()

  for (let d = 0; d < ahead; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    date.setHours(0, 0, 0, 0)

    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon...
    if (!workDaysArr.includes(dayOfWeek)) continue

    let hour = start
    while (hour < end) {
      const slotStart = new Date(date)
      slotStart.setHours(hour, 0, 0, 0)

      if (slotStart <= now) {
        hour += Math.floor(interval / 60)
        continue
      }

      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + interval)

      slots.push({ startTime: slotStart, endTime: slotEnd })
      hour += Math.floor(interval / 60)
    }
  }

  // Remove future unbooked slots and recreate
  await prisma.availableSlot.deleteMany({
    where: {
      startTime: { gt: now },
      isBooked: false
    }
  })

  await prisma.availableSlot.createMany({ data: slots, skipDuplicates: true })

  return NextResponse.json({ created: slots.length })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.scheduleSettings.findFirst()
  return NextResponse.json(settings ?? { startHour: 8, endHour: 18, intervalMin: 60, workDays: '1,2,3,4,5' })
}
