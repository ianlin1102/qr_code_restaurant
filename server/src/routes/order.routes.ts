import { Router } from 'express'
import { createOrder, getOrders, updateOrderStatus } from '../services/order.service.js'
import type { OrderStatus } from '@qr-order/shared'

const router = Router({ mergeParams: true })

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
  const orders = getOrders(req.params.storeId, status)
  res.json(orders)
})

router.patch('/:orderId/status', (req, res) => {
  const result = updateOrderStatus(req.params.storeId, req.params.orderId, req.body.status)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

export default router
