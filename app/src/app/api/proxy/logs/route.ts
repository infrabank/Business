import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Organization, ProxyLog } from '@/types'

// GET /api/proxy/logs - list proxy logs with pagination
export async function GET(req: NextRequest) {
  try {
    await getMeServer()
    const orgs = await bkend.get<Organization[]>('/organizations')
    if (orgs.length === 0) {
      return NextResponse.json([])
    }

    const orgId = orgs[0].id
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

    const logs = await bkend.get<ProxyLog[]>('/proxy-logs', { params })
    return NextResponse.json(logs)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load proxy logs' },
      { status: err instanceof Error && err.message === 'Not authenticated' ? 401 : 500 },
    )
  }
}
