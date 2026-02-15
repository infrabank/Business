'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText,
  Settings, Menu, X, Zap,
} from 'lucide-react'
import { useState } from 'react'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText,
}

export function NavBar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center border-b border-gray-200 bg-white px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-blue-600">
          <Zap className="h-6 w-6" />
          <span className="text-lg">LLM Cost Manager</span>
        </Link>

        <div className="ml-8 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon]
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/settings" className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:block">
            <Settings className="h-5 w-5" />
          </Link>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white p-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium', active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100')}>
                  {Icon && <Icon className="h-5 w-5" />}
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
