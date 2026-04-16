import type { Response } from 'express'
import type { AppEvent } from './event-bus'
import { onEvent } from './event-bus'
import logger from './logger'

interface SSEClient {
  res: Response
  storeId: string
  sessionId?: string  // undefined = store-scoped
}

const clients: SSEClient[] = []

export function addClient(res: Response, storeId: string, sessionId?: string): () => void {
  // SSE headers — use setHeader + flushHeaders for compatibility with Express middleware (CORS, etc.)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // nginx/proxy no-buffer
  res.flushHeaders()
  res.write(':ok\n\n')  // initial comment to flush

  const client: SSEClient = { res, storeId, sessionId }
  clients.push(client)
  logger.info({ storeId, sessionId, total: clients.length }, 'SSE client connected')

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n') } catch { cleanup() }
  }, 30_000)

  const cleanup = () => {
    clearInterval(heartbeat)
    const idx = clients.indexOf(client)
    if (idx >= 0) clients.splice(idx, 1)
    logger.info({ storeId, sessionId, total: clients.length }, 'SSE client disconnected')
  }

  res.on('close', cleanup)
  return cleanup
}

function sendEvent(client: SSEClient, eventType: string, data: unknown): void {
  try {
    client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
  } catch { /* client disconnected, cleanup will handle */ }
}

/** Route events to the right SSE clients. */
export function startEventRouter(): void {
  onEvent((event) => {
    for (const client of clients) {
      if (client.storeId !== event.storeId) continue

      if (client.sessionId) {
        // Session-scoped client: only gets events for their session
        if ('sessionId' in event && event.sessionId === client.sessionId) {
          sendEvent(client, event.type, event)
        }
      } else {
        // Store-scoped client: gets store-level events
        if (event.type === 'store:tables' || event.type === 'store:orders' || event.type === 'table:waiter-called') {
          sendEvent(client, event.type, event)
        }
      }
    }
  })
}

export function getClientCount(): number { return clients.length }
