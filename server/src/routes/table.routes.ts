import { Router } from 'express'
import { getTables, getTablePublic, enableTable, disableTable, updateTable, settleTable, closeTable, getNextAvailableNumber, regenerateTableId } from '../controllers/table.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import { sanitizeString, requireFiniteNumber } from '../lib/sanitize.js'

const router = Router({ mergeParams: true })

// GET tables list (admin)
router.get('/', requireAuth, requirePermission('tables:read'), (req, res) => {
  const includeDisabled = req.query.includeDisabled === 'true'
  const tables = getTables(req.params.storeId, includeDisabled)
  res.json(tables)
})

// GET next available table number (admin)
router.get('/next-number', requireAuth, requirePermission('tables:write'), (req, res) => {
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
router.post('/enable', requireAuth, requirePermission('tables:write'), (req, res) => {
  const { number, name, nameEn } = req.body
  const numResult = requireFiniteNumber(number, 'number')
  if ('error' in numResult) { res.status(400).json({ error: numResult.error }); return }
  if (numResult.value < 1) { res.status(400).json({ error: 'Table number must be >= 1' }); return }
  const safeName = name ? sanitizeString(name, 50) : undefined
  const safeNameEn = nameEn ? sanitizeString(nameEn, 50) : undefined
  const result = enableTable(req.params.storeId, numResult.value, safeName, safeNameEn)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

// PUT update table (admin) — unchanged
router.put('/:tableId', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = updateTable(req.params.storeId, req.params.tableId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST disable table (admin) — replaces DELETE /:tableId
router.post('/:tableId/disable', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = disableTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST regenerate QR code (admin) — new random ID, old QR stops working
router.post('/:tableId/regenerate-qr', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = regenerateTableId(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST settle table (admin) — unchanged
router.post('/:tableId/settle', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = settleTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

// POST close table (admin) — unchanged
router.post('/:tableId/close', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = closeTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
