import { orderStore, sessionStore, storeStore } from '../repositories/stores.js'
import { unitPrice as calcUnitPrice, calcTaxAndFees } from '@qr-order/shared/pricing'
import { getSplitBills, buildAssignedQtyMap } from './split-bill.service.js'

/** Items NOT assigned to any split bill — the "main bill" remainder. */
export function getMainBillSummary(sessionId: string, storeId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return null

  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const splits = getSplitBills(sessionId)

  const assignedQty = buildAssignedQtyMap(splits)

  let subtotal = 0
  let itemCount = 0
  for (const order of orders) {
    if (!order) continue
    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx]
      if (item.voided) continue
      const assigned = assignedQty.get(`${order.id}:${idx}`) ?? 0
      const remaining = Math.max(0, item.quantity - assigned)
      if (remaining <= 0) continue
      const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
      subtotal += up * remaining
      itemCount += remaining
    }
  }

  // Subtract percent-based split subtotals from unassigned total
  for (const sb of splits) {
    if (sb.type === 'by-percent') subtotal -= sb.subtotal
  }
  subtotal = Math.max(0, subtotal)

  const store = storeStore.getById(storeId)
  const { tax, serviceFee, totalWithTax } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
  return { subtotal, tax, serviceFee, total: totalWithTax, itemCount }
}

export function calcByItemSubtotal(
  orderIds: string[], sessionId: string, itemKeys: string[],
): { subtotal: number } | { error: string } {
  const assignedQty = buildAssignedQtyMap(getSplitBills(sessionId))

  let subtotal = 0
  for (const key of itemKeys) {
    const parts = key.split(':')
    const orderId = parts[0]
    const idx = parseInt(parts[1], 10)
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : undefined

    const order = orderStore.getById(orderId)
    if (!order || !orderIds.includes(orderId)) return { error: `Order ${orderId} not found` }
    const item = order.items[idx]
    if (!item) return { error: `Item index ${idx} not found` }
    if (item.voided) return { error: 'Cannot assign voided item' }

    const baseKey = `${orderId}:${idx}`
    const alreadyAssigned = assignedQty.get(baseKey) ?? 0
    const remaining = item.quantity - alreadyAssigned
    const assignQty = qty != null ? Math.min(qty, remaining) : remaining
    if (assignQty <= 0) return { error: `Item ${baseKey} already fully assigned` }

    const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
    subtotal += up * assignQty
  }
  return { subtotal }
}
