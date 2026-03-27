import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { Bill, Split, DiscountType } from '@qr-order/shared'
import logger from '../lib/logger.js'

export const billStore = new JsonStore<Bill>('bills.json')
export const splitStore = new JsonStore<Split>('splits.json')

export function createBill(storeId: string, tableId: string, status: Bill['status']): Bill {
  const now = new Date().toISOString()
  const bill: Bill = {
    id: uuid(),
    storeId,
    tableId,
    version: 1,
    status,
    orderIds: [],
    subtotal: 0,
    discountAmount: 0,
    totalDue: 0,
    paidAmount: 0,
    createdAt: now,
  }
  billStore.create(bill)
  return bill
}

export function getActiveBill(storeId: string, tableId: string): Bill | undefined {
  return billStore.getByField('storeId', storeId)
    .find(b => b.tableId === tableId && b.status !== 'settled')
}

export function getBillById(billId: string): Bill | undefined {
  return billStore.getById(billId)
}

export function addOrderToBill(billId: string, orderId: string, orderTotal: number): Bill | { error: string } {
  const bill = billStore.getById(billId)
  if (!bill) return { error: 'Bill not found' }
  if (bill.status === 'settled') return { error: 'Bill is already settled' }

  const newSubtotal = bill.subtotal + orderTotal
  const discountAmount = recalcDiscount(newSubtotal, bill)
  const updated = billStore.update(billId, {
    orderIds: [...bill.orderIds, orderId],
    subtotal: newSubtotal,
    discountAmount,
    totalDue: newSubtotal - discountAmount,
    version: bill.version + 1,
  })
  return updated!
}

function recalcDiscount(subtotal: number, bill: Bill): number {
  if (!bill.couponDiscountType) return 0
  if (bill.couponDiscountType === 'percentage') {
    return Math.round(subtotal * (bill.couponDiscountValue ?? 0) / 100)
  }
  if (bill.couponDiscountType === 'fixed') {
    return Math.min(bill.couponDiscountValue ?? 0, subtotal)
  }
  return bill.discountAmount // bogo stays same
}

export function applyCoupon(
  billId: string,
  couponId: string,
  couponCode: string,
  discountType: DiscountType,
  discountValue: number,
): Bill | { error: string } {
  const bill = billStore.getById(billId)
  if (!bill) return { error: 'Bill not found' }
  if (bill.status === 'settled') return { error: 'Bill is already settled' }
  if (bill.couponId) return { error: 'A coupon is already applied' }

  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.round(bill.subtotal * discountValue / 100)
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(discountValue, bill.subtotal)
  }

  const updated = billStore.update(billId, {
    couponId,
    couponCode,
    couponDiscountType: discountType,
    couponDiscountValue: discountValue,
    discountAmount,
    totalDue: bill.subtotal - discountAmount,
    version: bill.version + 1,
  })
  return updated!
}

export function removeCoupon(billId: string): Bill | { error: string } {
  const bill = billStore.getById(billId)
  if (!bill) return { error: 'Bill not found' }
  if (bill.status === 'settled') return { error: 'Bill is already settled' }

  const updated = billStore.update(billId, {
    couponId: undefined,
    couponCode: undefined,
    couponDiscountType: undefined,
    couponDiscountValue: undefined,
    discountAmount: 0,
    totalDue: bill.subtotal,
    version: bill.version + 1,
  })
  return updated!
}

export function createSplits(
  billId: string,
  method: Bill['splitMethod'],
  count?: number,
): Split[] | { error: string } {
  const bill = billStore.getById(billId)
  if (!bill) return { error: 'Bill not found' }
  if (bill.status === 'settled') return { error: 'Bill is already settled' }

  // Clear existing unpaid splits
  const existingSplits = splitStore.getByField('billId', billId)
  for (const s of existingSplits) {
    if (s.status === 'paid') continue
    splitStore.delete(s.id)
  }

  const paidSplits = existingSplits.filter(s => s.status === 'paid')
  const remainingAmount = bill.totalDue - paidSplits.reduce((sum, s) => sum + s.amount, 0)

  if (method === 'full') {
    const split: Split = {
      id: uuid(), billId, storeId: bill.storeId,
      amount: remainingAmount, status: 'unpaid', createdAt: new Date().toISOString(),
    }
    splitStore.create(split)
    billStore.update(billId, { splitMethod: 'full', version: bill.version + 1 })
    return [split]
  }

  if (method === 'equal' && count && count > 0) {
    const base = Math.floor(remainingAmount / count)
    const remainder = remainingAmount - base * count
    const splits: Split[] = []
    for (let i = 0; i < count; i++) {
      const split: Split = {
        id: uuid(), billId, storeId: bill.storeId,
        amount: base + (i === count - 1 ? remainder : 0),
        status: 'unpaid', createdAt: new Date().toISOString(),
      }
      splitStore.create(split)
      splits.push(split)
    }
    billStore.update(billId, { splitMethod: 'equal', version: bill.version + 1 })
    return splits
  }

  return { error: 'Invalid split method or parameters' }
}

export function markSplitPaid(
  splitId: string,
  paidBy: 'customer' | 'waiter',
  paymentIntentId?: string,
): { bill: Bill; split: Split } | { error: string } {
  const split = splitStore.getById(splitId)
  if (!split) return { error: 'Split not found' }
  if (split.status === 'paid') return { error: 'Split is already paid' }

  splitStore.update(splitId, { status: 'paid', paidBy, paymentIntentId })

  const bill = billStore.getById(split.billId)!
  const allSplits = splitStore.getByField('billId', split.billId)
  const paidAmount = allSplits.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0)
  const allPaid = allSplits.every(s => s.status === 'paid')

  const updates: Partial<Bill> = {
    paidAmount,
    version: bill.version + 1,
  }
  if (allPaid) {
    updates.status = 'settled'
    updates.settledAt = new Date().toISOString()
  } else if (paidAmount > 0) {
    updates.status = 'partially-paid'
  }
  const updatedBill = billStore.update(bill.id, updates)!

  logger.info({ billId: bill.id, splitId, paidBy, paidAmount, allPaid }, 'split marked paid')

  return { bill: updatedBill, split: splitStore.getById(splitId)! }
}

export function getSplitsForBill(billId: string): Split[] {
  return splitStore.getByField('billId', billId)
}

export function settleBillFull(billId: string, paidBy: 'customer' | 'waiter'): Bill | { error: string } {
  const bill = billStore.getById(billId)
  if (!bill) return { error: 'Bill not found' }
  if (bill.status === 'settled') return { error: 'Bill is already settled' }

  const result = createSplits(billId, 'full')
  if ('error' in result) return result

  const payResult = markSplitPaid(result[0].id, paidBy)
  if ('error' in payResult) return payResult

  return payResult.bill
}
