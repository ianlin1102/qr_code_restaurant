import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/split-bill.service.js'
import * as pay from '../controllers/split-bill-payment.service.js'
import { sanitizeAmount, sanitizeTip, sanitizePercent } from '../lib/sanitize.js'
import { executeSettlement, httpStatus } from '../settlement/gateway.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

// All routes require auth
router.use(requireAuth)

// GET / — list split bills + main bill summary
router.get(
  '/', requirePermission('tables:read'),
  (req: Request, res: Response) => {
    const { storeId, sessionId } = req.params
    const splits = svc.getSplitBills(sessionId)
    const mainBill = svc.getMainBillSummary(sessionId, storeId)
    res.json({ splits, mainBill })
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
    const result = executeSettlement(storeId, sessionId, {
      type: 'create-split', splitType, itemKeys: splitItemKeys, percent, label,
    })
    res.status(result.ok ? 201 : httpStatus((result as any).code)).json(result)
  },
)

// DELETE /:splitBillId — delete unpaid split bill
router.delete(
  '/:splitBillId', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'delete-split', splitBillId: req.params.splitBillId,
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// POST /:splitBillId/pay-card — pay by card (simple or manual capture)
router.post(
  '/:splitBillId/pay-card', requirePermission('tables:write'),
  async (req: Request, res: Response) => {
    const { storeId, splitBillId, sessionId } = req.params
    const { tipAmount, captureMethod } = req.body

    // Manual capture bypasses gateway (Stripe async flow)
    if (captureMethod === 'manual') {
      const result = await pay.createManualCaptureIntent(storeId, splitBillId)
      if ('error' in result) { res.status(400).json(result); return }
      res.json(result); return
    }

    const result = executeSettlement(storeId, sessionId, {
      type: 'pay-split-card', splitBillId, tipAmount,
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// POST /:splitBillId/pay-cash — pay by cash
router.post(
  '/:splitBillId/pay-cash', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'pay-split-cash',
      splitBillId: req.params.splitBillId,
      receivedAmount: req.body.receivedAmount,
      tipAmount: req.body.tipAmount,
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
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
