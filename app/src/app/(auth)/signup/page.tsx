'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/hooks/useAuth'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signup, isLoading, error } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await signup(email, password, name)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-blue-600">
            <Zap className="h-8 w-8" />
            <span className="text-2xl">LLM Cost Manager</span>
          </Link>
          <p className="mt-2 text-gray-600">Create your free account</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Input id="name" label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required />
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">Free plan includes 1 provider, 7-day history, and basic dashboard.</p>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
