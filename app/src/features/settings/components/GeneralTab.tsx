'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { useAppStore } from '@/lib/store'
import { usePreferences } from '../hooks/usePreferences'
import { useApiKeys } from '../hooks/useApiKeys'
import { bkend } from '@/lib/bkend'
import { PROVIDER_COLORS, PROVIDER_LABELS } from '@/lib/constants'
import Link from 'next/link'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GeneralTab() {
  const { currentUser } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const router = useRouter()
  const { preferences, isSaving, updatePreference } = usePreferences()
  const { keys, isLoading: keysLoading } = useApiKeys(orgId)

  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '')
      setProfileEmail(currentUser.email || '')
    }
  }, [currentUser])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await bkend.patch(`/users/${currentUser!.id}`, { name: profileName })
      toast('success', '프로필이 업데이트되었습니다.')
    } catch {
      toast('error', '프로필 업데이트에 실패했습니다.')
    } finally {
      setProfileSaving(false)
    }
  }

  function formatSyncTime(lastSyncAt?: string): string {
    if (!lastSyncAt) return '동기화 안 됨'
    const diff = Date.now() - new Date(lastSyncAt).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}분 전`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">프로필</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={handleSaveProfile}>
            <Input
              id="name"
              label="이름"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                value={profileEmail}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">이메일은 변경할 수 없습니다.</p>
            </div>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? '저장 중...' : '변경사항 저장'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">환경설정</h2>
            {isSaving && <span className="text-xs text-gray-400">저장 중...</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">통화 표시</label>
              <select
                value={preferences.currency}
                onChange={(e) => updatePreference('currency', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="KRW">KRW (&#8361;)</option>
                <option value="EUR">EUR (&euro;)</option>
                <option value="JPY">JPY (&yen;)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">날짜 형식</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => updatePreference('dateFormat', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">숫자 형식</label>
              <select
                value={preferences.numberFormat}
                onChange={(e) => updatePreference('numberFormat', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="1,000.00">1,000.00</option>
                <option value="1.000,00">1.000,00</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">대시보드 기본 기간</label>
              <select
                value={preferences.dashboardPeriod}
                onChange={(e) => updatePreference('dashboardPeriod', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={7}>최근 7일</option>
                <option value={30}>최근 30일</option>
                <option value={90}>최근 90일</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">온보딩</h2></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">초기 설정 위자드를 다시 실행합니다</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={async () => {
              await fetch('/api/onboarding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ onboardingCompleted: false, onboardingStep: 1 }),
              })
              toast('info', '온보딩이 초기화되었습니다.')
              router.push('/dashboard')
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> 온보딩 다시 시작
          </Button>
        </CardContent>
      </Card>

      {/* API Key Summary */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">API 키 현황</h2></CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              등록된 API 키가 없습니다.
              <Link href="/providers" className="ml-1 text-blue-600 hover:text-blue-800">
                프로바이더 추가하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.keyId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: k.isActive ? (PROVIDER_COLORS[k.providerType] || '#6B7280') : '#D1D5DB' }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {PROVIDER_LABELS[k.providerType] || k.providerName}
                      </span>
                      <span className="ml-2 font-mono text-xs text-gray-400">{k.keyPrefix}...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{k.label}</span>
                    <span className="text-xs text-gray-400">
                      {formatSyncTime(k.lastSyncAt)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link
                  href="/providers"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  프로바이더 페이지에서 키 관리
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
