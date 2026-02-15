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

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Providers', href: '/providers', icon: 'Plug' },
  { label: 'Projects', href: '/projects', icon: 'FolderOpen' },
  { label: 'Budget', href: '/budget', icon: 'Wallet' },
  { label: 'Alerts', href: '/alerts', icon: 'Bell' },
  { label: 'Reports', href: '/reports', icon: 'FileText' },
] as const
