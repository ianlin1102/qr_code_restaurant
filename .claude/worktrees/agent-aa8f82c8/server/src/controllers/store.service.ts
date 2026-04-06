import { JsonStore } from '../repositories/json-store.js'
import type { Store, UpdateStoreRequest } from '@qr-order/shared'

export const storeStore = new JsonStore<Store>('stores.json')

export function getStore(storeId: string): Store | undefined {
  return storeStore.getById(storeId)
}

export function updateStore(storeId: string, data: UpdateStoreRequest): Store | { error: string } {
  const store = storeStore.getById(storeId)
  if (!store) return { error: 'Store not found' }

  const name = data.name?.trim()
  if (!name) return { error: 'Store name is required' }

  const updated = storeStore.update(storeId, {
    name,
    description: data.description ?? store.description,
    openingHours: data.openingHours ?? store.openingHours,
    announcement: data.announcement ?? store.announcement,
    autoAcceptOrders: data.autoAcceptOrders ?? store.autoAcceptOrders,
  })

  return updated!
}
