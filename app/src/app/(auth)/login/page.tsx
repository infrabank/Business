'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-blue-600">
            <Zap className="h-8 w-8" />
            <span className="text-2xl">LLM Cost Manager</span>
          </Link>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
