import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/split-bill.service.js'
import * as pay from '../controllers/split-bill-payment.service.js'
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
    const { method, items, percent, label } = req.body
    if (!method || !['by-item', 'by-percent'].includes(method)) {
      res.status(400).json({ error: 'method must be by-item or by-percent' }); return
    }
    const result = svc.createSplitBill(storeId, sessionId, { method, items, percent, label })
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

    const result = pay.paySplitBillCard(storeId, splitBillId, tipAmount)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /:splitBillId/pay-cash — pay by cash
router.post(
  '/:splitBillId/pay-cash', requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const { receivedAmount, tipAmount } = req.body
    if (typeof receivedAmount !== 'number' || receivedAmount <= 0) {
      res.status(400).json({ error: 'receivedAmount required' }); return
    }
    const result = pay.paySplitBillCash(
      req.params.storeId, req.params.splitBillId, receivedAmount, tipAmount,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /:splitBillId/capture — capture manual-capture payment with tip
router.post(
  '/:splitBillId/capture', requirePermission('tables:write'),
  async (req: Request, res: Response) => {
    const { tipAmount } = req.body
    if (typeof tipAmount !== 'number' || tipAmount < 0) {
      res.status(400).json({ error: 'tipAmount required (>= 0)' }); return
    }
    const result = await pay.captureSplitBillPayment(
      req.params.storeId, req.params.splitBillId, tipAmount,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

export default router
