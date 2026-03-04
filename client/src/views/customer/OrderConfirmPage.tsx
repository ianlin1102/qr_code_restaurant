import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceCNY } from '@/lib/format'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { storeId } = useSessionStore()

  const order = (location.state as { order?: Order } | null)?.order

  // No order data — fallback
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold mb-2">No Order Found</h2>
        <p className="text-muted-foreground text-center mb-4">
          It looks like you navigated here directly. Please go back to the menu.
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          Back to Menu
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Success icon and heading */}
        <div className="flex flex-col items-center text-center space-y-3">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Order Placed!</h1>
          <p className="text-muted-foreground">
            Your order has been submitted successfully.
          </p>
        </div>

        {/* Order number */}
        <Card className="p-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">Order Number</p>
          <p className="text-3xl font-bold tracking-wider">{order.orderNumber}</p>
          {order.tableName && (
            <p className="text-sm text-muted-foreground">
              Table: {order.tableName}
            </p>
          )}
        </Card>

        {/* Order items */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Order Details</h2>
          <Separator />
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.menuItemId} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  {item.remark && (
                    <p className="text-xs text-muted-foreground truncate">{item.remark}</p>
                  )}
                </div>
                <span className="font-medium whitespace-nowrap ml-2">
                  {formatPriceCNY(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg">{formatPriceCNY(order.totalPrice)}</span>
          </div>
        </Card>

        {/* Action button */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}
        >
          Back to Menu
        </Button>
      </div>
    </div>
  )
}
