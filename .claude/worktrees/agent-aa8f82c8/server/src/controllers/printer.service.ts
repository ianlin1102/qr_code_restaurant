import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import { formatTicket, formatReprintTicket } from '../lib/printer.js'
import logger from '../lib/logger.js'
import type { PrinterConfig, Order } from '@qr-order/shared'

const printerStore = new JsonStore<PrinterConfig>('printers.json')

export function getPrinterConfig(storeId: string): PrinterConfig | undefined {
  const configs = printerStore.getByField('storeId', storeId)
  return configs[0]
}

export function updatePrinterConfig(
  storeId: string,
  updates: Partial<Omit<PrinterConfig, 'id' | 'storeId'>>,
): PrinterConfig {
  const existing = getPrinterConfig(storeId)

  if (existing) {
    return printerStore.update(existing.id, updates)!
  }

  const config: PrinterConfig = {
    id: uuid(),
    storeId,
    name: updates.name ?? 'Default Printer',
    type: updates.type ?? 'network',
    address: updates.address,
    enabled: updates.enabled ?? false,
  }
  return printerStore.create(config)
}

export async function printOrder(order: Order): Promise<boolean> {
  const config = getPrinterConfig(order.storeId)
  if (!config?.enabled) {
    logger.debug({ storeId: order.storeId }, 'printing skipped: no enabled printer')
    return false
  }

  const ticket = formatTicket(order)

  // Mock printing — in production, replace with real ESC/POS driver
  logger.info({ orderId: order.id, printer: config.name, ticket }, 'ticket printed')
  return true
}

export async function reprintOrder(order: Order): Promise<boolean> {
  const config = getPrinterConfig(order.storeId)
  if (!config?.enabled) {
    logger.debug({ storeId: order.storeId }, 'reprint skipped: no enabled printer')
    return false
  }

  const ticket = formatReprintTicket(order)

  logger.info({ orderId: order.id, printer: config.name, ticket }, 'ticket reprinted')
  return true
}
