'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '⬛' },
  { href: '/assets', label: 'Assets', icon: '📦' },
  { href: '/users', label: 'Team', icon: '👥' },
  { href: '/reports', label: 'Reports', icon: '📊' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, firebaseUser, loading, needsOnboarding, pendingApproval, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (pendingApproval) {
      router.push('/pending-approval')
    } else if (!user && !needsOnboarding && !firebaseUser) {
      // Only redirect to login if there's genuinely no Firebase session either
      router.push('/login')
    } else if (needsOnboarding) {
      router.push('/onboarding')
    }
  }, [user, firebaseUser, loading, needsOnboarding, pendingApproval, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-bold text-gray-900">Nexus-Core</span>
        </div>

        <div className="px-3 py-3">
          <p className="px-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
            {user.organization.name}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 pb-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {(user.displayName ?? user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.displayName ?? user.email}
              </p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
