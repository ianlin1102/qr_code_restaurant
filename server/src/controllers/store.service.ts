import type { Store, UpdateStoreRequest } from '@qr-order/shared'
import { storeStore } from '../repositories/stores.js'

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
    announcementEn: data.announcementEn ?? store.announcementEn,
    autoAcceptOrders: data.autoAcceptOrders ?? store.autoAcceptOrders,
    maxTables: data.maxTables ?? store.maxTables,
    paymentMode: data.paymentMode ?? store.paymentMode,
  })

  return updated!
}
