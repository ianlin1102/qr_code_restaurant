import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as billService from '../controllers/bill.service.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

// GET /bills?tableId= — get active bill for table
router.get('/', (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const tableId = req.query.tableId as string
  if (!tableId) { res.status(400).json({ error: 'tableId is required' }); return }

  const bill = billService.getActiveBill(storeId, tableId)
  if (!bill) { res.json(null); return }

  const splits = billService.getSplitsForBill(bill.id)
  res.json({ ...bill, splits })
})

// GET /bills/:billId
router.get('/:billId', (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const splits = billService.getSplitsForBill(bill.id)
  res.json({ ...bill, splits })
})

// POST /bills/:billId/splits — create splits
router.post('/:billId/splits', requireAuth, requirePermission('tables:write'), (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const { method, count, version } = req.body
  const result = billService.createSplits(req.params.billId, method, count, version)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// PATCH /bills/:billId/splits/:splitId — waiter marks split paid
router.patch('/:billId/splits/:splitId', requireAuth, requirePermission('tables:write'), (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const result = billService.markSplitPaid(req.params.splitId, 'waiter')
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /bills/:billId/apply-coupon — waiter applies coupon
router.post('/:billId/apply-coupon', requireAuth, requirePermission('billing:write'), (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const { couponId, couponCode, discountType, discountValue, version } = req.body
  const result = billService.applyCoupon(
    req.params.billId, couponId, couponCode, discountType, discountValue, version,
  )
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// DELETE /bills/:billId/coupon — remove coupon
router.delete('/:billId/coupon', requireAuth, requirePermission('billing:write'), (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const result = billService.removeCoupon(req.params.billId, req.body?.version)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /bills/:billId/settle — settle entire bill
router.post('/:billId/settle', requireAuth, requirePermission('tables:write'), (req: Request, res: Response) => {
  const bill = billService.getBillById(req.params.billId)
  if (!bill || bill.storeId !== req.params.storeId) { res.status(404).json({ error: 'Bill not found' }); return }

  const { paidBy, version } = req.body
  const result = billService.settleBillFull(req.params.billId, paidBy ?? 'waiter', version)
  if ('error' in result) { res.status(400).json(result); return }

  res.json(result)
})

export default router
