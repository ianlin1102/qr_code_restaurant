import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as svc from '../controllers/session.service.js'
import { createOrder } from '../controllers/order.service.js'
import { sanitizeAmount, sanitizeTip, sanitizePercent, sanitizeString } from '../lib/sanitize.js'
import { executeSettlement, httpStatus } from '../settlement/gateway.js'
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
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const items = svc.getSessionCart(req.params.sessionId)
  res.json({
    items,
    cartVersion: session?.cartVersion ?? 0,
    lastCartSubmitAt: session?.lastCartSubmitAt ?? null,
  })
})

// PUT /sessions/:sessionId/cart — update this device's cart slice (unauthenticated, customers use this)
router.put('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const { items } = req.body
  const deviceId = sanitizeString(req.body.deviceId, 64)
  if (!deviceId) { res.status(400).json({ error: 'deviceId required' }); return }
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items array required' }); return }
  svc.updateDeviceCart(req.params.sessionId, deviceId, items)
  res.json({ ok: true })
})

// POST /sessions/:sessionId/submit-cart — atomically submit shared cart as order
router.post('/:sessionId/submit-cart', (req: Request, res: Response) => {
  const { cartVersion, customerName } = req.body
  if (cartVersion == null || typeof cartVersion !== 'number') {
    res.status(400).json({ error: 'cartVersion is required' }); return
  }
  const result = svc.submitSessionCart(req.params.storeId, req.params.sessionId, cartVersion)
  if ('error' in result) {
    res.status(result.status ?? 400).json({ error: result.error }); return
  }
  if (result.paymentMode === 'pay-later') {
    const orderItems = result.items.map(i => ({
      menuItemId: i.menuItemId, quantity: i.quantity,
      ...(i.remark ? { remark: i.remark } : {}),
      ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
    }))
    const order = createOrder(req.params.storeId, {
      tableId: result.tableId, items: orderItems, customerName,
    })
    if ('error' in order) { res.status(400).json({ error: order.error }); return }
    res.json({ order, paymentMode: 'pay-later' }); return
  }
  res.json({ items: result.items, paymentMode: 'pay-first', tableId: result.tableId })
})

// PATCH /sessions/:sessionId/start-settlement — customer sets mode
router.patch('/:sessionId/start-settlement', (req: Request, res: Response) => {
  const { mode } = req.body
  if (!mode || !['by-item', 'by-percent'].includes(mode)) {
    res.status(400).json({ error: 'mode must be by-item or by-percent' }); return
  }
  const result = svc.startSettlement(req.params.storeId, req.params.sessionId, mode)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /sessions/:sessionId/pay-items — customer pays specific items
router.post('/:sessionId/pay-items', (req: Request, res: Response) => {
  const result = executeSettlement(req.params.storeId, req.params.sessionId, {
    type: 'pay-items', itemKeys: req.body.itemKeys,
  })
  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
})

// POST /sessions/:sessionId/pay-percent — customer pays a percentage
router.post('/:sessionId/pay-percent', (req: Request, res: Response) => {
  const result = executeSettlement(req.params.storeId, req.params.sessionId, {
    type: 'pay-percent', percent: req.body.percent,
  })
  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
})

// POST /sessions/:sessionId/cash-payment — admin records cash payment
router.post(
  '/:sessionId/cash-payment',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'cash-payment', amount: req.body.amount, receivedAmount: req.body.receivedAmount,
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// PATCH /sessions/:sessionId/close
router.patch(
  '/:sessionId/close',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'close-session',
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// PATCH /sessions/:sessionId/reopen
router.patch(
  '/:sessionId/reopen',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'reopen-session',
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// POST /sessions/:sessionId/payments — record a payment
router.post(
  '/:sessionId/payments',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const result = executeSettlement(req.params.storeId, req.params.sessionId, {
      type: 'add-payment',
      amount: req.body.amount,
      paidBy: req.body.paidBy || 'customer',
      tipAmount: req.body.tipAmount,
      stripePaymentIntentId: req.body.stripePaymentIntentId,
    })
    res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
  },
)

// POST /sessions/:sessionId/apply-coupon
router.post(
  '/:sessionId/apply-coupon',
  requireAuth, requirePermission('coupons:write'),
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
  requireAuth, requirePermission('coupons:write'),
  (req: Request, res: Response) => {
    const result = svc.removeCoupon(req.params.storeId, req.params.sessionId)
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)

export default router
