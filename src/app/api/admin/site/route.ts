export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const settings = await prisma.siteSettings.findFirst()
  return NextResponse.json(settings ?? {
    primaryColor: '#4a7c59',
    pageTitle: 'Agende sua sessão',
    pageSubtitle: 'Escolha o horário ideal para você. O processo é simples, seguro e rápido.',
    footerText: '© 2024 Adriana Garibotti · Pagamentos seguros via Mercado Pago',
    sessionPrice: 150,
    sessionMinutes: 60,
    contentEnabled: false,
    contentText: '',
    contentVideo: '',
    darkMode: false
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const existing = await prisma.siteSettings.findFirst()

  if (existing) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data: body })
  } else {
    await prisma.siteSettings.create({ data: { id: 'default', ...body } })
  }

  return NextResponse.json({ ok: true })
}
