import { Router } from 'express'
import {
  getMenu,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  batchImportMenuItems,
} from '../controllers/menu.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'

const router = Router({ mergeParams: true })

// GET /api/stores/:storeId/menu — customer menu (public)
router.get('/', (req, res) => {
  const menu = getMenu(req.params.storeId)
  if (!menu) {
    res.status(404).json({ error: 'Store not found' })
    return
  }
  res.json(menu)
})

// ===== Admin: Menu Items (all protected) =====

// POST /api/stores/:storeId/menu/items/batch — bulk import menu items
router.post('/items/batch', requireAuth, requirePermission('menu:write'), (req, res) => {
  const { items } = req.body
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items array is required' })
    return
  }
  if (items.length > 500) {
    res.status(400).json({ error: 'Maximum 500 items per import' })
    return
  }
  const result = batchImportMenuItems(req.params.storeId as string, items)
  res.json(result)
})

// GET /api/stores/:storeId/menu/items — all items (including unavailable)
router.get('/items', requireAuth, requirePermission('menu:read'), (req, res) => {
  const items = getAllMenuItems(req.params.storeId)
  res.json(items)
})

// POST /api/stores/:storeId/menu/items
router.post('/items', requireAuth, requirePermission('menu:write'), (req, res) => {
  const { storeId } = req.params
  const { categoryId, name, nameEn, description, descriptionEn, price, image, available, sortOrder, options } = req.body
  if (!categoryId || !name || price == null) {
    res.status(400).json({ error: 'categoryId, name, and price are required' })
    return
  }
  const item = createMenuItem(storeId, {
    categoryId,
    name,
    nameEn,
    description,
    descriptionEn,
    price,
    image,
    available: available ?? true,
    sortOrder: sortOrder ?? 0,
    options,
  })
  if ('error' in item) { res.status(400).json(item); return }
  res.status(201).json(item)
})

// PUT /api/stores/:storeId/menu/items/:itemId
router.put('/items/:itemId', requireAuth, requirePermission('menu:write'), (req, res) => {
  const result = updateMenuItem(req.params.storeId, req.params.itemId, req.body)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

// DELETE /api/stores/:storeId/menu/items/:itemId
router.delete('/items/:itemId', requireAuth, requirePermission('menu:write'), (req, res) => {
  const result = deleteMenuItem(req.params.storeId, req.params.itemId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

// ===== Admin: Categories =====

// GET /api/stores/:storeId/menu/categories (admin)
router.get('/categories', requireAuth, requirePermission('menu:read'), (req, res) => {
  const cats = getCategories(req.params.storeId)
  res.json(cats)
})

// POST /api/stores/:storeId/menu/categories
router.post('/categories', requireAuth, requirePermission('menu:write'), (req, res) => {
  const { name, nameEn, sortOrder } = req.body
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const cat = createCategory(req.params.storeId, name, sortOrder ?? 0, nameEn)
  res.status(201).json(cat)
})

// PUT /api/stores/:storeId/menu/categories/:catId
router.put('/categories/:catId', requireAuth, requirePermission('menu:write'), (req, res) => {
  const result = updateCategory(req.params.storeId, req.params.catId, req.body)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

// DELETE /api/stores/:storeId/menu/categories/:catId
router.delete('/categories/:catId', requireAuth, requirePermission('menu:write'), (req, res) => {
  const result = deleteCategory(req.params.storeId, req.params.catId)
  if (typeof result === 'object' && 'error' in result) {
    res.status(404).json(result)
    return
  }
  res.status(204).end()
})

export default router
