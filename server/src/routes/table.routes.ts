import { Router } from 'express'
import { getTables, getTablePublic, enableTable, disableTable, updateTable, settleTable, closeTable, getNextAvailableNumber, regenerateTableId } from '../controllers/table.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router({ mergeParams: true })

// GET tables list (admin)
router.get('/', requireAuth, (req, res) => {
  const includeDisabled = req.query.includeDisabled === 'true'
  const tables = getTables(req.params.storeId, includeDisabled)
  res.json(tables)
})

// GET next available table number (admin)
router.get('/next-number', requireAuth, (req, res) => {
  const result = getNextAvailableNumber(req.params.storeId)
  res.json(result)
})

// GET single table (public — customer scan needs this)
router.get('/:tableId', (req, res) => {
  const result = getTablePublic(req.params.storeId as string, req.params.tableId as string)
  if (!result) {
    res.status(404).json({ error: 'Table not found' })
    return
  }
  res.json(result)
})

// POST enable table (admin) — replaces POST / (create)
router.post('/enable', requireAuth, (req, res) => {
  const { number, name, nameEn } = req.body
  if (!number || typeof number !== 'number') {
    res.status(400).json({ error: 'Table number is required' })
    return
  }
  const result = enableTable(req.params.storeId, number, name, nameEn)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

// PUT update table (admin) — unchanged
router.put('/:tableId', requireAuth, (req, res) => {
  const result = updateTable(req.params.storeId, req.params.tableId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST disable table (admin) — replaces DELETE /:tableId
router.post('/:tableId/disable', requireAuth, (req, res) => {
  const result = disableTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST regenerate QR code (admin) — new random ID, old QR stops working
router.post('/:tableId/regenerate-qr', requireAuth, (req, res) => {
  const result = regenerateTableId(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST settle table (admin) — unchanged
router.post('/:tableId/settle', requireAuth, (req, res) => {
  const result = settleTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST close table (admin) — unchanged
router.post('/:tableId/close', requireAuth, (req, res) => {
  const result = closeTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
