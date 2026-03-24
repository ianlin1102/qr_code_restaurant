import { Router } from 'express'
import { createOrder, getOrders, updateOrderStatus, updateOrderItems, transferOrder } from '../controllers/order.service.js'
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js'
import type { OrderStatus, Order } from '@qr-order/shared'

const router = Router({ mergeParams: true })

function stripSensitive({ paymentIntentId, ...rest }: Order) { return rest }

// POST /api/stores/:storeId/orders (public — customer creates order)
router.post('/', (req, res) => {
  const result = createOrder(req.params.storeId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(stripSensitive(result))
})

// GET /api/stores/:storeId/orders
// - Authenticated (admin): full access, optional filters
// - Unauthenticated (customer): must provide tableId, sensitive fields stripped
router.get('/', optionalAuth, (req, res) => {
  const status = req.query.status as OrderStatus | undefined
  const tableId = req.query.tableId as string | undefined

  if (!req.user && !tableId) {
    res.status(400).json({ error: 'tableId is required' })
    return
  }

  const orders = getOrders(req.params.storeId, status, tableId)

  res.json(orders.map(stripSensitive))
})

// PATCH (admin only)
router.patch('/:orderId/status', requireAuth, (req, res) => {
  const result = updateOrderStatus(req.params.storeId, req.params.orderId, req.body.status)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(stripSensitive(result))
})

// POST /api/stores/:storeId/orders/:orderId/transfer (admin only)
router.post('/:orderId/transfer', requireAuth, (req, res) => {
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
  res.json(stripSensitive(result))
})

// PUT /api/stores/:storeId/orders/:orderId/items (admin only)
router.put('/:orderId/items', requireAuth, (req, res) => {
  const result = updateOrderItems(req.params.storeId, req.params.orderId, req.body.items)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(stripSensitive(result))
})

export default router
