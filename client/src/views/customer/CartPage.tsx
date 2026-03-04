import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceCNY } from '@/lib/format'
import { api } from '@/services/api'

export default function CartPage() {
  const navigate = useNavigate()
  const { storeId, tableId } = useSessionStore()
  const { items, updateQuantity, updateRemark, clearCart, totalPrice, totalItems } = useCartStore()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No session — user hasn't scanned a QR code
  if (!storeId || !tableId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Active Session</h2>
        <p className="text-muted-foreground text-center mb-4">
          Please scan a QR code at your table to start ordering.
        </p>
      </div>
    )
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-center mb-4">
          Add some items from the menu to get started.
        </p>
        <Button onClick={() => navigate(`/menu/${storeId}`)}>
          Back to Menu
        </Button>
      </div>
    )
  }

  async function handlePlaceOrder() {
    if (!storeId || !tableId) return
    setError(null)
    setSubmitting(true)

    try {
      const order = await api.createOrder(storeId, {
        tableId,
        items: items.map(({ menuItemId, quantity, remark }) => ({
          menuItemId,
          quantity,
          ...(remark ? { remark } : {}),
        })),
      })
      clearCart()
      navigate('/order/confirm', { state: { order } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/menu/${storeId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">My Cart</h1>
        <span className="text-sm text-muted-foreground ml-auto">
          {totalItems()} item{totalItems() !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cart items */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {items.map((item) => (
          <Card key={item.menuItemId} className="p-4 space-y-3">
            {/* Item header: name + subtotal */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPriceCNY(item.price)} each
                </p>
              </div>
              <p className="font-semibold whitespace-nowrap">
                {formatPriceCNY(item.price * item.quantity)}
              </p>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Remark input */}
            <Input
              placeholder="Add a remark (optional)"
              value={item.remark ?? ''}
              onChange={(e) => updateRemark(item.menuItemId, e.target.value)}
              className="text-sm"
            />
          </Card>
        ))}
      </div>

      {/* Bottom summary bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {totalItems()} item{totalItems() !== 1 ? 's' : ''}
              </p>
              <p className="text-xl font-bold">{formatPriceCNY(totalPrice())}</p>
            </div>
            <Button
              size="lg"
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="min-w-[140px]"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
