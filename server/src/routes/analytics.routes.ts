import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import { getAnalytics } from '../controllers/analytics.service.js'

const router = Router({ mergeParams: true })

// GET /api/stores/:storeId/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', requireAuth, requirePermission('analytics:read'), (req, res) => {
  const { storeId } = req.params
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined
  const data = getAnalytics(storeId, startDate, endDate)
  res.json(data)
})

export default router
