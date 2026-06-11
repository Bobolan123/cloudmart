'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function AccountOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['account-orders'],
    queryFn: async () => (await api.get('/orders')).data,
  })

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white h-24 rounded-xl border animate-pulse" />)}
    </div>
  )

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Orders</h1>

      {data?.orders?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-600">No orders yet</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.orders?.map((order: {
            id: string; status: string; total: number; createdAt: string
            items: { product: { name: string } }[]
          }) => (
            <Link key={order.id} href={`/account/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-gray-500">#{order.id.slice(-8).toUpperCase()}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {order.items.slice(0, 2).map(i => i.product.name).join(', ')}
                {order.items.length > 2 && ` +${order.items.length - 2} more`}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                <span className="font-semibold text-blue-600 text-sm">{formatVND(Number(order.total))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
