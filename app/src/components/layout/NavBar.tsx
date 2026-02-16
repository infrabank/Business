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
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-indigo-600">
          <Zap className="h-6 w-6" />
          <span className="text-lg text-gradient">LLM Cost Manager</span>
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
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                  active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/settings" className="hidden rounded-xl p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:block">
            <Settings className="h-5 w-5" />
          </Link>

          {/* User menu (desktop) */}
          <div className="relative hidden lg:block" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {userInitial}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-10 w-52 rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl py-2 shadow-xl" role="menu">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{currentUser?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser?.email || ''}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg mx-1 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" /> 설정
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg mx-1 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" /> 로그아웃
                </button>
              </div>
            )}
          </div>

          <button
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white/95 backdrop-blur-xl p-6 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={cn('flex items-center gap-3 rounded-2xl px-5 py-4 text-base font-medium', active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100')}>
                  {Icon && <Icon className="h-5 w-5" />}
                  {item.label}
                </Link>
              )
            })}
            <hr className="my-3 border-slate-100" />
            <Link href="/settings" onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 rounded-2xl px-5 py-4 text-base font-medium', pathname === '/settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100')}>
              <Settings className="h-5 w-5" />
              설정
            </Link>
            <button onClick={() => { setMobileOpen(false); handleLogout() }}
              className="flex items-center gap-3 rounded-2xl px-5 py-4 text-base font-medium text-rose-600 hover:bg-rose-50">
              <LogOut className="h-5 w-5" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </>
  )
}
