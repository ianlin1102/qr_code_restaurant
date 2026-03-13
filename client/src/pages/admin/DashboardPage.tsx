import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import OrderDetailDialog from '@/components/OrderDetailDialog'
import type { Order, OrderItem, OrderStatus, MenuItem, MenuResponse } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

const POLL_INTERVAL = 5000

type TabFilter = 'all' | OrderStatus

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  paid: 'bg-purple-100 text-purple-800 border-purple-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function itemUnitPrice(item: OrderItem): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

export default function DashboardPage() {
  const { t } = useTranslation('admin')
  const STORE_ID = useAuthStore(s => s.user!.storeId)

  const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
    pending: { label: t('common:status.pending'), color: STATUS_COLORS.pending },
    paid: { label: t('common:status.paid') || 'Paid', color: STATUS_COLORS.paid },
    preparing: { label: t('common:status.preparing'), color: STATUS_COLORS.preparing },
    completed: { label: t('common:status.completed'), color: STATUS_COLORS.completed },
    closed: { label: t('common:status.closed'), color: STATUS_COLORS.closed },
  }

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: t('dashboard.all') },
    { key: 'pending', label: t('common:status.pending') },
    { key: 'paid', label: t('common:status.paid') || 'Paid' },
    { key: 'preparing', label: t('common:status.preparing') },
    { key: 'completed', label: t('common:status.completed') },
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
  const [editItems, setEditItems] = useState<OrderItem[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  // Menu data for adding items
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [addItemId, setAddItemId] = useState<string>('')

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

  // ===== Edit order handlers =====

  const openEditDialog = async (order: Order) => {
    setEditingOrder(order)
    setEditItems(JSON.parse(JSON.stringify(order.items)))
    setAddItemId('')
    setEditDialogOpen(true)
    // Load menu for "add item" dropdown
    if (!menuData) {
      try {
        const menu = await api.getMenu(STORE_ID)
        setMenuData(menu)
      } catch (err) {
        console.error('Failed to load menu:', err)
      }
    }
  }

  const handleEditItemQuantity = (idx: number, delta: number) => {
    setEditItems(prev => {
      const items = [...prev]
      const newQty = items[idx].quantity + delta
      if (newQty <= 0) {
        return items.filter((_, i) => i !== idx)
      }
      items[idx] = { ...items[idx], quantity: newQty }
      return items
    })
  }

  const handleEditItemRemark = (idx: number, remark: string) => {
    setEditItems(prev => {
      const items = [...prev]
      items[idx] = { ...items[idx], remark: remark || undefined }
      return items
    })
  }

  const handleEditItemOption = (idx: number, optionId: string, choiceId: string) => {
    setEditItems(prev => {
      const items = [...prev]
      const item = items[idx]
      // Find the menu item to get the option/choice details
      const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
      if (!menuItem?.options) return prev
      const option = menuItem.options.find(o => o.id === optionId)
      const choice = option?.choices.find(c => c.id === choiceId)
      if (!option || !choice) return prev

      const currentOptions = [...(item.selectedOptions ?? [])]
      const existingIdx = currentOptions.findIndex(o => o.optionId === optionId)
      const newOpt = {
        optionId: option.id,
        optionName: option.name,
        choiceId: choice.id,
        choiceName: choice.name,
        priceAdjust: choice.priceAdjust,
      }
      if (existingIdx >= 0) {
        currentOptions[existingIdx] = newOpt
      } else {
        currentOptions.push(newOpt)
      }
      items[idx] = { ...items[idx], selectedOptions: currentOptions }
      return items
    })
  }

  const handleRemoveItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddItem = () => {
    if (!addItemId) return
    const menuItem = allMenuItems.find(m => m.id === addItemId)
    if (!menuItem) return
    setEditItems(prev => [
      ...prev,
      {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        selectedOptions: undefined,
      },
    ])
    setAddItemId('')
  }

  const handleSaveEdit = async () => {
    if (!editingOrder || editItems.length === 0) return
    setSavingEdit(true)
    try {
      await api.updateOrderItems(STORE_ID, editingOrder.id, editItems)
      setEditDialogOpen(false)
      setEditingOrder(null)
      await fetchOrders()
    } catch (err) {
      console.error('Failed to save order:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  const editTotal = editItems.reduce((sum, item) => sum + itemUnitPrice(item) * item.quantity, 0)

  // Flatten all menu items for the add-item dropdown
  const allMenuItems: MenuItem[] = menuData
    ? menuData.categories.flatMap(c => c.items)
    : []

  /** Check which items are missing required options. Returns list of {itemIdx, optionName}. */
  const getMissingRequired = (): { idx: number; optionName: string }[] => {
    const missing: { idx: number; optionName: string }[] = []
    editItems.forEach((item, idx) => {
      const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
      if (!menuItem?.options) return
      for (const opt of menuItem.options) {
        if (opt.required) {
          const hasChoice = item.selectedOptions?.some(o => o.optionId === opt.id)
          if (!hasChoice) {
            missing.push({ idx, optionName: opt.name })
          }
        }
      }
    })
    return missing
  }

  const missingRequired = getMissingRequired()
  const canSaveEdit = editItems.length > 0 && missingRequired.length === 0

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
          {updatingOrderId === order.id ? '...' : t('dashboard.startPreparing')}
        </Button>
      )
    }
    if (order.status === 'preparing') {
      return (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
          disabled={updatingOrderId === order.id}
          onClick={e => { e.stopPropagation(); handleStatusUpdate(order.id, 'completed') }}
        >
          {updatingOrderId === order.id ? '...' : t('dashboard.markComplete')}
        </Button>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold">{t('dashboard.title')}</h1>
          </div>
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
      <main className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
        {loading && orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('common:loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('dashboard.noOrders')}
          </div>
        ) : (
          orders.map((order) => {
            const config = STATUS_CONFIG[order.status]
            return (
              <Card
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(order)}
              >
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
                    <div className="flex items-center gap-2">
                      {order.status !== 'completed' && order.status !== 'closed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={e => { e.stopPropagation(); openEditDialog(order) }}
                        >
                          {t('dashboard.editOrder')}
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {timeAgo(order.createdAt)}
                      </span>
                    </div>
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

                <CardContent className="p-3 md:p-4 pt-3">
                  {/* Item list */}
                  <ul className="space-y-1 mb-3">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <div>
                          <span>{item.name}</span>
                          <span className="text-muted-foreground ml-1">
                            x{item.quantity}
                          </span>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <span className="text-xs text-orange-600 ml-1">
                              [{item.selectedOptions.map(o => o.choiceName).join(', ')}]
                            </span>
                          )}
                          {item.remark && (
                            <span className="text-xs text-orange-600 ml-2">
                              ({item.remark})
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatPriceUSD(itemUnitPrice(item) * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Total and action */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">
                      {t('common:total')}: {formatPriceUSD(order.totalPrice)}
                    </span>
                    {getActionButton(order)}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </main>

      {/* ===== Order Detail Dialog ===== */}
      <OrderDetailDialog
        order={detailOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusUpdate={handleStatusFromDetail}
        onEdit={handleEditFromDetail}
        updating={updatingOrderId === detailOrder?.id}
      />

      {/* ===== Edit Order Dialog ===== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('dashboard.editOrderTitle', { number: editingOrder?.orderNumber })}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {editingOrder?.tableName}
              </span>
            </DialogTitle>
          </DialogHeader>

          {editingOrder && (
            <div className="space-y-4">
              {/* Edit items */}
              <div className="space-y-3">
                {editItems.map((item, idx) => {
                  const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
                  return (
                    <div key={`${item.menuItemId}-${idx}`} className="border rounded-lg p-3 space-y-2">
                      {/* Name + quantity + remove */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatPriceUSD(itemUnitPrice(item))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => handleEditItemQuantity(idx, -1)}
                          >
                            -
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => handleEditItemQuantity(idx, 1)}
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            {t('common:delete')}
                          </Button>
                        </div>
                      </div>

                      {/* Options editing */}
                      {menuItem?.options && menuItem.options.length > 0 && (
                        <div className="space-y-1">
                          {menuItem.options.map(option => {
                            const currentChoice = item.selectedOptions?.find(o => o.optionId === option.id)
                            return (
                              <div key={option.id} className="flex items-center gap-2">
                                <span className={`text-xs w-14 shrink-0 ${
                                  option.required && !currentChoice ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                                }`}>
                                  {option.name}{option.required ? '*' : ''}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {option.choices.map(choice => (
                                    <button
                                      key={choice.id}
                                      onClick={() => handleEditItemOption(idx, option.id, choice.id)}
                                      className={`px-3 py-1.5 min-h-[36px] rounded text-xs border transition-colors ${
                                        currentChoice?.choiceId === choice.id
                                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      {choice.name}
                                      {choice.priceAdjust > 0 && (
                                        <span className="text-muted-foreground ml-0.5">+{formatPriceUSD(choice.priceAdjust)}</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Remark */}
                      <Input
                        value={item.remark ?? ''}
                        onChange={e => handleEditItemRemark(idx, e.target.value)}
                        placeholder={t('dashboard.remark')}
                        className="text-base h-9"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Add new item */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Select value={addItemId} onValueChange={setAddItemId}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder={t('dashboard.addDishPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allMenuItems.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} — {formatPriceUSD(m.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleAddItem} disabled={!addItemId}>
                  {t('dashboard.addDish')}
                </Button>
              </div>

              <Separator />

              {/* Missing required warning */}
              {missingRequired.length > 0 && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {t('dashboard.missingOptions')}
                  {missingRequired.map((m, i) => (
                    <span key={i} className="font-medium ml-1">
                      {editItems[m.idx]?.name}({m.optionName}){i < missingRequired.length - 1 ? '、' : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Total + save */}
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {t('common:total')}: {formatPriceUSD(editTotal)}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    {t('common:cancel')}
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={savingEdit || !canSaveEdit}>
                    {savingEdit ? t('common:saving') : t('dashboard.saveChanges')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
