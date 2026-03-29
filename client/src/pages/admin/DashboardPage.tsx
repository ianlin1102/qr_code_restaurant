import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import OrderCard from '@/components/order/OrderCard'
import OrderDetailDialog from '@/components/order/OrderDetailDialog'
import OrderEditDialog from '@/components/order/OrderEditDialog'
import type { Order, OrderStatus } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

const POLL_INTERVAL = 5000

type TabFilter = 'all' | OrderStatus

export default function DashboardPage() {
  const { t } = useT()
  const STORE_ID = useAuthStore(s => s.user!.storeId)
  const isOwner = useAuthStore(s => s.isOwner)

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: t.dashboard.all },
    { key: 'pending', label: t.dashboard.status.pending },
    { key: 'preparing', label: t.dashboard.status.preparing },
    { key: 'served', label: t.dashboard.status.served },
  ]

  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // Detail dialog state
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

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
    const interval = setInterval(() => fetchOrders(), POLL_INTERVAL)
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

  const openEditDialog = (order: Order) => {
    setEditingOrder(order)
    setEditDialogOpen(true)
  }

  const openDetail = (order: Order) => {
    setDetailOrder(order)
    setDetailOpen(true)
  }

  const handleEditFromDetail = (order: Order) => {
    setDetailOpen(false)
    openEditDialog(order)
  }

  const handleStatusFromDetail = async (orderId: string, status: OrderStatus) => {
    await handleStatusUpdate(orderId, status)
    setDetailOpen(false)
  }

  const getActionButton = (order: Order) => {
    if (order.status === 'pending') {
      return (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
          disabled={updatingOrderId === order.id}
          onClick={e => { e.stopPropagation(); handleStatusUpdate(order.id, 'preparing') }}
        >
          {updatingOrderId === order.id ? '...' : t.dashboard.startPreparing}
        </Button>
      )
    }
    if (order.status === 'preparing') {
      return (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
          disabled={updatingOrderId === order.id}
          onClick={e => { e.stopPropagation(); handleStatusUpdate(order.id, 'served') }}
        >
          {updatingOrderId === order.id ? '...' : t.dashboard.markComplete}
        </Button>
      )
    }
    if (order.status === 'served') {
      return (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] border-orange-300 text-orange-600 hover:bg-orange-50"
          disabled={updatingOrderId === order.id}
          onClick={e => { e.stopPropagation(); handleStatusUpdate(order.id, 'preparing') }}
        >
          {updatingOrderId === order.id ? '...' : t.dashboard.reopen}
        </Button>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 glass shadow-sm">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold font-display">{t.dashboard.title}</h1>
          </div>
        </div>
      </header>

      {/* Tab filter bar */}
      <div className="sticky top-[60px] z-10 bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 min-h-[44px]"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <main className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
        {loading && orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.common.loading}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.common.noData}
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              storeId={STORE_ID}
              onClick={() => openDetail(order)}
              onEdit={() => openEditDialog(order)}
              actionButton={getActionButton(order)}
            />
          ))
        )}
      </main>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={detailOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusUpdate={handleStatusFromDetail}
        onEdit={handleEditFromDetail}
        updating={updatingOrderId === detailOrder?.id}
      />

      {/* Edit Order Dialog */}
      <OrderEditDialog
        order={editingOrder}
        storeId={STORE_ID}
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setEditingOrder(null) }}
        onSaved={() => fetchOrders()}
        isOwner={isOwner()}
      />
    </div>
  )
}
