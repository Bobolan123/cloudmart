'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // if (!isLoading && user && user.role !== 'ADMIN') router.push('/')
    // if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) return null
  if (user.role !== 'ADMIN') return null

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 bg-gray-900 text-gray-300 flex flex-col py-6 px-4 shrink-0">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">Admin</p>
        <nav className="space-y-1">
          <Link href="/admin/products" className="block px-3 py-2 rounded-md text-sm hover:bg-gray-800 hover:text-white">
            Products
          </Link>
          <Link href="/" className="block px-3 py-2 rounded-md text-sm hover:bg-gray-800 hover:text-white">
            ← Back to Shop
          </Link>
        </nav>
      </aside>
      <div className="flex-1 bg-gray-50 p-8">{children}</div>
    </div>
  )
}
