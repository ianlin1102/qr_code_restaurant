import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { Store, Category, MenuItem, MenuResponse } from '@qr-order/shared'

const storeStore = new JsonStore<Store>('stores.json')
const categoryStore = new JsonStore<Category>('categories.json')
const menuItemStore = new JsonStore<MenuItem>('menu-items.json')

// ===== Menu (read) =====

export function getMenu(storeId: string): MenuResponse | null {
  const store = storeStore.getById(storeId)
  if (!store) return null

  const categories = categoryStore
    .getByField('storeId', storeId)
    .filter(c => c.active !== false)  // hide inactive from customers
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const allItems = menuItemStore
    .getByField('storeId', storeId)
    .filter(item => item.available)

  const categoriesWithItems = categories.map(cat => ({
    ...cat,
    items: allItems
      .filter(item => item.categoryId === cat.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }))

  return {
    store: {
      id: store.id,
      name: store.name,
      logo: store.logo,
      description: store.description,
      openingHours: store.openingHours,
      announcement: store.announcement,
    },
    categories: categoriesWithItems
  }
}

// ===== Menu (admin - includes unavailable items) =====

export function getAllMenuItems(storeId: string): MenuItem[] {
  return menuItemStore
    .getByField('storeId', storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItemStore.getById(id)
}

export function createMenuItem(storeId: string, data: Omit<MenuItem, 'id' | 'storeId'>): MenuItem {
  const item: MenuItem = { id: uuid(), storeId, ...data }
  return menuItemStore.create(item)
}

export function updateMenuItem(storeId: string, id: string, updates: Partial<MenuItem>): MenuItem | { error: string } {
  const existing = menuItemStore.getById(id)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Item not found' }
  }
  const updated = menuItemStore.update(id, updates)
  if (!updated) return { error: 'Failed to update item' }
  return updated
}

export function deleteMenuItem(storeId: string, id: string): boolean | { error: string } {
  const existing = menuItemStore.getById(id)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Item not found' }
  }
  return menuItemStore.delete(id)
}

// ===== Categories =====

export function getCategories(storeId: string): Category[] {
  return categoryStore
    .getByField('storeId', storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function createCategory(storeId: string, name: string, sortOrder: number, nameEn?: string): Category {
  const cat: Category = { id: uuid(), storeId, name, nameEn, sortOrder }
  return categoryStore.create(cat)
}

export function updateCategory(storeId: string, id: string, updates: Partial<Category>): Category | { error: string } {
  const existing = categoryStore.getById(id)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Category not found' }
  }
  console.log('[updateCategory]', id, JSON.stringify(updates))
  const updated = categoryStore.update(id, updates)
  if (!updated) return { error: 'Failed to update category' }
  console.log('[updateCategory] result:', JSON.stringify(updated))
  return updated
}

export function deleteCategory(storeId: string, id: string): boolean | { error: string } {
  const existing = categoryStore.getById(id)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Category not found' }
  }
  return categoryStore.delete(id)
}
