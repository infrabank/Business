'use client'

import { Settings, Building, Bell, CreditCard, Shield } from 'lucide-react'
import type { SettingsTab } from '@/types/settings'
import { SETTINGS_TABS } from '@/types/settings'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Settings,
  Building,
  Bell,
  CreditCard,
  Shield,
}

interface SettingsTabsProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <>
      {/* Desktop: horizontal tabs */}
      <div className="hidden border-b border-gray-200 dark:border-slate-700 md:block">
        <nav className="-mb-px flex gap-6">
          {SETTINGS_TABS.map((tab) => {
            const Icon = ICON_MAP[tab.icon]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 dark:border-indigo-400 text-blue-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Mobile: dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as SettingsTab)}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SETTINGS_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
