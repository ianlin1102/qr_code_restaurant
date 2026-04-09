import type { SettlementContext } from './types'
import type { ErrorCode } from './errors'
import { orderStore } from '../repositories/stores'

export function checkSessionExists(ctx: SettlementContext | null): ErrorCode | null {
  if (!ctx) return 'SESSION_NOT_FOUND'
  return null
}

export function checkNotClosed(ctx: SettlementContext): ErrorCode | null {
  if (ctx.session.status === 'closed') return 'SESSION_CLOSED'
  return null
}

export function checkIsClosed(ctx: SettlementContext): ErrorCode | null {
  if (ctx.session.status !== 'closed') return 'SESSION_NOT_CLOSED'
  return null
}

export function checkHasRemaining(ctx: SettlementContext): ErrorCode | null {
  if (ctx.remaining <= 0) return 'SESSION_FULLY_PAID'
  return null
}

export function checkIsPaid(ctx: SettlementContext): ErrorCode | null {
  if (ctx.remaining > 0) return 'SESSION_NOT_FULLY_PAID'
  return null
}

export function checkModeCompatible(ctx: SettlementContext, requiredMode: 'by-item' | 'by-percent'): ErrorCode | null {
  const current = ctx.session.settlementMode
  if (!current) return null
  // by-percent is a hard lock — can't go back to by-item
  // by-item is a soft lock — can upgrade to by-percent
  if (current === 'by-percent' && requiredMode === 'by-item') return 'SETTLEMENT_MODE_CONFLICT'
  return null
}

export function checkItemKeys(
  ctx: SettlementContext,
  itemKeys: string[],
  checkPaid: boolean,
  checkAssigned: boolean,
): ErrorCode | null {
  for (const key of itemKeys) {
    const parts = key.split(':')
    if (parts.length < 2) return 'INVALID_ITEM_KEY'
    const orderId = parts[0]
    const idx = parseInt(parts[1], 10)
    if (isNaN(idx)) return 'INVALID_ITEM_KEY'

    const order = orderStore.getById(orderId)
    if (!order || !ctx.session.orderIds.includes(orderId)) return 'INVALID_ITEM_KEY'
    const item = order.items[idx]
    if (!item || item.voided) return 'INVALID_ITEM_KEY'

    const baseKey = `${orderId}:${idx}`
    const reqQty = parts.length >= 3 ? parseInt(parts[2], 10) : item.quantity

    if (checkPaid) {
      const paidQty = ctx.paidQtyMap.get(baseKey) ?? 0
      const available = item.quantity - paidQty
      if (reqQty > available) return 'ITEM_ALREADY_PAID'
    }

    if (checkAssigned) {
      const paidQty = ctx.paidQtyMap.get(baseKey) ?? 0
      const assignedQty = ctx.assignedQtyMap.get(baseKey) ?? 0
      const available = item.quantity - paidQty - assignedQty
      if (reqQty > available) return 'ITEM_ALREADY_ASSIGNED'
    }
  }
  return null
}

export function checkPercent(percent: unknown): ErrorCode | null {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 'INVALID_PERCENT'
  if (percent < 1 || percent > 100) return 'INVALID_PERCENT'
  return null
}

export function checkAmount(val: unknown): ErrorCode | null {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return 'INVALID_AMOUNT'
  return null
}

/** Reject amounts unreasonably above the bill total. Max = max($100, totalWithTax × 2). */
export function checkMaxAmount(amount: number, totalWithTax: number): ErrorCode | null {
  const maxAllowed = Math.max(10000, totalWithTax * 2)
  if (amount > maxAllowed) return 'AMOUNT_EXCEEDS_MAXIMUM'
  return null
}

export function checkMinimum(splitAmount: number, remainingAfterSplit: number, isFullPayment: boolean): ErrorCode | null {
  if (isFullPayment) return null
  if (splitAmount < 100) return 'AMOUNT_BELOW_MINIMUM'
  if (remainingAfterSplit > 0 && remainingAfterSplit < 100) return 'REMAINING_BELOW_MINIMUM'
  return null
}

export function checkSplitExists(ctx: SettlementContext, splitBillId: string): ErrorCode | null {
  const sb = ctx.splits.find(s => s.id === splitBillId)
  if (!sb) return 'SPLIT_NOT_FOUND'
  return null
}

export function checkSplitUnpaid(ctx: SettlementContext, splitBillId: string): ErrorCode | null {
  const sb = ctx.splits.find(s => s.id === splitBillId)
  if (sb && sb.status !== 'unpaid') return 'SPLIT_ALREADY_PAID'
  return null
}

export function checkReceived(received: number, due: number): ErrorCode | null {
  if (received < due) return 'INSUFFICIENT_RECEIVED'
  return null
}
