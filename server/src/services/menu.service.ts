import { JsonStore } from '../storage/json-store.js'
import type { Store, Category, MenuItem, MenuResponse } from '@qr-order/shared'

const storeStore = new JsonStore<Store>('stores.json')
const categoryStore = new JsonStore<Category>('categories.json')
const menuItemStore = new JsonStore<MenuItem>('menu-items.json')

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
    },
    categories: categoriesWithItems
  }
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItemStore.getById(id)
}
