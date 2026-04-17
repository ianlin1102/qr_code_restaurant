import { EventEmitter } from 'events'

export type AppEvent =
  | { type: 'session:summary'; storeId: string; sessionId: string }
  | { type: 'order:created'; storeId: string; sessionId: string; order: any }
  | { type: 'order:updated'; storeId: string; sessionId: string; order: any }
  | { type: 'cart:updated'; storeId: string; sessionId: string }
  | { type: 'cart:submitted'; storeId: string; sessionId: string }
  | { type: 'split:changed'; storeId: string; sessionId: string }
  | { type: 'store:tables'; storeId: string }
  | { type: 'store:orders'; storeId: string }
  | { type: 'store:waitlist'; storeId: string }
  | { type: 'table:waiter-called'; storeId: string; tableId: string }

const bus = new EventEmitter()
bus.setMaxListeners(200) // many concurrent SSE connections

export function emit(event: AppEvent): void {
  bus.emit('app-event', event)
}

export function onEvent(handler: (event: AppEvent) => void): () => void {
  bus.on('app-event', handler)
  return () => bus.off('app-event', handler)
}
