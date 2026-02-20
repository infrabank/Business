import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend, bkendService } from '@/lib/bkend'
import type { ProxyLog } from '@/types'

// GET /api/proxy/logs?orgId=xxx - list proxy logs with pagination
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
    const searchParams = req.nextUrl.searchParams
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'
    const proxyKeyId = searchParams.get('proxyKeyId')
    const providerType = searchParams.get('providerType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const params: Record<string, string> = {
      orgId,
      _sort: '-createdAt',
      _limit: limit,
      _offset: offset,
    }

    if (proxyKeyId) params.proxyKeyId = proxyKeyId
    if (providerType) params.providerType = providerType
    if (startDate) params.createdAt_gte = startDate
    if (endDate) params.createdAt_lte = endDate

    const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', { params })
    return NextResponse.json(logs)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load proxy logs' },
      { status: err instanceof Error && err.message === 'Not authenticated' ? 401 : 500 },
    )
  }
}
