'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
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
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input id="email" label="Email" type="email" placeholder="you@company.com" required />
          <Input id="password" label="Password" type="password" placeholder="••••••••" required />
          <Button type="submit" className="w-full" size="lg">Sign In</Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
