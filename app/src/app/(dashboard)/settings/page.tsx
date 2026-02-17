'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { SettingsTabs } from '@/features/settings/components/SettingsTabs'
import { GeneralTab } from '@/features/settings/components/GeneralTab'
import { OrganizationTab } from '@/features/settings/components/OrganizationTab'
import { NotificationsTab } from '@/features/settings/components/NotificationsTab'
import { SubscriptionTab } from '@/features/settings/components/SubscriptionTab'
import { SecurityTab } from '@/features/settings/components/SecurityTab'
import type { SettingsTab } from '@/types/settings'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') as SettingsTab | null
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || 'general')

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab)
    router.replace(`/settings?tab=${tab}`, { scroll: false })
  }

  return (
    <>
      <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="mt-6">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'organization' && <OrganizationTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'subscription' && <SubscriptionTab />}
        {activeTab === 'security' && <SecurityTab />}
      </div>
    </>
  )
}

export default function SettingsPage() {
  const { isReady } = useSession()

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-500">계정 및 조직 관리</p>
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500">계정 및 조직 관리</p>
      </div>

      <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-gray-100" />}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
