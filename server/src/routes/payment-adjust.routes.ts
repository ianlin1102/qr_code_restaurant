import { Router } from 'express'
import { adjustPaymentTip } from '../controllers/payment-adjust.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'

const router = Router({ mergeParams: true })

// PATCH /api/stores/:storeId/payments/:paymentId/tip  body: { tipAmount: number }
router.patch('/:paymentId/tip', requireAuth, requirePermission('billing:write'), (req, res) => {
  const tipAmount = Number(req.body?.tipAmount)
  const result = adjustPaymentTip(req.params.storeId, req.params.paymentId, tipAmount)
  if ('error' in result) {
    res.status(result.status ?? 400).json({ error: result.error })
    return
  }
  res.json(result)
})

export default router
