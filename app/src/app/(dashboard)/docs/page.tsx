'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSession } from '@/hooks/useSession'
import {
  Book, Key, Zap, Shield, BarChart3, RefreshCw,
  Globe, Code, Terminal, ArrowRight, Copy, Check,
  ChevronDown, ChevronRight,
} from 'lucide-react'

type DocSection = 'quickstart' | 'auth' | 'endpoints' | 'sdks' | 'features' | 'headers' | 'errors'

const SECTIONS: { id: DocSection; label: string; icon: typeof Book }[] = [
  { id: 'quickstart', label: '빠른 시작', icon: Zap },
  { id: 'auth', label: '인증', icon: Key },
  { id: 'endpoints', label: '엔드포인트', icon: Globe },
  { id: 'sdks', label: 'SDK 예제', icon: Code },
  { id: 'features', label: '기능 가이드', icon: BarChart3 },
  { id: 'headers', label: '응답 헤더', icon: RefreshCw },
  { id: 'errors', label: '오류 코드', icon: Shield },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition"
    >
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative">
      <CopyButton text={code} />
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
        <code>{code}</code>
      </pre>
      {lang && (
        <span className="absolute bottom-2 right-2 text-xs text-gray-500">{lang}</span>
      )}
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'

export default function DocsPage() {
  const { isReady } = useSession()
  const [activeSection, setActiveSection] = useState<DocSection>('quickstart')

  if (!isReady) {
    return <div className="py-12 text-center text-gray-400 dark:text-slate-500">로딩 중...</div>
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <nav className="hidden w-56 flex-shrink-0 lg:block">
        <div className="sticky top-6 space-y-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            API 문서
          </h2>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                activeSection === id
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-w-0 flex-1 space-y-8">
        {/* Mobile Section Selector */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 dark:bg-slate-800 p-1 lg:hidden">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeSection === id
                  ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">API 문서</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            LLM Cost Manager 프록시 API를 사용하여 LLM 비용을 추적하고 최적화하세요.
          </p>
        </div>

        {/* Quick Start */}
        {activeSection === 'quickstart' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">3단계로 시작하기</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold">1</div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">프록시 키 생성</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                      프록시 페이지에서 새 프록시 키를 생성합니다. 프로바이더 API 키를 등록하면 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">lmc_</code> 접두사의 프록시 키가 발급됩니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold">2</div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">Base URL 변경</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                      기존 LLM SDK의 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">baseURL</code>을 프록시 엔드포인트로 변경하고,
                      API 키를 프록시 키로 교체합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold">3</div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">비용 추적 시작</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                      모든 요청이 프록시를 통과하며 자동으로 토큰, 비용, 지연시간이 로깅됩니다. 캐싱과 모델 라우팅으로 비용이 절감됩니다.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>코드 변경 2줄:</strong> baseURL + apiKey만 변경하면 됩니다. 나머지 코드는 그대로 유지됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Auth */}
        {activeSection === 'auth' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">인증</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  프록시 API는 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">Authorization</code> 헤더의 Bearer 토큰으로 인증합니다.
                  프록시 키는 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">lmc_</code> 접두사로 시작합니다.
                </p>

                <CodeBlock code={`# HTTP 헤더
Authorization: Bearer lmc_your_proxy_key_here

# 또는 OpenAI 호환 형식
api-key: lmc_your_proxy_key_here`} lang="http" />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">키 보안</h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                    <li>- 프록시 키는 SHA-256 해시로 저장되며, 평문으로 보관되지 않습니다</li>
                    <li>- 프로바이더 API 키는 AES-256-GCM으로 암호화되어 저장됩니다</li>
                    <li>- 키 생성 시 한 번만 표시되므로 안전하게 보관하세요</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">멀티 프로바이더 키</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    프록시 키 생성 시 프로바이더 타입을 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">auto</code>로 설정하면
                    하나의 키로 OpenAI, Anthropic, Google 모든 프로바이더를 사용할 수 있습니다.
                    통합 엔드포인트 <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">/api/proxy/v2/</code>를 사용하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Endpoints */}
        {activeSection === 'endpoints' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">API 엔드포인트</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  프로바이더별 전용 엔드포인트 또는 통합(v2) 엔드포인트를 사용할 수 있습니다.
                </p>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">프로바이더별 엔드포인트</h3>
                  <div className="space-y-2">
                    {[
                      { provider: 'OpenAI', path: '/api/proxy/openai/*', color: 'text-green-600 dark:text-green-400' },
                      { provider: 'Anthropic', path: '/api/proxy/anthropic/*', color: 'text-orange-600 dark:text-orange-400' },
                      { provider: 'Google', path: '/api/proxy/google/*', color: 'text-blue-600 dark:text-blue-400' },
                    ].map(({ provider, path, color }) => (
                      <div key={provider} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2.5">
                        <Badge variant="default">{provider}</Badge>
                        <code className={`text-sm font-mono ${color}`}>{BASE_URL}{path}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">통합 엔드포인트 (v2)</h3>
                    <Badge variant="info">추천</Badge>
                  </div>
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-2.5">
                    <code className="text-sm font-mono text-blue-700 dark:text-blue-300">{BASE_URL}/api/proxy/v2/*</code>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    요청 형식(모델명, body 구조, 경로)을 자동으로 분석하여 적합한 프로바이더로 라우팅합니다.
                    <code className="rounded bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">auto</code> 타입 키에서만 사용 가능합니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">분석 엔드포인트</h3>
                  <div className="space-y-2">
                    {[
                      { method: 'GET', path: '/api/proxy/analytics/timeseries', desc: '시계열 비용/요청 데이터' },
                      { method: 'GET', path: '/api/proxy/analytics/breakdown', desc: '모델/프로바이더/키별 분석' },
                      { method: 'GET', path: '/api/proxy/logs', desc: '요청 로그 조회' },
                      { method: 'GET', path: '/api/proxy/savings', desc: '비용 절감 요약' },
                      { method: 'POST', path: '/api/proxy/logs/{id}/feedback', desc: '라우팅 피드백 전송' },
                    ].map(({ method, path, desc }) => (
                      <div key={path} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2.5">
                        <Badge variant={method === 'POST' ? 'warning' : 'success'}>{method}</Badge>
                        <div>
                          <code className="text-sm font-mono text-gray-900 dark:text-slate-100">{path}</code>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SDK Examples */}
        {activeSection === 'sdks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">SDK 통합 예제</h2>

            <Collapsible title="OpenAI (Node.js)" defaultOpen>
              <CodeBlock lang="typescript" code={`import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'lmc_your_proxy_key_here',
  baseURL: '${BASE_URL}/api/proxy/openai',
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})`} />
            </Collapsible>

            <Collapsible title="OpenAI (Python)">
              <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="lmc_your_proxy_key_here",
    base_url="${BASE_URL}/api/proxy/openai",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)`} />
            </Collapsible>

            <Collapsible title="Anthropic (Node.js)">
              <CodeBlock lang="typescript" code={`import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: 'lmc_your_proxy_key_here',
  baseURL: '${BASE_URL}/api/proxy/anthropic',
})

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
})`} />
            </Collapsible>

            <Collapsible title="Anthropic (Python)">
              <CodeBlock lang="python" code={`from anthropic import Anthropic

client = Anthropic(
    api_key="lmc_your_proxy_key_here",
    base_url="${BASE_URL}/api/proxy/anthropic",
)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}],
)`} />
            </Collapsible>

            <Collapsible title="Google AI (REST)">
              <CodeBlock lang="bash" code={`curl -X POST \\
  '${BASE_URL}/api/proxy/google/v1beta/models/gemini-2.0-flash:generateContent' \\
  -H 'Authorization: Bearer lmc_your_proxy_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }'`} />
            </Collapsible>

            <Collapsible title="통합 엔드포인트 (v2) - curl">
              <CodeBlock lang="bash" code={`# OpenAI 형식 → 자동 감지
curl -X POST '${BASE_URL}/api/proxy/v2/v1/chat/completions' \\
  -H 'Authorization: Bearer lmc_your_proxy_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Anthropic 형식 → 자동 감지
curl -X POST '${BASE_URL}/api/proxy/v2/v1/messages' \\
  -H 'Authorization: Bearer lmc_your_proxy_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`} />
            </Collapsible>

            <Collapsible title="스트리밍">
              <CodeBlock lang="typescript" code={`// OpenAI 스트리밍 — 동일한 SDK 패턴
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}

// Note: 스트리밍 응답은 캐싱되지 않습니다.
// 토큰 카운트는 SSE 스트림에서 자동 추출됩니다.`} />
            </Collapsible>
          </div>
        )}

        {/* Features */}
        {activeSection === 'features' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">기능 가이드</h2>

            <Collapsible title="스마트 캐싱" defaultOpen>
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>동일하거나 유사한 요청을 캐시하여 비용과 지연시간을 절감합니다.</p>
                <ul className="space-y-1">
                  <li><strong>3단계 캐시:</strong> 정확 매치 → 정규화 매치 → 시맨틱 매치 (Jaccard 0.85)</li>
                  <li><strong>캐시 TTL:</strong> 프록시 키별 설정 가능 (기본 1시간)</li>
                  <li><strong>스트리밍:</strong> 스트리밍 응답은 캐시되지 않습니다</li>
                </ul>
                <p className="mt-2">캐시 히트 시 응답 헤더:</p>
                <CodeBlock code={`x-cache-level: exact | normalized | semantic
x-cache-similarity: 0.92  # 시맨틱 매치의 유사도`} />
              </div>
            </Collapsible>

            <Collapsible title="모델 라우팅">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>요청 의도에 따라 더 저렴한 모델로 자동 라우팅하여 비용을 절감합니다.</p>
                <ul className="space-y-1">
                  <li><strong>Auto 모드:</strong> 요청 의도를 분석하여 최적 모델로 자동 다운그레이드</li>
                  <li><strong>Manual 모드:</strong> 규칙 기반 (from → to) 매핑</li>
                  <li><strong>피드백:</strong> 라우팅 결과에 대한 피드백으로 품질 개선</li>
                </ul>
              </div>
            </Collapsible>

            <Collapsible title="Fallback (장애 대응)">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>프로바이더 장애 시 동등한 다른 프로바이더로 자동 전환합니다.</p>
                <ul className="space-y-1">
                  <li><strong>Fallback 체인:</strong> OpenAI → Anthropic → Google</li>
                  <li><strong>12개 모델 등가 매핑:</strong> gpt-4o ↔ claude-sonnet ↔ gemini-pro 등</li>
                  <li><strong>크로스 프로바이더:</strong> 요청 본문을 대상 프로바이더 형식으로 자동 변환</li>
                </ul>
                <p className="mt-2">Fallback 발생 시 응답 헤더:</p>
                <CodeBlock code={`x-fallback-provider: anthropic
x-fallback-model: claude-sonnet-4-5-20250929`} />
              </div>
            </Collapsible>

            <Collapsible title="예산 관리">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>다층 예산 시스템으로 비용을 통제합니다.</p>
                <ul className="space-y-1">
                  <li><strong>3계층:</strong> 프록시 키 / 팀 / 조직 레벨</li>
                  <li><strong>주기:</strong> 일간 / 주간 / 월간</li>
                  <li><strong>알림:</strong> 80%, 90%, 100% 임계값에서 이메일/슬랙/웹훅 알림</li>
                  <li><strong>차단:</strong> 예산 초과 시 요청 차단 (헤더로 알림)</li>
                </ul>
                <CodeBlock code={`# 예산 초과 시 응답
HTTP 429 Too Many Requests
x-budget-blocked-by: key | team | org`} />
              </div>
            </Collapsible>

            <Collapsible title="레이트 리밋">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>Redis 슬라이딩 윈도우 기반 분당 요청 제한.</p>
                <ul className="space-y-1">
                  <li><strong>프록시 키별 설정:</strong> 키 생성 시 RPM 제한 설정</li>
                  <li><strong>Graceful fallback:</strong> Redis 장애 시 인메모리 Map 기반 동작</li>
                </ul>
              </div>
            </Collapsible>

            <Collapsible title="Guardrails (안전장치)">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>PII 마스킹, 프롬프트 인젝션 감지, 콘텐츠 길이 제한.</p>
                <ul className="space-y-1">
                  <li><strong>PII 마스킹:</strong> 이메일, 전화번호, SSN, 신용카드 등 7개 패턴</li>
                  <li><strong>키워드 차단:</strong> 커스텀 블랙리스트 키워드</li>
                  <li><strong>입력 길이:</strong> 최대 입력 문자 수 제한</li>
                </ul>
                <CodeBlock code={`# Guardrail 차단 시 응답
HTTP 400 Bad Request
x-guardrail-blocked: true`} />
              </div>
            </Collapsible>

            <Collapsible title="Observability (관찰성)">
              <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <p>프록시 데이터를 외부 관찰 도구로 전송합니다.</p>
                <ul className="space-y-1">
                  <li><strong>Langfuse:</strong> LLM 관찰 플랫폼 네이티브 통합</li>
                  <li><strong>Webhook:</strong> 커스텀 HTTP 엔드포인트로 이벤트 전송</li>
                  <li><strong>Logflare:</strong> 실시간 로그 스트리밍</li>
                  <li><strong>배치 전송:</strong> 5초/100이벤트 단위로 묶어 전송</li>
                  <li><strong>Fire-and-forget:</strong> 전송 실패가 프록시에 영향 없음</li>
                </ul>
              </div>
            </Collapsible>
          </div>
        )}

        {/* Response Headers */}
        {activeSection === 'headers' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">프록시 응답 헤더</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  프록시가 추가하는 커스텀 응답 헤더입니다. 이 헤더로 캐싱, 라우팅, 보안 상태를 확인할 수 있습니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="divide-y dark:divide-slate-700">
                  {[
                    { header: 'x-cache-level', values: 'exact | normalized | semantic', desc: '캐시 히트 시 매치 수준' },
                    { header: 'x-cache-similarity', values: '0.00 - 1.00', desc: '시맨틱 캐시 유사도 점수' },
                    { header: 'x-fallback-provider', values: 'openai | anthropic | google', desc: 'Fallback 사용 시 대체 프로바이더' },
                    { header: 'x-fallback-model', values: 'model name', desc: 'Fallback 사용 시 대체 모델' },
                    { header: 'x-guardrail-blocked', values: 'true', desc: 'Guardrail에 의해 차단된 경우' },
                    { header: 'x-budget-blocked-by', values: 'key | team | org', desc: '예산 초과로 차단된 경우, 차단 계층' },
                    { header: 'x-proxy-latency-ms', values: 'number', desc: '프록시 처리 지연시간 (ms)' },
                  ].map(({ header, values, desc }) => (
                    <div key={header} className="flex items-start gap-4 py-3">
                      <code className="flex-shrink-0 rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-sm font-mono text-purple-700 dark:text-purple-300">{header}</code>
                      <div className="min-w-0">
                        <code className="text-sm text-gray-600 dark:text-slate-400">{values}</code>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Codes */}
        {activeSection === 'errors' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">오류 코드</h2>
              </CardHeader>
              <CardContent>
                <div className="divide-y dark:divide-slate-700">
                  {[
                    { code: 401, title: 'Unauthorized', desc: '유효하지 않거나 만료된 프록시 키', fix: '프록시 키를 확인하고 활성 상태인지 확인하세요' },
                    { code: 400, title: 'Bad Request', desc: '잘못된 요청 형식 또는 Guardrail 차단', fix: 'x-guardrail-blocked 헤더를 확인하세요' },
                    { code: 429, title: 'Too Many Requests', desc: '레이트 리밋 또는 예산 초과', fix: 'x-budget-blocked-by 헤더를 확인하세요' },
                    { code: 502, title: 'Bad Gateway', desc: '업스트림 프로바이더 오류 (Fallback 실패 포함)', fix: 'Fallback을 활성화하거나 프로바이더 상태를 확인하세요' },
                    { code: 504, title: 'Gateway Timeout', desc: '업스트림 응답 시간 초과', fix: '요청 크기를 줄이거나 타임아웃 설정을 확인하세요' },
                  ].map(({ code, title, desc, fix }) => (
                    <div key={code} className="py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={code >= 500 ? 'danger' : code >= 400 ? 'warning' : 'default'}>{code}</Badge>
                        <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{desc}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        <ArrowRight className="inline h-3 w-3 mr-1" />
                        {fix}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">문제 해결</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Collapsible title="캐시가 작동하지 않아요">
                  <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                    <li>- 프록시 키의 캐시 기능이 활성화되어 있는지 확인하세요</li>
                    <li>- 스트리밍 요청은 캐시되지 않습니다</li>
                    <li>- 동일한 모델 + 동일한 메시지여야 캐시 히트됩니다</li>
                    <li>- Redis 연결이 정상인지 확인하세요</li>
                  </ul>
                </Collapsible>
                <Collapsible title="Fallback이 작동하지 않아요">
                  <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                    <li>- 프록시 키의 Fallback 기능이 활성화되어 있는지 확인하세요</li>
                    <li>- 키 타입이 <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">auto</code>이고 여러 프로바이더 키가 등록되어야 합니다</li>
                    <li>- Fallback은 5xx 오류 또는 타임아웃에서만 발생합니다</li>
                  </ul>
                </Collapsible>
                <Collapsible title="예산 알림을 받지 못해요">
                  <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                    <li>- 설정 → 알림에서 채널이 등록되어 있는지 확인하세요</li>
                    <li>- 채널의 알림 유형에 &quot;예산 경고&quot; / &quot;예산 초과&quot;가 포함되어야 합니다</li>
                    <li>- 프록시 키에 예산 한도와 알림 임계값이 설정되어야 합니다</li>
                    <li>- 동일 임계값 알림은 월 1회만 발송됩니다 (중복 방지)</li>
                  </ul>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
