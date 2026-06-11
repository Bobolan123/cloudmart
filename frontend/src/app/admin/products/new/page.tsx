'use client'

import { api } from '@/lib/api'
import { ProductForm } from '@/components/ProductForm'

export default function NewProductPage() {
  const handleSubmit = async (form: {
    name: string; description: string; price: string
    stock: string; categoryId: string; imageUrl: string; isActive: boolean
  }) => {
    await api.post('/products', {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      categoryId: form.categoryId,
      imageUrl: form.imageUrl || undefined,
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Product</h1>
      <ProductForm onSubmit={handleSubmit} submitLabel="Create Product" />
    </div>
  )
}
