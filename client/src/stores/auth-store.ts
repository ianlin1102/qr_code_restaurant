import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from '@/lib/safe-storage'
import type { AuthUser } from '@qr-order/shared'

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
  isOwner: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
      isOwner: () => get().user?.role === 'owner',
    }),
    { name: 'auth-storage', storage: safeStorage }
  )
)
