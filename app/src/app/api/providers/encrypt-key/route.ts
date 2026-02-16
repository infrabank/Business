import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { encrypt } from '@/services/encryption.service'
import { bkend } from '@/lib/bkend'

export async function POST(req: Request) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { providerId, apiKey, label } = await req.json()

  const encryptedKey = encrypt(apiKey)
  const keyPrefix = apiKey.substring(0, 8) + '...'

  const result = await bkend.post('/api-keys', {
    providerId,
    encryptedKey,
    keyPrefix,
    label,
    isActive: true,
  })

  return NextResponse.json(result)
}
