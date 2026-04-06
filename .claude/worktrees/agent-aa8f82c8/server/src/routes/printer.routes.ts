import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { getPrinterConfig, updatePrinterConfig, reprintOrder } from '../controllers/printer.service.js'
import { orderStore } from '../controllers/order.service.js'

const router = Router({ mergeParams: true })

// GET /api/stores/:storeId/printer/config
router.get('/config', requireAuth, (req, res) => {
  const config = getPrinterConfig(req.params.storeId)
  if (!config) {
    res.json({ enabled: false })
    return
  }
  res.json(config)
})

// PUT /api/stores/:storeId/printer/config
router.put('/config', requireAuth, (req, res) => {
  const config = updatePrinterConfig(req.params.storeId, req.body)
  res.json(config)
})

// POST /api/stores/:storeId/printer/print/:orderId
router.post('/print/:orderId', requireAuth, async (req, res) => {
  const order = orderStore.getById(req.params.orderId)
  if (!order || order.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  const success = await reprintOrder(order)
  res.json({ success })
})

export default router
