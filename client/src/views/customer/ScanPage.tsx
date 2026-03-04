import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'

export default function ScanPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const setSession = useSessionStore(s => s.setSession)
  const clearCart = useCartStore(s => s.clearCart)
  const navigate = useNavigate()

  useEffect(() => {
    if (storeId && tableId) {
      clearCart()
      setSession(storeId, tableId)
      navigate(`/menu/${storeId}`, { replace: true })
    }
  }, [storeId, tableId, setSession, clearCart, navigate])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
