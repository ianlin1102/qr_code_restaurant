import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { api } from '@/services/api'

export default function ScanPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const session = useSessionStore()
  const clearCart = useCartStore(s => s.clearCart)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeId || !tableId) return

    async function init() {
      try {
        // Check table status — if idle, this is a new session (previous was settled)
        const table = await api.getTable(storeId!, tableId!)

        // If switching to a different table, or table was settled (idle), clear cart
        const isSameSession = session.storeId === storeId && session.tableId === tableId
        if (!isSameSession) {
          clearCart()
        }

        session.setSession(storeId!, tableId!, table.name)
        navigate(`/menu/${storeId}`, { replace: true })
      } catch {
        setError('无法连接到服务器，请检查网络连接')
      }
    }

    init()
  }, [storeId, tableId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <p className="text-destructive text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
