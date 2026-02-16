import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { bkendService } from '@/lib/bkend'
import { createProxyKey } from '@/services/proxy/proxy-key.service'
import type { Organization } from '@/types'

// TEMPORARY - Remove after testing
export async function POST(req: NextRequest) {
  const { userId, apiKey, providerType } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  try {
    const supabase = getSupabaseServiceClient()
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const orgs = await bkendService.get<Organization[]>('/organizations', {
      params: { ownerId: userId },
    })
    const orgId = orgs.length > 0 ? orgs[0].id : (await bkendService.post<Organization>('/organizations', {
      name: `${user.user_metadata?.name || 'Test'}'s Workspace`,
      slug: user.email?.split('@')[0] || 'test',
      ownerId: userId,
    })).id

    const result = await createProxyKey({
      orgId,
      name: 'OpenAI Real Key',
      providerType: providerType || 'openai',
      apiKey: apiKey || 'dummy',
      enableCache: true,
      enableModelRouting: true,
    })
    return NextResponse.json({ success: true, orgId, proxyKey: result.proxyKey, display: result.display })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Setup failed' }, { status: 500 })
  }
}
