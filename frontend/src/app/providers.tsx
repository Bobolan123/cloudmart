'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { isLoggedIn } from '@/lib/auth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && isLoggedIn()) {
      fetchMe()
      initialized.current = true
    }
  }, [fetchMe])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
