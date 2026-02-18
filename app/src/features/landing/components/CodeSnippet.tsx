'use client'

import { useT } from '@/lib/i18n'

const pythonCode = [
  { text: 'from openai import OpenAI', highlight: false },
  { text: '', highlight: false },
  { text: 'client = OpenAI(', highlight: false },
  { text: '    api_key="lmc_your_proxy_key",', highlight: true },
  { text: '    base_url="https://proxy.llmcost.app/v1"', highlight: true },
  { text: ')', highlight: false },
  { text: '', highlight: false },
  { text: '# 기존 코드 그대로 작동합니다', highlight: false },
  { text: 'response = client.chat.completions.create(', highlight: false },
  { text: '    model="gpt-4o",', highlight: false },
  { text: '    messages=[{"role": "user", "content": "Hello"}]', highlight: false },
  { text: ')', highlight: false },
]

const jsCode = [
  { text: "import OpenAI from 'openai';", highlight: false },
  { text: '', highlight: false },
  { text: 'const client = new OpenAI({', highlight: false },
  { text: "  apiKey: 'lmc_your_proxy_key',", highlight: true },
  { text: "  baseURL: 'https://proxy.llmcost.app/v1',", highlight: true },
  { text: '});', highlight: false },
  { text: '', highlight: false },
  { text: '// 기존 코드 그대로 작동합니다', highlight: false },
  { text: 'const response = await client.chat.completions.create({', highlight: false },
  { text: "  model: 'gpt-4o',", highlight: false },
  { text: "  messages: [{ role: 'user', content: 'Hello' }],", highlight: false },
  { text: '});', highlight: false },
]

const curlCode = [
  { text: 'curl https://proxy.llmcost.app/v1/chat/completions \\', highlight: false },
  { text: '  -H "Authorization: Bearer lmc_your_proxy_key" \\', highlight: true },
  { text: '  -H "Content-Type: application/json" \\', highlight: false },
  { text: "  -d '{", highlight: false },
  { text: '    "model": "gpt-4o",', highlight: false },
  { text: '    "messages": [{"role": "user", "content": "Hello"}]', highlight: false },
  { text: "  }'", highlight: false },
]

interface CodeLine {
  text: string
  highlight: boolean
}

interface CodeBlockProps {
  label: string
  lines: CodeLine[]
}

function CodeBlock({ label, lines }: CodeBlockProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/60">
      {/* Header bar */}
      <div className="flex items-center gap-2 bg-slate-800 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs font-medium text-slate-400">{label}</span>
      </div>

      {/* Code area */}
      <pre className="flex-1 overflow-x-auto bg-slate-900 p-4">
        <code className="font-mono text-xs leading-relaxed text-slate-300">
          {lines.map((line, i) => (
            <div
              key={i}
              className={
                line.highlight
                  ? 'rounded bg-indigo-500/10 px-1 -mx-1 text-indigo-300'
                  : ''
              }
            >
              {line.text || '\u00A0'}
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}

export function CodeSnippet() {
  const t = useT()

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('codeSnippet.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('codeSnippet.subtitle').split('base_url').map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>
                  {part}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">base_url</span>
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </div>

        {/* Code blocks */}
        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CodeBlock label="Python" lines={pythonCode} />
          <CodeBlock label="JavaScript" lines={jsCode} />
          <CodeBlock label="cURL" lines={curlCode} />
        </div>

        {/* SDK compatibility badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {[t('codeSnippet.badge1'), t('codeSnippet.badge2'), t('codeSnippet.badge3')].map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
