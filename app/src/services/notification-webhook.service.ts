import type { WebhookConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'
import { decrypt } from './encryption.service'
import { createHmac } from 'crypto'

const TIMEOUT_MS = 5000

export async function sendWebhook(
  config: WebhookConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  try {
    const jsonBody = JSON.stringify({
      event: 'alert.created',
      alert: payload.alert,
      org: payload.orgName,
      timestamp: new Date().toISOString(),
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add custom headers (decrypt values)
    if (config.headers) {
      for (const [key, val] of Object.entries(config.headers)) {
        try {
          headers[key] = decrypt(val)
        } catch {
          headers[key] = val
        }
      }
    }

    // HMAC-SHA256 signature
    if (config.secret) {
      const secret = decrypt(config.secret)
      headers['X-LLMCost-Signature'] = signPayload(jsonBody, secret)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body: jsonBody,
        signal: controller.signal,
      })

      if (res.ok) {
        return { success: true }
      }

      const text = await res.text()
      return { success: false, error: `Webhook ${res.status}: ${text.slice(0, 200)}` }
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, error: `Webhook timeout (${TIMEOUT_MS}ms)` }
    }
    return { success: false, error: String(err) }
  }
}

function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
