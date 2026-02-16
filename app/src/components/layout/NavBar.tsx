'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText,
  Settings, Menu, X, Zap, LogOut,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Plug, FolderOpen, Wallet, Bell, FileText,
}

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const currentUser = useAppStore((s) => s.currentUser)
  const clearSession = useAppStore((s) => s.clearSession)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    if (userMenuOpen || mobileOpen) document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [userMenuOpen, mobileOpen])

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    clearSession()
    router.push('/login')
  }

  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || '?'

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

          {/* User menu (desktop) */}
          <div className="relative hidden lg:block" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {userInitial}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg" role="menu">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser?.email || ''}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
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
            <hr className="my-2 border-gray-100" />
            <Link href="/settings" onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium', pathname === '/settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100')}>
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <button onClick={() => { setMobileOpen(false); handleLogout() }}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
