import type { MenuResponse, MenuItem, Category } from '@qr-order/shared'
import { fetchJSON } from './_client'

export const menuApi = {
  // Customer
  getMenu: (storeId: string) =>
    fetchJSON<MenuResponse>(`/stores/${storeId}/menu`),

  // Admin: Menu Items
  getMenuItems: (storeId: string) =>
    fetchJSON<MenuItem[]>(`/stores/${storeId}/menu/items`),

  createMenuItem: (storeId: string, data: Omit<MenuItem, 'id' | 'storeId'>) =>
    fetchJSON<MenuItem>(`/stores/${storeId}/menu/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMenuItem: (storeId: string, itemId: string, data: Partial<MenuItem>) =>
    fetchJSON<MenuItem>(`/stores/${storeId}/menu/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMenuItem: (storeId: string, itemId: string) =>
    fetchJSON<void>(`/stores/${storeId}/menu/items/${itemId}`, {
      method: 'DELETE',
    }),

  batchImportMenuItems: (storeId: string, items: Array<{ name: string; nameEn?: string; price: number; categoryId: string; description?: string; descriptionEn?: string }>) =>
    fetchJSON<{ created: MenuItem[]; skipped: Array<{ row: number; reason: string }> }>(`/stores/${storeId}/menu/items/batch`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // Admin: Categories
  getCategories: (storeId: string) =>
    fetchJSON<Category[]>(`/stores/${storeId}/menu/categories`),

  createCategory: (storeId: string, data: { name: string; nameEn?: string; sortOrder: number; hideQuickTags?: boolean }) =>
    fetchJSON<Category>(`/stores/${storeId}/menu/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (storeId: string, catId: string, data: Partial<Category>) =>
    fetchJSON<Category>(`/stores/${storeId}/menu/categories/${catId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCategory: (storeId: string, catId: string) =>
    fetchJSON<void>(`/stores/${storeId}/menu/categories/${catId}`, {
      method: 'DELETE',
    }),
}
