export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.paymentSettings.findFirst()
  if (!settings) {
    return NextResponse.json({
      mpEnabled: false, mpPublicKey: '', mpAccessToken: '', webhookUrl: '',
      stripeEnabled: false, stripePublicKey: '', stripeSecretKey: '',
      pixEnabled: false, pixKey: '', pixInstructions: ''
    })
  }

  // Mask secrets partially
  const masked = {
    ...settings,
    mpAccessToken: settings.mpAccessToken ? settings.mpAccessToken.slice(0, 12) + '...' : '',
    stripeSecretKey: settings.stripeSecretKey ? settings.stripeSecretKey.slice(0, 8) + '...' : '',
  }
  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const existing = await prisma.paymentSettings.findFirst()

  // Don't overwrite masked values
  const data: any = { ...body }
  if (existing) {
    if (data.mpAccessToken?.endsWith('...')) data.mpAccessToken = existing.mpAccessToken
    if (data.stripeSecretKey?.endsWith('...')) data.stripeSecretKey = existing.stripeSecretKey
  }

  if (existing) {
    await prisma.paymentSettings.update({ where: { id: existing.id }, data })
  } else {
    await prisma.paymentSettings.create({ data: { id: 'default', ...data } })
  }

  return NextResponse.json({ ok: true })
}
