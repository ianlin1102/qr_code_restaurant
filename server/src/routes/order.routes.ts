import { Router } from 'express'
import { createOrder, getOrders, updateOrderStatus, updateOrderItems, transferOrder, deleteOrder, voidItem } from '../controllers/order.service.js'
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import { sanitizeString } from '../lib/sanitize.js'
import type { OrderStatus } from '@qr-order/shared'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/orders (public — customer creates order)
router.post('/', (req, res) => {
  if (req.body.items && Array.isArray(req.body.items)) {
    for (const item of req.body.items) {
      if (item.remark) item.remark = sanitizeString(item.remark, 200)
    }
  }
  if (req.body.customerName) {
    req.body.customerName = sanitizeString(req.body.customerName, 50)
  }
  const result = createOrder(req.params.storeId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

// GET /api/stores/:storeId/orders
// - With tableId: public (customer sees own table orders)
// - Without tableId: requires orders:read (admin sees all orders)
router.get('/', optionalAuth, (req, res) => {
  const status = req.query.status as OrderStatus | undefined
  const tableId = req.query.tableId as string | undefined

  if (!tableId && !req.user) {
    res.status(400).json({ error: 'tableId is required' })
    return
  }
  if (!tableId && req.user && !req.user.permissions?.includes('orders:read')) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return
  }

  const orders = getOrders(req.params.storeId, status, tableId)

  res.json(orders)
})

// PATCH (admin only)
router.patch('/:orderId/status', requireAuth, requirePermission('orders:write'), (req, res) => {
  const result = updateOrderStatus(req.params.storeId, req.params.orderId, req.body.status)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

// POST /api/stores/:storeId/orders/:orderId/transfer (admin only)
router.post('/:orderId/transfer', requireAuth, requirePermission('orders:write'), (req, res) => {
  const { targetTableId } = req.body
  if (!targetTableId) {
    res.status(400).json({ error: 'targetTableId is required' })
    return
  }
  const result = transferOrder(req.params.storeId, req.params.orderId, targetTableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// DELETE /api/stores/:storeId/orders/:orderId (admin only)
router.delete('/:orderId', requireAuth, requirePermission('orders:write'), (req, res) => {
  const result = deleteOrder(req.params.storeId, req.params.orderId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// PUT /api/stores/:storeId/orders/:orderId/items (admin only)
router.put('/:orderId/items', requireAuth, requirePermission('orders:write'), async (req, res) => {
  const result = await updateOrderItems(req.params.storeId, req.params.orderId, req.body.items)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// PATCH /api/stores/:storeId/orders/:orderId/items/:itemIndex/void (admin only)
router.patch('/:orderId/items/:itemIndex/void', requireAuth, requirePermission('orders:write'), (req, res) => {
  const itemIndex = parseInt(req.params.itemIndex, 10)
  if (isNaN(itemIndex)) { res.status(400).json({ error: 'Invalid item index' }); return }
  const result = voidItem(
    req.params.storeId,
    req.params.orderId,
    itemIndex,
    (req as any).user?.userId ?? 'unknown',
    req.body.reason,
  )
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

export default router
