import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/session.service.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

// GET /sessions?tableId= — get active session for table
router.get('/', (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const tableId = req.query.tableId as string
  if (!tableId) { res.status(400).json({ error: 'tableId required' }); return }
  const session = svc.getActiveSession(storeId, tableId)
  if (!session) { res.json(null); return }
  const summary = svc.getSessionSummary(storeId, session.id)
  res.json(summary)
})

// GET /sessions/:sessionId/summary
router.get('/:sessionId/summary', (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const summary = svc.getSessionSummary(storeId, req.params.sessionId)
  if (!summary) { res.status(404).json({ error: 'Session not found' }); return }
  res.json(summary)
})

// GET /sessions/:sessionId/cart — get shared cart items (unauthenticated, customers use this)
router.get('/:sessionId/cart', (req: Request, res: Response) => {
  const items = svc.getSessionCart(req.params.sessionId)
  res.json(items)
})

// PUT /sessions/:sessionId/cart — update shared cart (unauthenticated, customers use this)
router.put('/:sessionId/cart', (req: Request, res: Response) => {
  const { items } = req.body
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items array required' }); return }
  svc.updateSessionCart(req.params.sessionId, items)
  res.json({ ok: true })
})

// PATCH /sessions/:sessionId/close
router.patch(
  '/:sessionId/close',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = svc.closeSession(req.params.storeId, req.params.sessionId)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// PATCH /sessions/:sessionId/reopen
router.patch(
  '/:sessionId/reopen',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = svc.reopenSession(req.params.storeId, req.params.sessionId)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /sessions/:sessionId/payments — record a payment
router.post(
  '/:sessionId/payments',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const { amount, paidBy, stripePaymentIntentId } = req.body
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'amount required' }); return
    }
    const result = svc.addPayment(
      req.params.storeId, req.params.sessionId,
      amount, paidBy, stripePaymentIntentId,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// POST /sessions/:sessionId/apply-coupon
router.post(
  '/:sessionId/apply-coupon',
  requireAuth, requirePermission('billing:write'),
  (req: Request, res: Response) => {
    const { couponId, couponCode, discountType, discountValue } = req.body
    const result = svc.applyCoupon(
      req.params.storeId, req.params.sessionId,
      couponId, couponCode, discountType, discountValue,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

// DELETE /sessions/:sessionId/coupon
router.delete(
  '/:sessionId/coupon',
  requireAuth, requirePermission('billing:write'),
  (req: Request, res: Response) => {
    const result = svc.removeCoupon(req.params.storeId, req.params.sessionId)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

export default router
