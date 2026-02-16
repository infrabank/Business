'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

const TABS = ['OpenAI', 'Anthropic', 'Google'] as const

const CODE_SNIPPETS: Record<string, string> = {
  OpenAI: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'lmc_your_proxy_key_here',
  baseURL: '${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/proxy/openai',
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})`,
  Anthropic: `import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: 'lmc_your_proxy_key_here',
  baseURL: '${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/proxy/anthropic',
})

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
})`,
  Google: `// Google Generative AI SDK
import { GoogleGenerativeAI } from '@google/generative-ai'

// Note: Set baseURL to proxy endpoint
const genAI = new GoogleGenerativeAI('lmc_your_proxy_key_here')
// Override fetch to route through proxy
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// Or use REST directly:
const response = await fetch(
  '${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/proxy/google/v1beta/models/gemini-2.0-flash:generateContent',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer lmc_your_proxy_key_here',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello!' }] }],
    }),
  }
)`,
}

export function SetupInstructions() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('OpenAI')

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Setup Instructions</h3>
        <p className="text-sm text-gray-500">
          Replace your API key and base URL with the proxy endpoint.
          All requests are automatically logged and tracked.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
          <code>{CODE_SNIPPETS[activeTab]}</code>
        </pre>
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Your API calls go through our proxy, which automatically
            logs every request with token counts, costs, and latency. The proxy forwards
            requests to the real provider using your encrypted API key.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
