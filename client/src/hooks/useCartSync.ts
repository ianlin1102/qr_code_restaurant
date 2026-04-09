import { useEffect, useMemo, useRef, useCallback } from 'react'
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
 * Returns `markSubmitted` — call after a local submit so the poll doesn't
 * re-clear newly added items when it detects the server's lastCartSubmitAt change.
 */
export function useCartSync(
  storeId: string | undefined | null,
  sessionId: string | null | undefined,
  subscribe?: (type: string, handler: (data: any) => void) => () => void,
) {
  const cartItems = useCartStore(s => s.items)
  const myDeviceId = useMemo(() => getDeviceId(), [])
  const lastSubmitRef = useRef<string | null>(null)

  /** Call after local submit to prevent the poll from clearing newly added items. */
  const markSubmitted = useCallback(() => {
    // Set to a sentinel so the next poll won't treat the server's timestamp as "remote"
    lastSubmitRef.current = '__local_submit_pending__'
  }, [])

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
        // Detect remote cart submission (another device submitted).
        // If lastSubmitRef is '__local_submit_pending__', this device just submitted —
        // absorb the server's timestamp without clearing.
        if (lastSubmitRef.current === '__local_submit_pending__') {
          lastSubmitRef.current = lastCartSubmitAt
        } else if (lastCartSubmitAt && lastCartSubmitAt !== lastSubmitRef.current && serverItems.length === 0 && store.items.length > 0) {
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
    // Fallback polling at 15s (SSE is primary if subscribe is provided)
    const id = setInterval(poll, 15_000)
    return () => clearInterval(id)
  }, [storeId, sessionId, myDeviceId])

  // SSE-driven updates: listen to cart:updated and cart:submitted events
  useEffect(() => {
    if (!storeId || !sessionId || !subscribe) return
    const handleCartUpdated = () => {
      // Fetch latest cart from server (same as poll body)
      api.getSessionCart(storeId, sessionId).then(({ items: serverItems, cartVersion, lastCartSubmitAt }) => {
        const store = useCartStore.getState()
        store.setCartVersion(cartVersion)
        if (lastSubmitRef.current === '__local_submit_pending__') {
          lastSubmitRef.current = lastCartSubmitAt
        } else if (lastCartSubmitAt && lastCartSubmitAt !== lastSubmitRef.current && serverItems.length === 0 && store.items.length > 0) {
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
    const handleCartSubmitted = () => {
      // Same remote-submit-detection logic
      api.getSessionCart(storeId, sessionId).then(({ items: serverItems, cartVersion, lastCartSubmitAt }) => {
        const store = useCartStore.getState()
        store.setCartVersion(cartVersion)
        if (lastSubmitRef.current === '__local_submit_pending__') {
          lastSubmitRef.current = lastCartSubmitAt
        } else if (lastCartSubmitAt && lastCartSubmitAt !== lastSubmitRef.current && serverItems.length === 0 && store.items.length > 0) {
          store.clearCart()
          lastSubmitRef.current = lastCartSubmitAt
          return
        }
        lastSubmitRef.current = lastCartSubmitAt
      }).catch(() => {})
    }
    const unsub1 = subscribe('cart:updated', handleCartUpdated)
    const unsub2 = subscribe('cart:submitted', handleCartSubmitted)
    return () => { unsub1(); unsub2() }
  }, [storeId, sessionId, myDeviceId, subscribe])

  return { markSubmitted }
}
