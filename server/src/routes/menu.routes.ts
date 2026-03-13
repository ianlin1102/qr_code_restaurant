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
} from '../controllers/menu.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

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

// GET /api/stores/:storeId/menu/items — all items (including unavailable)
router.get('/items', requireAuth, (req, res) => {
  const items = getAllMenuItems(req.params.storeId)
  res.json(items)
})

// POST /api/stores/:storeId/menu/items
router.post('/items', requireAuth, (req, res) => {
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
  res.status(201).json(item)
})

// PUT /api/stores/:storeId/menu/items/:itemId
router.put('/items/:itemId', requireAuth, (req, res) => {
  const updated = updateMenuItem(req.params.itemId, req.body)
  if (!updated) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  res.json(updated)
})

// DELETE /api/stores/:storeId/menu/items/:itemId
router.delete('/items/:itemId', requireAuth, (req, res) => {
  const ok = deleteMenuItem(req.params.itemId)
  if (!ok) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  res.status(204).end()
})

// ===== Admin: Categories =====

// GET /api/stores/:storeId/menu/categories (admin)
router.get('/categories', requireAuth, (req, res) => {
  const cats = getCategories(req.params.storeId)
  res.json(cats)
})

// POST /api/stores/:storeId/menu/categories
router.post('/categories', requireAuth, (req, res) => {
  const { name, nameEn, sortOrder } = req.body
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const cat = createCategory(req.params.storeId, name, sortOrder ?? 0, nameEn)
  res.status(201).json(cat)
})

// PUT /api/stores/:storeId/menu/categories/:catId
router.put('/categories/:catId', requireAuth, (req, res) => {
  const updated = updateCategory(req.params.catId, req.body)
  if (!updated) {
    res.status(404).json({ error: 'Category not found' })
    return
  }
  res.json(updated)
})

// DELETE /api/stores/:storeId/menu/categories/:catId
router.delete('/categories/:catId', requireAuth, (req, res) => {
  const ok = deleteCategory(req.params.catId)
  if (!ok) {
    res.status(404).json({ error: 'Category not found' })
    return
  }
  res.status(204).end()
})

export default router
