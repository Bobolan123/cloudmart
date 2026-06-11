'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  isActive: boolean
  category: { name: string }
}

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () => (await api.get('/products', { params: { page, limit: 20 } })).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setDeletingId(null)
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <Link href="/admin/products/new" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          + New Product
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Price</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.products?.map((p: Product) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                    <td className="px-4 py-3 text-right text-blue-600 font-medium">{formatVND(p.price)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline text-xs">
                          Edit
                        </Link>
                        {deletingId === p.id ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Sure?</span>
                            <button onClick={() => deleteMutation.mutate(p.id)} className="text-red-600 hover:underline font-medium">
                              Yes
                            </button>
                            <button onClick={() => setDeletingId(null)} className="text-gray-400 hover:underline">
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(p.id)} className="text-red-400 hover:text-red-600 text-xs">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === data?.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
