'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ProductForm } from '@/components/ProductForm'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
  })

  const handleSubmit = async (form: {
    name: string; description: string; price: string
    stock: string; categoryId: string; imageUrl: string; isActive: boolean
  }) => {
    await api.put(`/products/${id}`, {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: form.categoryId,
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
    })
  }

  if (isLoading) return <div className="h-64 bg-white rounded-xl animate-pulse" />

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Product</h1>
      <ProductForm
        initialData={{
          name: product?.name ?? '',
          description: product?.description ?? '',
          price: String(product?.price ?? ''),
          stock: String(product?.stock ?? ''),
          categoryId: product?.categoryId ?? '',
          imageUrl: product?.imageUrl ?? '',
          isActive: product?.isActive ?? true,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  )
}
