import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.service.js'
import { sanitizeString, requireFiniteNumber } from '../lib/sanitize.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requirePermission('billing:read'), (req, res) => {
  const coupons = getCoupons(req.params.storeId)
  res.json(coupons)
})

router.post('/', requireAuth, requirePermission('billing:write'), (req, res) => {
  const data = req.body
  if (data.code) data.code = sanitizeString(data.code, 30)
  if (data.discountValue != null) {
    const dvResult = requireFiniteNumber(data.discountValue, 'discountValue')
    if ('error' in dvResult) { res.status(400).json({ error: dvResult.error }); return }
    if (dvResult.value < 0) { res.status(400).json({ error: 'discountValue must be >= 0' }); return }
    data.discountValue = dvResult.value
  }
  if (data.minOrderAmount != null) {
    const moResult = requireFiniteNumber(data.minOrderAmount, 'minOrderAmount')
    if ('error' in moResult) { res.status(400).json({ error: moResult.error }); return }
    if (moResult.value < 0) data.minOrderAmount = 0
  }
  if (data.maxUses != null) {
    const muResult = requireFiniteNumber(data.maxUses, 'maxUses')
    if ('error' in muResult) { res.status(400).json({ error: muResult.error }); return }
    if (muResult.value < 0) data.maxUses = 0
  }
  const coupon = createCoupon(req.params.storeId, data)
  res.status(201).json(coupon)
})

router.put('/:couponId', requireAuth, requirePermission('billing:write'), (req, res) => {
  const data = req.body
  if (data.code) data.code = sanitizeString(data.code, 30)
  if (data.discountValue != null) {
    const dvResult = requireFiniteNumber(data.discountValue, 'discountValue')
    if ('error' in dvResult) { res.status(400).json({ error: dvResult.error }); return }
    if (dvResult.value < 0) { res.status(400).json({ error: 'discountValue must be >= 0' }); return }
    data.discountValue = dvResult.value
  }
  if (data.minOrderAmount != null) {
    const moResult = requireFiniteNumber(data.minOrderAmount, 'minOrderAmount')
    if ('error' in moResult) { res.status(400).json({ error: moResult.error }); return }
    if (moResult.value < 0) data.minOrderAmount = 0
  }
  if (data.maxUses != null) {
    const muResult = requireFiniteNumber(data.maxUses, 'maxUses')
    if ('error' in muResult) { res.status(400).json({ error: muResult.error }); return }
    if (muResult.value < 0) data.maxUses = 0
  }
  const result = updateCoupon(req.params.storeId, req.params.couponId, data)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

router.delete('/:couponId', requireAuth, requirePermission('billing:write'), (req, res) => {
  const result = deleteCoupon(req.params.storeId, req.params.couponId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

export default router
