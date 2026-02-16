import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { createProxyKey, listProxyKeys } from '@/services/proxy/proxy-key.service'

// GET /api/proxy-keys?orgId=xxx - list proxy keys for org
export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const keys = await listProxyKeys(orgId)
    return NextResponse.json(keys)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list proxy keys' },
      { status: 500 },
    )
  }
}

// POST /api/proxy-keys - create new proxy key
export async function POST(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orgId, name, providerType, apiKey, budgetLimit, rateLimit, enableCache, cacheTtl, enableModelRouting } = body

    if (!orgId || !name || !providerType || !apiKey) {
      return NextResponse.json({ error: 'orgId, name, providerType, and apiKey are required' }, { status: 400 })
    }

    const result = await createProxyKey({
      orgId,
      name,
      providerType,
      apiKey,
      budgetLimit: budgetLimit || undefined,
      rateLimit: rateLimit || undefined,
      enableCache: enableCache ?? undefined,
      cacheTtl: cacheTtl || undefined,
      enableModelRouting: enableModelRouting ?? undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create proxy key' },
      { status: 500 },
    )
  }
}
