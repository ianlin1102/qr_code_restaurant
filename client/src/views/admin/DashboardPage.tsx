import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/services/api'
import { formatPriceCNY } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order, OrderStatus } from '@qr-order/shared'

const STORE_ID = 'store-demo-001'
const POLL_INTERVAL = 5000

type TabFilter = 'all' | OrderStatus

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
}

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'completed', label: 'Completed' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const fetchOrders = useCallback(async (filter?: TabFilter) => {
    try {
      const tab = filter ?? activeTabRef.current
      const status = tab === 'all' ? undefined : tab
      const data = await api.getOrders(STORE_ID, status)
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    setLoading(true)
    fetchOrders()

    const interval = setInterval(() => {
      fetchOrders()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchOrders])

  // Re-fetch when tab changes
  useEffect(() => {
    setLoading(true)
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId)
    try {
      await api.updateOrderStatus(STORE_ID, orderId, newStatus)
      await fetchOrders()
    } catch (err) {
      console.error('Failed to update order status:', err)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getActionButton = (order: Order) => {
    if (order.status === 'pending') {
      return (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={updatingOrderId === order.id}
          onClick={() => handleStatusUpdate(order.id, 'preparing')}
        >
          {updatingOrderId === order.id ? 'Updating...' : 'Start Preparing'}
        </Button>
      )
    }
    if (order.status === 'preparing') {
      return (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={updatingOrderId === order.id}
          onClick={() => handleStatusUpdate(order.id, 'completed')}
        >
          {updatingOrderId === order.id ? 'Updating...' : 'Mark Completed'}
        </Button>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold">Order Dashboard</h1>
          <p className="text-sm text-muted-foreground">Store: Demo Store</p>
        </div>
      </header>

      {/* Tab filter bar */}
      <div className="sticky top-[60px] z-10 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {loading && orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No orders found.
          </div>
        ) : (
          orders.map((order) => {
            const config = STATUS_CONFIG[order.status]
            return (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">
                        #{order.orderNumber}
                      </span>
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {timeAgo(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{order.tableName}</span>
                    {order.customerName && (
                      <>
                        <span>·</span>
                        <span>{order.customerName}</span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-3">
                  {/* Item list */}
                  <ul className="space-y-1 mb-3">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <div>
                          <span>{item.name}</span>
                          <span className="text-muted-foreground ml-1">
                            x{item.quantity}
                          </span>
                          {item.remark && (
                            <span className="text-xs text-orange-600 ml-2">
                              ({item.remark})
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatPriceCNY(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Total and action */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">
                      Total: {formatPriceCNY(order.totalPrice)}
                    </span>
                    {getActionButton(order)}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </main>
    </div>
  )
}
