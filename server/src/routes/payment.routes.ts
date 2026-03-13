import { Router } from 'express'
import { createPaymentIntent } from '../controllers/payment.service.js'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/checkout
// Receives cart items, creates Stripe PaymentIntent only (no order)
router.post('/', async (req, res) => {
  try {
    const { storeId } = req.params as { storeId: string }
    const { tableId, items, customerName } = req.body

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'tableId and items are required' })
      return
    }

    const result = await createPaymentIntent({ storeId, tableId, items, customerName })
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error })
      return
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Payment processing failed' })
  }
})

export default router
