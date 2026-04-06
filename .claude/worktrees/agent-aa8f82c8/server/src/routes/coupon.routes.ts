import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.service.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, (req, res) => {
  const coupons = getCoupons(req.params.storeId)
  res.json(coupons)
})

router.post('/', requireAuth, (req, res) => {
  const coupon = createCoupon(req.params.storeId, req.body)
  res.status(201).json(coupon)
})

router.put('/:couponId', requireAuth, (req, res) => {
  const result = updateCoupon(req.params.storeId, req.params.couponId, req.body)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

router.delete('/:couponId', requireAuth, (req, res) => {
  const result = deleteCoupon(req.params.storeId, req.params.couponId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

export default router
