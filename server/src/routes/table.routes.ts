import { Router } from 'express'
import { getTables, getTableById, createTable, updateTable, deleteTable, settleTable, closeTable } from '../controllers/table.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router({ mergeParams: true })

// GET tables list (admin)
router.get('/', requireAuth, (req, res) => {
  const tables = getTables(req.params.storeId)
  res.json(tables)
})

// GET single table (public — customer scan needs this)
router.get('/:tableId', (req, res) => {
  const table = getTableById(req.params.tableId)
  if (!table || table.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Table not found' })
    return
  }
  res.json(table)
})

// POST create table (admin)
router.post('/', requireAuth, (req, res) => {
  const result = createTable(req.params.storeId, req.body.name, req.body.nameEn)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

router.put('/:tableId', requireAuth, (req, res) => {
  const result = updateTable(req.params.storeId, req.params.tableId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

router.delete('/:tableId', requireAuth, (req, res) => {
  const result = deleteTable(req.params.storeId, req.params.tableId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(204).end()
})

router.post('/:tableId/settle', requireAuth, (req, res) => {
  const result = settleTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

router.post('/:tableId/close', requireAuth, (req, res) => {
  const result = closeTable(req.params.storeId, req.params.tableId)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

export default router
