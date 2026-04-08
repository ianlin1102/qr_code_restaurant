import { useEffect, useMemo, useRef } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { getDeviceId } from '@/lib/device-id'
import { api } from '@/services/api'
import type { CartItem } from '@qr-order/shared'

/**
 * Shared cart sync hook — push local changes to server, poll for other devices' changes.
 *
 * Push: debounced 1s after local cart changes, sends only this device's items.
 * Poll: every 5s, fetches all items from server, replaces other devices' items locally.
 *
 * @param storeId - store ID (null/undefined disables sync)
 * @param sessionId - active session ID (null/undefined disables sync)
 */
export function useCartSync(storeId: string | undefined | null, sessionId: string | null | undefined) {
  const cartItems = useCartStore(s => s.items)
  const myDeviceId = useMemo(() => getDeviceId(), [])
  const lastSubmitRef = useRef<string | null>(null)

  // Push my items to server when they change (debounced 1s)
  useEffect(() => {
    if (!storeId || !sessionId) return
    const timer = setTimeout(() => {
      const myLocal = useCartStore.getState().items.filter(i => (i.addedByDevice || myDeviceId) === myDeviceId)
      const plain: CartItem[] = myLocal.map(({ menuItemId, name, price, quantity, remark, selectedOptions, addedBy, addedByDevice }) => ({
        menuItemId, name, price, quantity,
        ...(remark ? { remark } : {}),
        ...(selectedOptions?.length ? { selectedOptions } : {}),
        ...(addedBy ? { addedBy } : {}),
        ...(addedByDevice ? { addedByDevice } : {}),
      }))
      api.updateSessionCart(storeId, sessionId, myDeviceId, plain).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [cartItems, storeId, sessionId, myDeviceId])

  // Poll server every 5s — sync other devices' items + track cart version
  useEffect(() => {
    if (!storeId || !sessionId) return
    const poll = () => {
      api.getSessionCart(storeId, sessionId).then(({ items: serverItems, cartVersion, lastCartSubmitAt }) => {
        const store = useCartStore.getState()
        store.setCartVersion(cartVersion)
        // Detect remote cart submission
        if (lastCartSubmitAt && lastCartSubmitAt !== lastSubmitRef.current && serverItems.length === 0 && store.items.length > 0) {
          store.clearCart()
          lastSubmitRef.current = lastCartSubmitAt
          return
        }
        lastSubmitRef.current = lastCartSubmitAt
        const othersFromServer = serverItems.filter(i => i.addedByDevice && i.addedByDevice !== myDeviceId)
        const currentOtherKeys = new Set(store.items.filter(i => i.addedByDevice && i.addedByDevice !== myDeviceId).map(i => i.addedByDevice + i.menuItemId))
        const newOtherKeys = new Set(othersFromServer.map(i => i.addedByDevice + i.menuItemId))
        if (currentOtherKeys.size !== newOtherKeys.size || [...currentOtherKeys].some(k => !newOtherKeys.has(k))) {
          for (const item of store.items) {
            if (item.addedByDevice && item.addedByDevice !== myDeviceId) {
              store.removeItem(item.cartKey)
            }
          }
          for (const item of othersFromServer) {
            store.addItem(item)
          }
        }
      }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [storeId, sessionId, myDeviceId])
}
