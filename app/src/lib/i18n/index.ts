import { useAppStore } from '@/lib/store'
import { ko } from './ko'
import { en } from './en'

export type Locale = 'ko' | 'en'

export type TranslationDict = typeof ko

const dictionaries: Record<Locale, TranslationDict> = { ko, en: en as unknown as TranslationDict }

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
  return typeof result === 'string' ? result : path
}

export function useT() {
  const locale = useAppStore((s) => s.locale)
  const dict = dictionaries[locale]

  return function t(key: string, replacements?: Record<string, string>): string {
    let value = getNestedValue(dict as unknown as Record<string, unknown>, key)
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        value = value.replace(`{{${k}}}`, v)
      }
    }
    return value
  }
}

export function useLocale() {
  const locale = useAppStore((s) => s.locale)
  const setLocale = useAppStore((s) => s.setLocale)
  return { locale, setLocale }
}

export function useLandingData() {
  const locale = useAppStore((s) => s.locale)
  const dict = dictionaries[locale]
  return dict.landingData
}
