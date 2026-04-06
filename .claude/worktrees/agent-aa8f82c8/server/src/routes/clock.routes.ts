import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import {
  verifyPin,
  clockIn,
  clockOut,
  getEntries,
} from '../controllers/clock.service.js'

const router = Router({ mergeParams: true })

// PIN-based auth (no JWT needed)
router.post('/pin', (req, res) => {
  const { pin } = req.body
  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ error: 'PIN is required' })
    return
  }
  const result = verifyPin(req.params.storeId, pin)
  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json(result)
})

router.post('/in', (req, res) => {
  const { pin } = req.body
  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ error: 'PIN is required' })
    return
  }
  const result = clockIn(req.params.storeId, pin)
  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(201).json(result)
})

router.post('/out', (req, res) => {
  const { pin } = req.body
  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ error: 'PIN is required' })
    return
  }
  const result = clockOut(req.params.storeId, pin)
  if ('error' in result) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json(result)
})

// Admin only — view time entries
router.get('/entries', requireAuth, requireRole('owner'), (req, res) => {
  const { userId, startDate, endDate } = req.query as Record<string, string>
  const entries = getEntries(req.params.storeId, { userId, startDate, endDate })
  res.json(entries)
})

export default router
