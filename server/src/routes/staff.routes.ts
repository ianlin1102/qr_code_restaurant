import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import {
  getStaff,
  addStaff,
  changeRole,
  removeStaff,
} from '../controllers/staff.service.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requirePermission('staff:manage'), async (req, res) => {
  const staff = await getStaff(req.params.storeId)
  res.json(staff)
})

router.post('/', requireAuth, requirePermission('staff:manage'), async (req, res) => {
  const { username, password, role, clockPin } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' })
    return
  }
  const result = await addStaff(req.params.storeId, username, password, role || 'staff', clockPin)
  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(201).json(result)
})

router.patch('/:userId', requireAuth, requirePermission('staff:manage'), async (req, res) => {
  const { role, clockPin } = req.body
  if (!role && clockPin === undefined) {
    res.status(400).json({ error: 'role or clockPin is required' })
    return
  }
  let result
  if (role) {
    result = await changeRole(req.params.storeId, req.params.userId, role)
    if ('error' in result) { res.status(result.status).json({ error: result.error }); return }
  }
  if (clockPin !== undefined) {
    const { updateClockPin } = await import('../controllers/staff.service.js')
    const pinResult = updateClockPin(req.params.storeId, req.params.userId, clockPin)
    if ('error' in pinResult) { res.status(pinResult.status).json({ error: pinResult.error }); return }
    result = pinResult
  }
  res.json(result)
})

router.delete('/:userId', requireAuth, requirePermission('staff:manage'), async (req, res) => {
  const result = await removeStaff(req.params.storeId, req.params.userId)
  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(204).end()
})

export default router
