import { Router } from 'express'
import { getStore, updateStore } from '../controllers/store.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router({ mergeParams: true })

// GET /api/stores/:storeId (public — customer needs store info)
router.get('/', (req, res) => {
  const store = getStore(req.params.storeId)
  if (!store) return res.status(404).json({ error: 'Store not found' })
  res.json(store)
})

// PUT /api/stores/:storeId (admin only)
router.put('/', requireAuth, (req, res) => {
  const result = updateStore(req.params.storeId, req.body)
  if ('error' in result) return res.status(400).json(result)
  res.json(result)
})

export default router
