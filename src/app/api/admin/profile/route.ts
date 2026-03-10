export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.therapistProfile.findFirst()
  return NextResponse.json(profile ?? {
    name: 'Adriana Garibotti',
    description: 'Terapeuta',
    email: '',
    phone: '',
    photoUrl: ''
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const existing = await prisma.therapistProfile.findFirst()

  if (existing) {
    await prisma.therapistProfile.update({ where: { id: existing.id }, data: body })
  } else {
    await prisma.therapistProfile.create({ data: { id: 'default', ...body } })
  }

  return NextResponse.json({ ok: true })
}
