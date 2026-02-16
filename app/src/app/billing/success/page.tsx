'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      router.push('/pricing')
      return
    }
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => router.push('/dashboard'), 5000)
    return () => clearTimeout(timer)
  }, [sessionId, router])

  if (!sessionId) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">구독이 활성화되었습니다!</h1>
          <p className="mt-2 text-gray-500">
            구독이 활성화되었습니다. 모든 기능을 사용하실 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-gray-400">
            5초 후 대시보드로 이동합니다...
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            대시보드로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
