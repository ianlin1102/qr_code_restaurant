import { Router } from 'express'
import { createPaymentIntent, createPaymentIntentForSession } from '../controllers/payment.service.js'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/checkout
router.post('/', async (req, res) => {
  try {
    const { storeId } = req.params as { storeId: string }
    const { tableId, items, customerName, sessionId, amount, paidBy, tipAmount } = req.body

    // Pay for existing session (pay-later flow)
    if (sessionId) {
      const result = await createPaymentIntentForSession({
        storeId, sessionId, amount: amount ?? 0, paidBy, tipAmount,
      })
      if ('error' in result) {
        res.status(result.status ?? 400).json({ error: result.error })
        return
      }
      res.json(result)
      return
    }

    // New cart checkout (pay-first flow)
    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'tableId and items are required' })
      return
    }

    const result = await createPaymentIntent({ storeId, tableId, items, customerName, tipAmount })
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error })
      return
    }
    res.json(result)
  } catch (err) {
    console.error('[checkout] Error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Payment processing failed' })
  }
})

export default router
