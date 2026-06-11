'use client'

import { useParams } from 'next/navigation'
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

const STATUS_STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data,
  })

  if (isLoading) return <div className="h-96 bg-white rounded-xl border animate-pulse" />
  if (!order) return <div className="text-center py-16 text-gray-500">Order not found</div>

  const stepIndex = STATUS_STEPS.indexOf(order.status)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Orders</Link>
        <h1 className="text-xl font-bold text-gray-900">#{order.id.slice(-8).toUpperCase()}</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}>
          {order.status}
        </span>
      </div>

      {order.status !== 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">Order Progress</p>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${i <= stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <span className="text-xs text-gray-400 mt-1 whitespace-nowrap">{step}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 ${i < stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item: {
            productId: string
            product: { name: string; imageUrl: string | null }
            quantity: number
            price: number
          }) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                {item.product.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                  : <span className="text-xl">📦</span>
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold">{formatVND(Number(item.price) * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-blue-600">{formatVND(Number(order.total))}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-600 space-y-2">
        <div className="flex justify-between">
          <span>Placed on</span>
          <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
        </div>
        {order.note && <div className="flex justify-between"><span>Note</span><span>{order.note}</span></div>}
      </div>
    </div>
  )
}
