import { Router } from 'express'
import { createOrder, getOrders, updateOrderStatus, updateOrderItems } from '../controllers/order.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import type { OrderStatus } from '@qr-order/shared'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/orders (public — customer creates order)
router.post('/', (req, res) => {
  const result = createOrder(req.params.storeId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

router.get('/', (req, res) => {
  const status = req.query.status as OrderStatus | undefined
  const tableId = req.query.tableId as string | undefined
  const orders = getOrders(req.params.storeId, status, tableId)
  res.json(orders)
})

// PATCH (admin only)
router.patch('/:orderId/status', requireAuth, (req, res) => {
  const result = updateOrderStatus(req.params.storeId, req.params.orderId, req.body.status)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

// PUT /api/stores/:storeId/orders/:orderId/items (admin only)
router.put('/:orderId/items', requireAuth, (req, res) => {
  const result = updateOrderItems(req.params.storeId, req.params.orderId, req.body.items)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
