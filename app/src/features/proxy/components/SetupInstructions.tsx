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
        <h3 className="text-lg font-semibold">설치 안내</h3>
        <p className="text-sm text-gray-500">
          API 키와 base URL을 프록시 엔드포인트로 교체하세요.
          모든 요청이 자동으로 로깅되고 추적됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-900 text-gray-900 shadow-sm'
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
            <strong>작동 방식:</strong> API 호출이 프록시를 통과하며, 토큰 수, 비용, 지연시간을 자동으로
            로깅합니다. 프록시는 암호화된 API 키를 사용하여 실제 프로바이더로 요청을 전달합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
