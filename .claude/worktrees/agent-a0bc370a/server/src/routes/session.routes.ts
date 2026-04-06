import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/session.service.js'
import { createOrder } from '../controllers/order.service.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

// POST /sessions — create session for table (idempotent: returns existing if active)
router.post('/', (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const { tableId } = req.body
  if (!tableId) { res.status(400).json({ error: 'tableId required' }); return }
  // Return existing active session if one exists (idempotent)
  const existing = svc.getActiveSession(storeId, tableId)
  if (existing) { res.json(existing); return }
  const session = svc.createSession(storeId, tableId)
  res.status(201).json(session)
})

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

// GET /sessions/:sessionId/cart — get shared cart items + version (unauthenticated, customers use this)
router.get('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
  const items = svc.getSessionCart(req.params.sessionId)
  res.json({
    items,
    cartVersion: session?.cartVersion ?? 0,
    lastCartSubmitAt: session?.lastCartSubmitAt ?? null,
  })
})

// PUT /sessions/:sessionId/cart — update shared cart (unauthenticated, customers use this)
router.put('/:sessionId/cart', (req: Request, res: Response) => {
  const { items } = req.body
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items array required' }); return }
  svc.updateSessionCart(req.params.sessionId, items)
  res.json({ ok: true })
})

// POST /sessions/:sessionId/submit-cart — atomically submit shared cart as order
router.post('/:sessionId/submit-cart', (req: Request, res: Response) => {
  const { cartVersion, customerName } = req.body
  if (cartVersion == null || typeof cartVersion !== 'number') {
    res.status(400).json({ error: 'cartVersion is required' }); return
  }
  const result = svc.submitSessionCart(
    req.params.storeId, req.params.sessionId, cartVersion, customerName,
  )
  if ('error' in result) {
    res.status(result.status ?? 400).json({ error: result.error }); return
  }
  // For pay-later: create the order from the merged cart items
  if (result.paymentMode === 'pay-later') {
    const orderItems = result.items.map(i => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      ...(i.remark ? { remark: i.remark } : {}),
      ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
    }))
    const order = createOrder(req.params.storeId, {
      tableId: result.tableId, items: orderItems, customerName,
    })
    if ('error' in order) {
      res.status(400).json({ error: order.error }); return
    }
    res.json({ order, paymentMode: 'pay-later' }); return
  }
  // For pay-first: return items so client can create Stripe PaymentIntent
  res.json({ items: result.items, paymentMode: 'pay-first', tableId: result.tableId })
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
