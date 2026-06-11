'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'

const navLinks = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/orders', label: 'My Orders' },
  { href: '/account/addresses', label: 'Addresses' },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
      <aside className="w-48 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <nav className="space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link href="/" className="block px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-50">
                ← Back to Shop
              </Link>
            </div>
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
