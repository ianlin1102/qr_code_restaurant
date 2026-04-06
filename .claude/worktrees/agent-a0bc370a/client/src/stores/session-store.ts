import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from '@/lib/safe-storage'

interface SessionState {
  storeId: string | null
  tableId: string | null
  tableName: string | null
  customerName?: string
  setSession: (storeId: string, tableId: string, tableName?: string) => void
  setCustomerName: (name: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      storeId: null,
      tableId: null,
      tableName: null,
      customerName: undefined,
      setSession: (storeId, tableId, tableName) => set({ storeId, tableId, tableName }),
      setCustomerName: (name) => set({ customerName: name }),
      clearSession: () => set({ storeId: null, tableId: null, tableName: null, customerName: undefined }),
    }),
    {
      name: 'qr-order-session',
      storage: safeStorage,
    }
  )
)
