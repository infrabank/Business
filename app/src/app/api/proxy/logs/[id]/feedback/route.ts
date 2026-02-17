import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkendService } from '@/lib/bkend'

/**
 * POST /api/proxy/logs/:id/feedback
 * Body: { feedback: 'positive' | 'negative' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const feedback = body.feedback

  if (feedback !== 'positive' && feedback !== 'negative') {
    return NextResponse.json(
      { error: 'feedback must be "positive" or "negative"' },
      { status: 400 },
    )
  }

  try {
    await bkendService.patch(`/proxy-logs/${id}`, { userFeedback: feedback })
    return NextResponse.json({ ok: true, id, feedback })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update feedback' },
      { status: 500 },
    )
  }
}
