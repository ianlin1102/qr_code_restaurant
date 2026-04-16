import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { getDeviceId } from '@/lib/device-id'
import { api } from '@/services/api'
import { POLL } from '@/lib/intervals'
import type { CartItem } from '@qr-order/shared'

/**
 * Shared cart sync hook — push local changes to server, poll for other devices' changes.
 *
 * Push: debounced 1s after local cart changes, sends only this device's items.
 * Poll: every 15s (SSE is primary; this is fallback). Also runs once on mount.
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
  const initializedRef = useRef(false)

  /** Call after local submit to prevent the poll from clearing newly added items. */
  const markSubmitted = useCallback(() => {
    lastSubmitRef.current = '__local_submit_pending__'
  }, [])

  // Reset initialized flag whenever sessionId changes (e.g., new session after close)
  useEffect(() => {
    initializedRef.current = false
    lastSubmitRef.current = null
  }, [sessionId])

  /** Single source of truth for applying server cart state locally. */
  const applyServerCart = useCallback((
    serverItems: CartItem[],
    cartVersion: number,
    lastCartSubmitAt?: string,
  ) => {
    const store = useCartStore.getState()
    store.setCartVersion(cartVersion)

    // First poll after mount / session change: adopt the server timestamp without
    // interpreting it as a remote submission. Prevents clearing local items that
    // were just added before the hook had a chance to see the session's prior state.
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSubmitRef.current = lastCartSubmitAt ?? null
    } else if (lastSubmitRef.current === '__local_submit_pending__') {
      // Local submit in flight — absorb server timestamp silently.
      lastSubmitRef.current = lastCartSubmitAt ?? null
    } else if (
      lastCartSubmitAt &&
      lastCartSubmitAt !== lastSubmitRef.current &&
      serverItems.length === 0 &&
      store.items.length > 0
    ) {
      // A different device submitted the cart → clear ours too.
      store.clearCart()
      lastSubmitRef.current = lastCartSubmitAt
      return
    }
    lastSubmitRef.current = lastCartSubmitAt ?? null

    // Reconcile other devices' items from server.
    const othersFromServer = serverItems.filter(i => i.addedByDevice && i.addedByDevice !== myDeviceId)
    const currentOtherKeys = new Set(
      store.items.filter(i => i.addedByDevice && i.addedByDevice !== myDeviceId)
        .map(i => i.addedByDevice + i.menuItemId),
    )
    const newOtherKeys = new Set(othersFromServer.map(i => i.addedByDevice + i.menuItemId))
    const changed =
      currentOtherKeys.size !== newOtherKeys.size ||
      [...currentOtherKeys].some(k => !newOtherKeys.has(k))
    if (!changed) return
    for (const item of store.items) {
      if (item.addedByDevice && item.addedByDevice !== myDeviceId) {
        store.removeItem(item.cartKey)
      }
    }
    for (const item of othersFromServer) {
      store.addItem(item)
    }
  }, [myDeviceId])

  const fetchAndApply = useCallback(() => {
    if (!storeId || !sessionId) return
    api.getSessionCart(storeId, sessionId)
      .then(({ items: serverItems, cartVersion, lastCartSubmitAt }) =>
        applyServerCart(serverItems, cartVersion, lastCartSubmitAt ?? undefined))
      .catch(() => {})
  }, [storeId, sessionId, applyServerCart])

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

  // Poll server on mount + every 15s
  useEffect(() => {
    if (!storeId || !sessionId) return
    fetchAndApply()
    const id = setInterval(fetchAndApply, POLL.CART_SYNC)
    return () => clearInterval(id)
  }, [storeId, sessionId, fetchAndApply])

  // SSE-driven updates — refetch on cart:updated / cart:submitted
  useEffect(() => {
    if (!storeId || !sessionId || !subscribe) return
    const unsub1 = subscribe('cart:updated', fetchAndApply)
    const unsub2 = subscribe('cart:submitted', fetchAndApply)
    return () => { unsub1(); unsub2() }
  }, [storeId, sessionId, subscribe, fetchAndApply])

  return { markSubmitted }
}
