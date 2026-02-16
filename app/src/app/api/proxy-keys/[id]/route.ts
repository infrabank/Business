import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { updateProxyKey, deleteProxyKey } from '@/services/proxy/proxy-key.service'

// PATCH /api/proxy-keys/[id] - update proxy key
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getMeServer()
    const { id } = await params
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
    await getMeServer()
    const { id } = await params
    await deleteProxyKey(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete proxy key' },
      { status: 500 },
    )
  }
}
