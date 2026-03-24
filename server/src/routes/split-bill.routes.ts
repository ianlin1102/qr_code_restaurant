import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { createSplitBill } from '../controllers/split-bill.service.js'

const router = Router({ mergeParams: true })

router.post('/', requireAuth, async (req, res) => {
  const result = await createSplitBill(req.params.storeId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
