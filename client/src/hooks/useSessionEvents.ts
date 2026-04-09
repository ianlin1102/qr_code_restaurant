import { useEffect, useRef, useCallback } from 'react'

type SessionEventType = 'session:summary' | 'order:created' | 'order:updated'
  | 'cart:updated' | 'cart:submitted' | 'split:changed'

type Handler = (data: any) => void

/**
 * Subscribe to session-scoped SSE events.
 * Auto-reconnects on disconnect (built into EventSource).
 * Returns subscribe function for registering event handlers.
 */
export function useSessionEvents(
  storeId: string | null | undefined,
  sessionId: string | null | undefined,
) {
  const handlersRef = useRef<Map<SessionEventType, Set<Handler>>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!storeId || !sessionId) return

    const baseUrl = import.meta.env.VITE_API_URL || ''
    const url = `${baseUrl}/api/stores/${storeId}/sessions/${sessionId}/events`
    const es = new EventSource(url)
    esRef.current = es

    const eventTypes: SessionEventType[] = [
      'session:summary', 'order:created', 'order:updated',
      'cart:updated', 'cart:submitted', 'split:changed',
    ]

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
  }, [storeId, sessionId])

  const subscribe = useCallback((type: SessionEventType, handler: Handler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)
    return () => { handlersRef.current.get(type)?.delete(handler) }
  }, [])

  return { subscribe }
}
