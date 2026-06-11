'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Address {
  id: string
  fullName: string
  phone: string
  street: string
  city: string
  province: string
  country: string
  isDefault: boolean
}

const emptyForm = { fullName: '', phone: '', street: '', city: '', province: '', country: 'Vietnam', isDefault: false }

export default function AddressesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get('/users/me/addresses')).data,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post('/users/me/addresses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setForm(emptyForm)
      setShowForm(false)
    },
    onError: () => setError('Failed to save address'),
  })

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(form)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Addresses</h1>
        <button onClick={() => setShowForm(s => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ Add Address'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">New Address</h2>
          {error && <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {([
              ['fullName', 'Full Name', 'col-span-2'],
              ['phone', 'Phone', 'col-span-1'],
              ['street', 'Street', 'col-span-2'],
              ['city', 'City', 'col-span-1'],
              ['province', 'Province', 'col-span-1'],
              ['country', 'Country', 'col-span-1'],
            ] as [keyof typeof emptyForm, string, string][]).map(([field, label, span]) => (
              <div key={field} className={span}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input required={field !== 'country'} value={String(form[field])} onChange={set(field)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default</label>
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={createMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                {createMutation.isPending ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500 text-sm">
          No saved addresses yet
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{addr.fullName}
                    {addr.isDefault && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Default</span>}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{addr.phone}</p>
                  <p className="text-sm text-gray-500">{addr.street}, {addr.city}, {addr.province}, {addr.country}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
