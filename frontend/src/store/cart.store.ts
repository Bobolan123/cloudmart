import { create } from 'zustand'
import { api } from '@/lib/api'

export interface CartItem {
  productId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartState {
  items: CartItem[]
  total: number
  isLoading: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number) => Promise<void>
  updateItem: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/cart')
      set({ items: data.items, total: data.total })
    } finally {
      set({ isLoading: false })
    }
  },

  addItem: async (productId, quantity = 1) => {
    const { data } = await api.post('/cart/items', { productId, quantity })
    const total = data.items.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)
    set({ items: data.items, total })
  },

  updateItem: async (productId, quantity) => {
    const { data } = await api.put(`/cart/items/${productId}`, { quantity })
    const total = data.items.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)
    set({ items: data.items, total })
  },

  removeItem: async (productId) => {
    const { data } = await api.delete(`/cart/items/${productId}`)
    const total = data.items.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0)
    set({ items: data.items, total })
  },

  clear: () => set({ items: [], total: 0 }),
}))
