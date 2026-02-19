import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { createProxyKey, listProxyKeys } from '@/services/proxy/proxy-key.service'

// Verify user has access to organization
async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId, userId },
    })
    return members.length > 0
  } catch {
    return false
  }
}

// GET /api/proxy-keys?orgId=xxx - list proxy keys for org
export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  if (!(await verifyOrgAccess(authUser.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      orgId, name, providerType, apiKey, providerApiKeys,
      budgetLimit, rateLimit, enableCache, cacheTtl, enableModelRouting,
      budgetAlertsEnabled, budgetAlertThresholds, routingMode, routingRules,
      enableFallback, enableGuardrails, guardrailSettings, observabilitySettings,
    } = body

    if (!orgId || !name || !providerType || !apiKey) {
      return NextResponse.json({ error: 'orgId, name, providerType, and apiKey are required' }, { status: 400 })
    }

    if (!(await verifyOrgAccess(authUser.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await createProxyKey({
      orgId,
      name,
      providerType,
      apiKey,
      providerApiKeys: providerApiKeys || undefined,
      budgetLimit: budgetLimit || undefined,
      rateLimit: rateLimit || undefined,
      enableCache: enableCache ?? undefined,
      cacheTtl: cacheTtl || undefined,
      enableModelRouting: enableModelRouting ?? undefined,
      budgetAlertsEnabled: budgetAlertsEnabled ?? undefined,
      budgetAlertThresholds: budgetAlertThresholds || undefined,
      routingMode: routingMode || undefined,
      routingRules: routingRules || undefined,
      enableFallback: enableFallback ?? undefined,
      enableGuardrails: enableGuardrails ?? undefined,
      guardrailSettings: guardrailSettings || undefined,
      observabilitySettings: observabilitySettings || undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create proxy key' },
      { status: 500 },
    )
  }
}
