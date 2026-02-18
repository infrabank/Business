'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/hooks/useAuth'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { signup, isLoading, error } = useAuth()

  function validateName(value: string): boolean {
    if (value.trim().length === 0) {
      setNameError('이름을 입력해주세요')
      return false
    }
    setNameError('')
    return true
  }

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError('올바른 이메일 주소를 입력해주세요')
      return false
    }
    setEmailError('')
    return true
  }

  function validatePassword(value: string): boolean {
    if (value.length < 8) {
      setPasswordError('비밀번호는 최소 8자 이상이어야 합니다')
      return false
    }
    setPasswordError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const isNameValid = validateName(name)
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isNameValid || !isEmailValid || !isPasswordValid) {
      return
    }

    await signup(email, password, name)
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
            <p className="mt-3 text-slate-500 dark:text-slate-400">무료 계정 만들기</p>
          </div>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 p-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>}
            <Input
              id="name"
              label="이름"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError('')
              }}
              placeholder="이름 입력"
              autoComplete="name"
              error={nameError}
              required
            />
            <Input
              id="email"
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              placeholder="you@company.com"
              autoComplete="email"
              error={emailError}
              required
            />
            <div className="relative">
              <Input
                id="password"
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="최소 8자"
                autoComplete="new-password"
                error={passwordError}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600" size="lg" disabled={isLoading}>
              {isLoading ? '계정 생성 중...' : '계정 만들기'}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">무료 플랜은 1개 프로바이더, 7일 히스토리, 기본 대시보드를 포함합니다.</p>
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
