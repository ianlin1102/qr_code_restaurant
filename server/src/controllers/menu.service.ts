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

export function updateMenuItem(id: string, updates: Partial<MenuItem>): MenuItem | undefined {
  return menuItemStore.update(id, updates)
}

export function deleteMenuItem(id: string): boolean {
  return menuItemStore.delete(id)
}

// ===== Categories =====

export function getCategories(storeId: string): Category[] {
  return categoryStore
    .getByField('storeId', storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function createCategory(storeId: string, name: string, sortOrder: number): Category {
  const cat: Category = { id: uuid(), storeId, name, sortOrder }
  return categoryStore.create(cat)
}

export function updateCategory(id: string, updates: Partial<Category>): Category | undefined {
  return categoryStore.update(id, updates)
}

export function deleteCategory(id: string): boolean {
  return categoryStore.delete(id)
}
