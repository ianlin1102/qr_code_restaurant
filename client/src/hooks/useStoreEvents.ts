import { useEffect, useRef, useCallback } from 'react'

type StoreEventType = 'store:tables' | 'store:orders'

type Handler = (data: any) => void

/**
 * Subscribe to store-scoped SSE events (admin pages).
 * Auto-reconnects on disconnect (built into EventSource).
 */
export function useStoreEvents(storeId: string | null | undefined) {
  const handlersRef = useRef<Map<StoreEventType, Set<Handler>>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!storeId) return

    const baseUrl = import.meta.env.VITE_API_URL || ''
    const url = `${baseUrl}/api/stores/${storeId}/events`
    const es = new EventSource(url)
    esRef.current = es

    const eventTypes: StoreEventType[] = ['store:tables', 'store:orders']

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          const handlers = handlersRef.current.get(type)
          handlers?.forEach(h => h(data))
        } catch { /* ignore parse errors */ }
      })
    }

    return () => { es.close(); esRef.current = null }
  }, [storeId])

  const subscribe = useCallback((type: StoreEventType, handler: Handler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)
    return () => { handlersRef.current.get(type)?.delete(handler) }
  }, [])

  return { subscribe }
}
