'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function CartPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { items, total, fetchCart, updateItem, removeItem, isLoading } = useCartStore()

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetchCart()
  }, [user, fetchCart, router])

  if (!user) return null

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <Link href="/" className="text-blue-600 hover:underline text-sm">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
              <p className="text-sm text-blue-600">{formatVND(item.price)}</p>
            </div>
            <div className="flex items-center border border-gray-300 rounded-md">
              <button onClick={() => updateItem(item.productId, item.quantity - 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-50 text-sm">-</button>
              <span className="px-3 py-1 text-sm">{item.quantity}</span>
              <button onClick={() => updateItem(item.productId, item.quantity + 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-50 text-sm">+</button>
            </div>
            <p className="text-sm font-semibold text-gray-900 w-24 text-right">{formatVND(item.price * item.quantity)}</p>
            <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 ml-2">✕</button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold text-blue-600">{formatVND(total)}</span>
        </div>
        <button
          onClick={() => router.push('/checkout')}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Proceed to Checkout
        </button>
        <Link href="/" className="block text-center text-sm text-gray-500 mt-3 hover:underline">Continue shopping</Link>
      </div>
    </div>
  )
}
