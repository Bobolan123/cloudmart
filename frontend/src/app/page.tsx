'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { resolveImage } from '@/lib/image'

interface Product {
  id: string
  name: string
  price: number
  imageUrl: string | null
  stock: number
  category: { name: string; slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductsResponse {
  products: Product[]
  total: number
  totalPages: number
}

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function HomePage() {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  })

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products', page, category, search],
    queryFn: async () =>
      (await api.get('/products', { params: { page, limit: 12, category: category || undefined, search: search || undefined } })).data,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
          className="flex gap-2 flex-1"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
            Search
          </button>
        </form>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{data?.total ?? 0} products</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-gray-100 h-48 flex items-center justify-center">
                  {resolveImage(p.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveImage(p.imageUrl)!} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-400 mb-1">{p.category.name}</p>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{p.name}</h3>
                  <p className="mt-1 text-blue-600 font-semibold text-sm">{formatVND(p.price)}</p>
                  {p.stock === 0 && <p className="text-xs text-red-500 mt-1">Out of stock</p>}
                </div>
              </Link>
            ))}
          </div>

          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {data?.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === data?.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
