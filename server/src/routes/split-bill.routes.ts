import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/split-bill.service.js'
import * as pay from '../controllers/split-bill-payment.service.js'
import { sanitizeAmount, sanitizeTip, sanitizePercent } from '../lib/sanitize.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

// All routes require auth
router.use(requireAuth)

// GET / — list split bills + main bill summary
router.get(
  '/', requirePermission('tables:read'),
  (req: Request, res: Response) => {
    const { storeId, sessionId } = req.params
    const splitBills = svc.getSplitBills(sessionId)
    const mainBill = svc.getMainBillSummary(sessionId, storeId)
    res.json({ splitBills, mainBill })
  },
)

// POST / — create split bill
router.post(
  '/', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const { storeId, sessionId } = req.params
    const { method, type, items, itemKeys, percent, label } = req.body
    const splitType = type || method
    const splitItemKeys = itemKeys || items
    if (!splitType || !['by-item', 'by-percent'].includes(splitType)) {
      res.status(400).json({ error: 'type must be by-item or by-percent' }); return
    }
    let sanitizedPercent = percent
    if (splitType === 'by-percent') {
      const pctResult = sanitizePercent(percent)
      if ('error' in pctResult) { res.status(400).json({ error: pctResult.error }); return }
      sanitizedPercent = pctResult.value
    }
    const result = svc.createSplitBill(storeId, sessionId, { type: splitType, itemKeys: splitItemKeys, percent: sanitizedPercent, label })
    if ('error' in result) { res.status(400).json(result); return }
    res.status(201).json(result)
  },
)

// DELETE /:splitBillId — delete unpaid split bill
router.delete(
  '/:splitBillId', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = svc.deleteSplitBill(req.params.storeId, req.params.splitBillId)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /:splitBillId/pay-card — pay by card (simple or manual capture)
router.post(
  '/:splitBillId/pay-card', requirePermission('tables:write'),
  async (req: Request, res: Response) => {
    const { storeId, splitBillId } = req.params
    const { tipAmount, captureMethod } = req.body

    if (captureMethod === 'manual') {
      const result = await pay.createManualCaptureIntent(storeId, splitBillId)
      if ('error' in result) { res.status(400).json(result); return }
      res.json(result); return
    }

    const tipResult = sanitizeTip(tipAmount)
    if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }

    const result = pay.paySplitBillCard(storeId, splitBillId, tipResult.value)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /:splitBillId/pay-cash — pay by cash
router.post(
  '/:splitBillId/pay-cash', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const rcvResult = sanitizeAmount(req.body.receivedAmount)
    if ('error' in rcvResult) { res.status(400).json({ error: rcvResult.error }); return }
    const tipResult = sanitizeTip(req.body.tipAmount)
    if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
    const result = pay.paySplitBillCash(
      req.params.storeId, req.params.splitBillId, rcvResult.value, tipResult.value,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /:splitBillId/capture — capture manual-capture payment with tip
router.post(
  '/:splitBillId/capture', requirePermission('tables:write'),
  async (req: Request, res: Response) => {
    const tipResult = sanitizeTip(req.body.tipAmount)
    if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
    const result = await pay.captureSplitBillPayment(
      req.params.storeId, req.params.splitBillId, tipResult.value,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

export default router
