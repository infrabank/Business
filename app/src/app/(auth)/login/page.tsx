'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useT } from '@/lib/i18n'

export default function LoginPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { login, isLoading, error } = useAuth()

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError(t('login.emailError'))
      return false
    }
    setEmailError('')
    return true
  }

  function validatePassword(value: string): boolean {
    if (value.length < 8) {
      setPasswordError(t('login.passwordError'))
      return false
    }
    setPasswordError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    await login(email, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 font-bold">
              <Zap className="h-10 w-10 text-indigo-600" />
              <span className="text-2xl text-gradient">LLM Cost Manager</span>
            </Link>
            <p className="mt-3 text-slate-500 dark:text-slate-400">{t('login.title')}</p>
          </div>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 p-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>}
            <Input
              id="email"
              label={t('login.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
              error={emailError}
              required
            />
            <div className="relative">
              <Input
                id="password"
                label={t('login.passwordLabel')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                error={passwordError}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600" size="lg" disabled={isLoading}>
              {isLoading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('login.noAccount')}{' '}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">{t('login.signupLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
