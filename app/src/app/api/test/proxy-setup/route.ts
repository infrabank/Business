import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { bkendService } from '@/lib/bkend'
import { createProxyKey } from '@/services/proxy/proxy-key.service'
import type { Organization } from '@/types'

// TEMPORARY TEST ENDPOINT - Remove after testing
// POST /api/test/proxy-setup
// Creates org + proxy key for a test user, returns the raw key
export async function POST(req: NextRequest) {
  // Safety: only allow in non-production or with secret
  const { userId, apiKey, providerType } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    // 1. Verify user exists in Supabase Auth
    const supabase = getSupabaseServiceClient()
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Find or create organization
    let orgs = await bkendService.get<Organization[]>('/organizations', {
      params: { ownerId: userId },
    })

    let orgId: string
    if (orgs.length > 0) {
      orgId = orgs[0].id
    } else {
      const newOrg = await bkendService.post<Organization>('/organizations', {
        name: `${user.user_metadata?.name || 'Test'}'s Workspace`,
        slug: user.email?.split('@')[0] || 'test',
        ownerId: userId,
      })
      orgId = newOrg.id
    }

    // 3. Create proxy key
    const result = await createProxyKey({
      orgId,
      name: 'Test Proxy Key',
      providerType: providerType || 'openai',
      apiKey: apiKey || 'sk-test-dummy-key-for-infrastructure-testing',
      enableCache: true,
      enableModelRouting: true,
    })

    return NextResponse.json({
      success: true,
      orgId,
      proxyKey: result.proxyKey,
      display: result.display,
      testCurl: `curl -X POST https://llm-cost-manager.vercel.app/api/proxy/openai/v1/chat/completions -H "Authorization: Bearer ${result.proxyKey}" -H "Content-Type: application/json" -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed', stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    )
  }
}
