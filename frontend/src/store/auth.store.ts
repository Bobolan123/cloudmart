import { create } from 'zustand'
import { User } from '@/lib/auth'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  fetchMe: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/users/me')
      set({ user: data })
    } catch {
      set({ user: null })
    } finally {
      set({ isLoading: false })
    }
  },

  setUser: (user) => set({ user }),
}))
