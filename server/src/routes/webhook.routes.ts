import { Router } from 'express'
import { handleWebhookEvent } from '../controllers/payment.service.js'
import logger from '../lib/logger.js'

const router = Router()

// POST /api/webhook/stripe
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  try {
    const eventType = await handleWebhookEvent(req.body as Buffer, signature)
    logger.info({ eventType }, 'stripe webhook processed')
    res.json({ received: true })
  } catch (err) {
    logger.error({ err }, 'stripe webhook verification failed')
    res.status(400).json({ error: 'Webhook verification failed' })
  }
})

export default router
