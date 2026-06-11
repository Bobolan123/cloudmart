'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { resolveImage } from '@/lib/image'

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  })

  const handleAddToCart = async () => {
    if (!user) return router.push('/login')
    setAdding(true)
    try {
      await addItem(product.id, qty)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } finally {
      setAdding(false)
    }
  }

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse h-96 bg-white rounded-xl" />

  if (!product) return <div className="text-center py-16 text-gray-500">Product not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-1/2 bg-gray-100 h-72 md:h-auto flex items-center justify-center">
          {resolveImage(product.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImage(product.imageUrl)!} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">📦</span>
          )}
        </div>
        <div className="md:w-1/2 p-8 flex flex-col">
          <p className="text-sm text-gray-400 mb-1">{product.category.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-3xl font-bold text-blue-600 mb-4">{formatVND(Number(product.price))}</p>
          <p className="text-gray-600 text-sm mb-6 flex-1">{product.description}</p>

          {product.stock > 0 ? (
            <p className="text-sm text-green-600 mb-4">In stock ({product.stock} available)</p>
          ) : (
            <p className="text-sm text-red-500 mb-4">Out of stock</p>
          )}

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-700">Qty:</label>
            <div className="flex items-center border border-gray-300 rounded-md">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1 text-gray-600 hover:bg-gray-50">-</button>
              <span className="px-4 py-1 text-sm">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="px-3 py-1 text-gray-600 hover:bg-gray-50">+</button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding || product.stock === 0}
            className="bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {added ? '✓ Added to cart' : adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
