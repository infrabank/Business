// === Template Variable ===

export interface TemplateVariable {
  name: string
  defaultValue?: string
}

// === Template Core ===

export interface PromptTemplate {
  id: string
  orgId: string
  userId: string
  name: string
  description?: string
  category: string
  systemPrompt?: string
  userPrompt: string
  variables: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility: TemplateVisibility
  isFavorite: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

// === Enums ===

export type TemplateVisibility = 'private' | 'shared'

export type TemplateSortOption = 'recent' | 'name' | 'created' | 'usage'

// === API Request/Response ===

export interface CreateTemplateRequest {
  name: string
  description?: string
  category: string
  systemPrompt?: string
  userPrompt: string
  variables?: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility: TemplateVisibility
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  category?: string
  systemPrompt?: string
  userPrompt?: string
  variables?: TemplateVariable[]
  defaultModel?: string
  defaultProvider?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  visibility?: TemplateVisibility
  isFavorite?: boolean
}

export interface TemplateListResponse {
  data: PromptTemplate[]
  total: number
}

// === Variable Substitution ===

export interface VariableValues {
  [variableName: string]: string
}

// === Category ===

export const DEFAULT_CATEGORIES = [
  { value: 'translation', label: '번역' },
  { value: 'summary', label: '요약' },
  { value: 'code', label: '코드' },
  { value: 'analysis', label: '분석' },
  { value: 'marketing', label: '마케팅' },
  { value: 'other', label: '기타' },
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  translation: '번역',
  summary: '요약',
  code: '코드',
  analysis: '분석',
  marketing: '마케팅',
  other: '기타',
}
