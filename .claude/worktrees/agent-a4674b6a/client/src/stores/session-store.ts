import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionState {
  storeId: string | null
  tableId: string | null
  tableName: string | null
  setSession: (storeId: string, tableId: string, tableName?: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      storeId: null,
      tableId: null,
      tableName: null,
      setSession: (storeId, tableId, tableName) => set({ storeId, tableId, tableName }),
      clearSession: () => set({ storeId: null, tableId: null, tableName: null }),
    }),
    { name: 'qr-order-session' }
  )
)
