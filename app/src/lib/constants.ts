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
  free: { providers: 1, historyDays: 7, members: 1 },
  starter: { providers: 3, historyDays: 30, members: 5 },
  pro: { providers: -1, historyDays: 365, members: 20 },
  enterprise: { providers: -1, historyDays: -1, members: -1 },
} as const

export const STRIPE_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
}

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Providers', href: '/providers', icon: 'Plug' },
  { label: 'Projects', href: '/projects', icon: 'FolderOpen' },
  { label: 'Budget', href: '/budget', icon: 'Wallet' },
  { label: 'Alerts', href: '/alerts', icon: 'Bell' },
  { label: 'Reports', href: '/reports', icon: 'FileText' },
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
