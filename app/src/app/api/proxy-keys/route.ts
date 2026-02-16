import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { createProxyKey, listProxyKeys } from '@/services/proxy/proxy-key.service'
import type { Organization } from '@/types'

// GET /api/proxy-keys - list proxy keys for user's org
export async function GET() {
  try {
    const user = await getMeServer()
    const orgs = await bkend.get<Organization[]>('/organizations')
    if (orgs.length === 0) {
      return NextResponse.json([])
    }

    const keys = await listProxyKeys(orgs[0].id)
    return NextResponse.json(keys)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list proxy keys' },
      { status: err instanceof Error && err.message === 'Not authenticated' ? 401 : 500 },
    )
  }
}

// POST /api/proxy-keys - create new proxy key
export async function POST(req: NextRequest) {
  try {
    await getMeServer()
    const orgs = await bkend.get<Organization[]>('/organizations')
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await req.json()
    const { name, providerType, apiKey, budgetLimit, rateLimit } = body

    if (!name || !providerType || !apiKey) {
      return NextResponse.json({ error: 'name, providerType, and apiKey are required' }, { status: 400 })
    }

    const result = await createProxyKey({
      orgId: orgs[0].id,
      name,
      providerType,
      apiKey,
      budgetLimit: budgetLimit || undefined,
      rateLimit: rateLimit || undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create proxy key' },
      { status: 500 },
    )
  }
}
