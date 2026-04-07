import { Router } from 'express'
import { getStore, updateStore } from '../controllers/store.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'

const router = Router({ mergeParams: true })

// GET /api/stores/:storeId (public with limited fields, admin gets full)
router.get('/', (req, res) => {
  const store = getStore(req.params.storeId)
  if (!store) return res.status(404).json({ error: 'Store not found' })
  // If authenticated admin, return full store object
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    res.json(store)
    return
  }
  // Public: strip internal fields
  const { autoAcceptOrders, createdAt, updatedAt, ...publicStore } = store
  res.json(publicStore)
})

// PUT /api/stores/:storeId (admin only)
router.put('/', requireAuth, requirePermission('settings:write'), (req, res) => {
  const result = updateStore(req.params.storeId, req.body)
  if ('error' in result) return res.status(400).json(result)
  res.json(result)
})

export default router
