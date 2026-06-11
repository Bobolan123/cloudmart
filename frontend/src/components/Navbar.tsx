'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { logoutUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export function Navbar() {
  const { user, setUser } = useAuthStore()
  const { items } = useCartStore()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    setUser(null)
    setMenuOpen(false)
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">CloudMart</Link>

      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="text-gray-600 hover:text-gray-900">Shop</Link>

        {user ? (
          <>
            {/* Cart */}
            <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Admin badge */}
            {user.role === 'ADMIN' && (
              <Link href="/admin/products" className="text-orange-600 hover:text-orange-700 font-medium">
                Admin
              </Link>
            )}

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(s => !s)}
                className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900"
              >
                <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">
                  {user.name[0].toUpperCase()}
                </span>
                <span>{user.name.split(' ')[0]}</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                  <Link href="/account/profile" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile
                  </Link>
                  <Link href="/account/orders" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    My Orders
                  </Link>
                  <Link href="/account/addresses" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Addresses
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
            <Link href="/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
