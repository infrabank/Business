import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await getMeServer()
    const { config } = await req.json()

    if (!config?.endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint required' })
    }

    const provider = config.provider || 'webhook'

    if (provider === 'langfuse') {
      // Test Langfuse connection by calling their health/ingestion endpoint
      const host = config.endpoint.replace(/\/$/, '')
      const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64')

      const testEvent = {
        batch: [{
          id: `test_${Date.now()}`,
          type: 'generation-create',
          timestamp: new Date().toISOString(),
          body: {
            traceId: `test_${Date.now()}`,
            name: 'connection-test',
            model: 'test',
            input: { test: true },
            metadata: { source: 'llm-cost-manager', test: true },
          },
        }],
      }

      const res = await fetch(`${host}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(testEvent),
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok || res.status === 207) {
        return NextResponse.json({ success: true })
      }
      const text = await res.text().catch(() => '')
      return NextResponse.json({ success: false, error: `Langfuse responded with ${res.status}: ${text.slice(0, 200)}` })
    }

    // Webhook / Logflare test
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'llm-cost-manager',
        type: 'connection_test',
        timestamp: new Date().toISOString(),
        message: 'This is a test event from LLM Cost Manager.',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: `Webhook responded with ${res.status}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ success: false, error: message })
  }
}
