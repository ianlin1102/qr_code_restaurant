import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  getWaitlist,
  addEntry,
  updateEntry,
  removeEntry,
  seatEntry,
} from '../controllers/waitlist.service.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, (req, res) => {
  const entries = getWaitlist(req.params.storeId)
  res.json(entries)
})

router.post('/', requireAuth, (req, res) => {
  const { name, partySize, phone } = req.body
  if (!name || !partySize) {
    res.status(400).json({ error: 'name and partySize are required' })
    return
  }
  const entry = addEntry(req.params.storeId, { name, partySize, phone })
  res.status(201).json(entry)
})

router.patch('/:entryId', requireAuth, (req, res) => {
  const result = updateEntry(req.params.storeId, req.params.entryId, req.body)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

router.delete('/:entryId', requireAuth, (req, res) => {
  const result = removeEntry(req.params.storeId, req.params.entryId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

router.post('/:entryId/seat', requireAuth, (req, res) => {
  const result = seatEntry(req.params.storeId, req.params.entryId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
