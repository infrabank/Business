'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SignupFormProps {
  onSubmit: (email: string, password: string, name: string) => void
  isLoading?: boolean
  error?: string
}

export function SignupForm({ onSubmit, isLoading, error }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(email, password, name)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 입력" />
      <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="최소 8자" />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? '계정 생성 중...' : '계정 만들기'}
      </Button>
    </form>
  )
}
