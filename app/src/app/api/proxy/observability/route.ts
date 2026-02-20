import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { encrypt, decrypt } from '@/services/encryption.service'

interface ObservabilityConfigRecord {
  id: string
  orgId: string
  provider: string
  enabled: boolean
  endpoint: string
  apiKey: string
  secretKey: string
  events: string[]
  createdAt: string
  updatedAt: string
}

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  }

  // Verify user has access to this organization
  try {
    const orgs = await bkend.get<Array<{ id: string }>>('/organizations', {
      params: { ownerId: authUser.id },
    })
    if (!orgs.some((o) => o.id === orgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const records = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    if (records.length === 0) {
      return NextResponse.json(null)
    }

    const record = records[0]
    // Decrypt keys for masking display
    let maskedApiKey = ''
    let maskedSecretKey = ''
    try {
      if (record.apiKey) {
        const plain = decrypt(record.apiKey)
        maskedApiKey = '••••' + plain.slice(-4)
      }
    } catch {
      // Legacy unencrypted value — mask directly
      maskedApiKey = record.apiKey ? '••••' + record.apiKey.slice(-4) : ''
    }
    try {
      if (record.secretKey) {
        const plain = decrypt(record.secretKey)
        maskedSecretKey = '••••' + plain.slice(-4)
      }
    } catch {
      maskedSecretKey = record.secretKey ? '••••' + record.secretKey.slice(-4) : ''
    }
    return NextResponse.json({
      provider: record.provider,
      enabled: record.enabled,
      endpoint: record.endpoint,
      apiKey: maskedApiKey,
      secretKey: maskedSecretKey,
      events: record.events || [],
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const body = await req.json()
    const { orgId, config } = body

    if (!orgId || !config) {
      return NextResponse.json({ error: 'orgId and config required' }, { status: 400 })
    }

    // Verify org membership
    const orgs = await bkend.get<Array<{ id: string }>>('/organizations', {
      params: { ownerId: authUser.id },
    })
    if (!orgs.some((o) => o.id === orgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // Check if exists
    const existing = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    let record: ObservabilityConfigRecord
    if (existing.length > 0) {
      // Update — only update apiKey/secretKey if not masked
      const updates: Record<string, unknown> = {
        provider: config.provider,
        enabled: config.enabled,
        endpoint: config.endpoint,
        events: config.events || [],
        updatedAt: now,
      }
      if (config.apiKey && !config.apiKey.startsWith('••••')) {
        updates.apiKey = encrypt(config.apiKey)
      }
      if (config.secretKey && !config.secretKey.startsWith('••••')) {
        updates.secretKey = encrypt(config.secretKey)
      }
      record = await bkend.patch<ObservabilityConfigRecord>(
        `/observability-configs/${existing[0].id}`,
        updates,
      )
    } else {
      // Create
      record = await bkend.post<ObservabilityConfigRecord>('/observability-configs', {
        orgId,
        provider: config.provider,
        enabled: config.enabled,
        endpoint: config.endpoint,
        apiKey: config.apiKey ? encrypt(config.apiKey) : '',
        secretKey: config.secretKey ? encrypt(config.secretKey) : '',
        events: config.events || [],
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>)
    }

    // Mask encrypted keys in response
    let respApiKey = ''
    let respSecretKey = ''
    try {
      if (record.apiKey) {
        const plain = decrypt(record.apiKey)
        respApiKey = '••••' + plain.slice(-4)
      }
    } catch {
      respApiKey = record.apiKey ? '••••' + record.apiKey.slice(-4) : ''
    }
    try {
      if (record.secretKey) {
        const plain = decrypt(record.secretKey)
        respSecretKey = '••••' + plain.slice(-4)
      }
    } catch {
      respSecretKey = record.secretKey ? '••••' + record.secretKey.slice(-4) : ''
    }

    return NextResponse.json({
      provider: record.provider,
      enabled: record.enabled,
      endpoint: record.endpoint,
      apiKey: respApiKey,
      secretKey: respSecretKey,
      events: record.events || [],
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getMeServer()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    // Verify org membership
    const orgs = await bkend.get<Array<{ id: string }>>('/organizations', {
      params: { ownerId: authUser.id },
    })
    if (!orgs.some((o) => o.id === orgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await bkend.get<ObservabilityConfigRecord[]>('/observability-configs', {
      params: { orgId },
    })

    if (existing.length > 0) {
      await bkend.delete(`/observability-configs/${existing[0].id}`)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
