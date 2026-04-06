import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import { sanitizeString, sanitizeQuantity } from '../lib/sanitize.js'
import {
  getWaitlist,
  addEntry,
  updateEntry,
  removeEntry,
  seatEntry,
} from '../controllers/waitlist.service.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requirePermission('waitlist:read'), (req, res) => {
  const entries = getWaitlist(req.params.storeId)
  res.json(entries)
})

router.post('/', requireAuth, requirePermission('waitlist:write'), (req, res) => {
  const safeName = sanitizeString(req.body.name, 50)
  const sizeResult = sanitizeQuantity(req.body.partySize)
  if (!safeName) { res.status(400).json({ error: 'name is required' }); return }
  if ('error' in sizeResult) { res.status(400).json({ error: sizeResult.error }); return }
  const phone = req.body.phone ? sanitizeString(req.body.phone, 20) : undefined
  const entry = addEntry(req.params.storeId, { name: safeName, partySize: sizeResult.value, phone })
  res.status(201).json(entry)
})

router.patch('/:entryId', requireAuth, requirePermission('waitlist:write'), (req, res) => {
  const result = updateEntry(req.params.storeId, req.params.entryId, req.body)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

router.delete('/:entryId', requireAuth, requirePermission('waitlist:write'), (req, res) => {
  const result = removeEntry(req.params.storeId, req.params.entryId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

router.post('/:entryId/seat', requireAuth, requirePermission('waitlist:write'), (req, res) => {
  const result = seatEntry(req.params.storeId, req.params.entryId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
