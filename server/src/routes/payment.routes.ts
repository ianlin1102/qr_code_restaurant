import { Router } from 'express'
import { createCheckoutSession } from '../controllers/payment.service.js'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/orders/:orderId/checkout
router.post('/:orderId/checkout', async (req, res) => {
  try {
    const { storeId } = req.params as { storeId: string }
    const result = await createCheckoutSession(storeId, req.params.orderId)
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
