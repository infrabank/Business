import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { updateProxyKey, deleteProxyKey } from '@/services/proxy/proxy-key.service'
import type { ProxyKey } from '@/types/proxy'

// Verify the proxy key belongs to an org the user is a member of
async function verifyKeyOwnership(userId: string, keyId: string): Promise<boolean> {
  try {
    const key = await bkend.get<ProxyKey>(`/proxy-keys/${keyId}`)
    if (!key?.orgId) return false
    const members = await bkend.get<Array<{ id: string }>>('/members', {
      params: { orgId: key.orgId, userId },
    })
    return members.length > 0
  } catch {
    return false
  }
}

// PATCH /api/proxy-keys/[id] - update proxy key
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getMeServer()
    const { id } = await params

    if (!(await verifyKeyOwnership(user.id, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const updated = await updateProxyKey(id, body)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update proxy key' },
      { status: 500 },
    )
  }
}

// DELETE /api/proxy-keys/[id] - delete proxy key
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getMeServer()
    const { id } = await params

    if (!(await verifyKeyOwnership(user.id, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteProxyKey(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete proxy key' },
      { status: 500 },
    )
  }
}
