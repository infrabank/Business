export const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10A37F',
  anthropic: '#D4A574',
  google: '#4285F4',
  azure: '#0078D4',
  custom: '#6B7280',
}

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  azure: 'Azure OpenAI',
  custom: 'Custom',
}

export const PLAN_LIMITS = {
  free: { providers: 1, historyDays: 7, members: 1, maxRequests: 1000, playgroundDaily: 10, maxTemplates: 10 },
  growth: { providers: -1, historyDays: 365, members: -1, maxRequests: -1, playgroundDaily: -1, maxTemplates: -1 },
} as const

export const COMMISSION_RATE = 0.20
export const STRIPE_METERED_PRICE = process.env.STRIPE_METERED_PRICE_ID || ''
export const STRIPE_METER_EVENT_NAME = process.env.STRIPE_METER_EVENT_NAME || 'llm_savings'

export const NAV_ITEMS = [
  { label: '대시보드', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: '프로바이더', href: '/providers', icon: 'Plug' },
  { label: '프로젝트', href: '/projects', icon: 'FolderOpen' },
  { label: '예산', href: '/budget', icon: 'Wallet' },
  { label: '알림', href: '/alerts', icon: 'Bell' },
  { label: '리포트', href: '/reports', icon: 'FileText' },
  { label: '프록시', href: '/proxy', icon: 'ArrowLeftRight' },
  { label: '팀', href: '/team', icon: 'Users' },
  { label: '플레이그라운드', href: '/playground', icon: 'Terminal' },
  { label: '템플릿', href: '/templates', icon: 'BookTemplate' },
  { label: '분석', href: '/analytics', icon: 'BarChart3' },
  { label: 'API 문서', href: '/docs', icon: 'Book' },
] as const

export interface RateLimitConfig {
  maxRequestsPerMinute: number
  delayBetweenRequestsMs: number
}

export const SYNC_CONFIG = {
  defaultSyncDays: 1,
  maxSyncDays: 90,
  maxRetries: 3,
  retryBaseDelayMs: 2000,
  cronSchedule: '0 3 * * *',
} as const

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  openai: { maxRequestsPerMinute: 60, delayBetweenRequestsMs: 1000 },
  anthropic: { maxRequestsPerMinute: 60, delayBetweenRequestsMs: 1000 },
  google: { maxRequestsPerMinute: 300, delayBetweenRequestsMs: 500 },
} as const
