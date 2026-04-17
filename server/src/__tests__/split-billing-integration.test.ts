/**
 * Split Billing Integration Tests
 *
 * Tests the full payment lifecycle: customer payments, waiter splits,
 * conflict detection, mode locking, and edge cases.
 *
 * All amounts in cents. Tax rate: 8.25%, no service fee.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { sessionStore, orderStore, paymentStore, storeStore, splitBillStore } from '../repositories/stores'
import { createSession, getSessionSummary, payByItems, payByPercent, recordCashPayment, addPayment, confirmItemPayment, confirmPercentPayment } from '../controllers/session.service'
import { createSplitBill, getSplitBills, invalidateConflictingSplits } from '../controllers/split-bill.service'
import { paySplitBillCard, paySplitBillCash } from '../controllers/split-bill-payment.service'
import { v4 as uuid } from 'uuid'

const STORE_ID = 'test-split-store'
const TAX_RATE = 8.25

// Test items: Cola x4 ($2.99), Kung Pao x1 ($15.99), Mapo Tofu x1 ($12.99)
// Food: 4094, Tax: round(4094*0.0825) = 338, Total: 4432

let tableId: string
let sessionId: string
let orderId: string

function setupStore() {
  if (!storeStore.getById(STORE_ID)) {
    storeStore.create({
      id: STORE_ID, name: 'Test Store', taxRate: TAX_RATE, serviceFeeRate: 0,
      paymentMode: 'pay-later', createdAt: new Date().toISOString(),
    } as any)
  }
}

function createTestSession(): { sessionId: string; orderId: string; tableId: string } {
  tableId = `test-table-${uuid().slice(0, 8)}`
  const session = createSession(STORE_ID, tableId)
  sessionId = session.id

  const order = {
    id: uuid(), storeId: STORE_ID, tableId, sessionId,
    items: [
      { menuItemId: 'cola', name: 'Cola', price: 299, quantity: 4, selectedOptions: [] },
      { menuItemId: 'kungpao', name: 'Kung Pao', price: 1599, quantity: 1, selectedOptions: [] },
      { menuItemId: 'mapo', name: 'Mapo Tofu', price: 1299, quantity: 1, selectedOptions: [] },
    ],
    totalPrice: 4094, status: 'served', isPaid: false,
    orderNumber: 1, createdAt: new Date().toISOString(),
  }
  orderStore.create(order as any)
  sessionStore.update(sessionId, { orderIds: [order.id] })
  orderId = order.id
  return { sessionId, orderId, tableId }
}

function getSummary() {
  return getSessionSummary(STORE_ID, sessionId)!
}

function cleanup() {
  // Clean up test data
  for (const s of sessionStore.getByField('storeId', STORE_ID)) sessionStore.delete(s.id)
  for (const o of orderStore.getByField('storeId', STORE_ID)) orderStore.delete(o.id)
  for (const p of paymentStore.getByField('storeId', STORE_ID)) paymentStore.delete(p.id)
  for (const sb of splitBillStore.getByField('storeId', STORE_ID)) splitBillStore.delete(sb.id)
}

beforeEach(() => {
  setupStore()
  cleanup()
  createTestSession()
})

// ============ SECTION 1: Basic Calculations ============

describe('Session setup', () => {
  it('has correct totals', () => {
    const s = getSummary()
    expect(s.totalAmount).toBe(4094)
    expect(s.tax).toBe(338)      // round(4094 * 0.0825)
    expect(s.totalWithTax).toBe(4432)
    expect(s.remaining).toBe(4432)
    expect(s.isPaid).toBe(false)
  })
})

// ============ SECTION 2: Customer pay-percent ============

describe('Customer payByPercent', () => {
  it('50% returns correct amount (no double tax)', () => {
    const r = payByPercent(STORE_ID, sessionId, 50)
    expect('amount' in r).toBe(true)
    if ('amount' in r) {
      // 50% of 4432 = 2216, already includes tax
      expect(r.amount).toBe(2216)
    }
  })

  it('100% returns full remaining', () => {
    const r = payByPercent(STORE_ID, sessionId, 100)
    expect('amount' in r).toBe(true)
    if ('amount' in r) expect(r.amount).toBe(4432)
  })

  it('1% rejected — split < $1.00', () => {
    const r = payByPercent(STORE_ID, sessionId, 1)
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('$1.00')
  })

  it('99% rejected — remaining < $1.00', () => {
    const r = payByPercent(STORE_ID, sessionId, 99)
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('$1.00')
  })

  it('50% after partial payment recalculates from new remaining', () => {
    // Pay 2216 first (50%)
    addPayment(STORE_ID, sessionId, 2216, 'customer')
    const r = payByPercent(STORE_ID, sessionId, 50)
    expect('amount' in r).toBe(true)
    if ('amount' in r) {
      // New remaining = 4432 - 2216 = 2216. 50% = 1108
      expect(r.amount).toBe(1108)
    }
  })
})

// ============ SECTION 3: Customer pay-items ============

describe('Customer payByItems', () => {
  it('2 Colas returns correct amount', () => {
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:0:2`])
    expect('amount' in r).toBe(true)
    if ('amount' in r) {
      // 2 * 299 = 598, tax = round(598*0.0825) = 49, total = 647
      expect(r.amount).toBe(647)
      expect(r.tax).toBe(49)
    }
  })

  it('all items returns full bill', () => {
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:0:4`, `${orderId}:1:1`, `${orderId}:2:1`])
    expect('amount' in r).toBe(true)
    if ('amount' in r) {
      expect(r.amount).toBe(4432)
      expect(r.tax).toBe(338)
    }
  })

  it('already-paid items rejected (all qty paid)', () => {
    // Pay ALL 4 Colas, then try to pay them again
    confirmItemPayment(sessionId, [`${orderId}:0:4`])
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:0:1`])
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('already fully paid')
  })

  it('partial qty after partial payment', () => {
    // 2 of 4 Colas paid
    confirmItemPayment(sessionId, [`${orderId}:0:2`])
    // Pay remaining 2 Colas — should work
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:0:2`])
    expect('amount' in r).toBe(true)
    if ('amount' in r) {
      expect(r.amount).toBe(647) // 2*299 + tax(49)
    }
  })

  it('is stateless — no side effects', () => {
    payByItems(STORE_ID, sessionId, [`${orderId}:0:2`])
    const s = getSummary()
    expect(s.totalPaid).toBe(0)
    expect(s.remaining).toBe(4432)
  })
})

// ============ SECTION 4: Mode conflict ============

describe('Settlement mode locking', () => {
  it('payByItems rejected when session is in by-percent mode', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-percent' })
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:0:1`])
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('by-percent mode')
  })

  it('waiter cannot create by-item split in by-percent session (B3)', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-percent' })
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('by-percent settlement mode')
  })

  it('waiter CAN create by-percent split in by-item session (soft lock, upgrades to by-percent)', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-item' })
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 50,
    })
    expect('error' in r).toBe(false)
  })
})

// ============ SECTION 5: Waiter split creation ============

describe('Waiter split creation', () => {
  it('by-item split for 2 Colas', () => {
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect('id' in r).toBe(true)
    if ('id' in r) {
      expect(r.subtotal).toBe(598)
      expect(r.tax).toBe(49)
      expect(r.total).toBe(647)
      expect(r.status).toBe('unpaid')
    }
  })

  it('by-percent split 50%', () => {
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 50,
    })
    expect('id' in r).toBe(true)
    if ('id' in r) {
      // 50% of mainBill subtotal 4094 = 2047
      expect(r.subtotal).toBe(2047)
      expect(r.tax).toBe(169)
      expect(r.total).toBe(2216)
    }
  })

  it('cannot split already-paid items (B2)', () => {
    confirmItemPayment(sessionId, [`${orderId}:0:2`])
    sessionStore.update(sessionId, { settlementMode: 'by-item' })
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:4`],
    })
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('insufficient unpaid quantity')
  })

  it('split too small (< $1.00) rejected', () => {
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 2,
    })
    expect('error' in r).toBe(true)
  })

  it('split leaving < $1.00 remaining rejected', () => {
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 99,
    })
    expect('error' in r).toBe(true)
  })

  it('cannot double-assign items across splits', () => {
    createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:4`],
    })
    const r = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:1`],
    })
    expect('error' in r).toBe(true)
    if ('error' in r) expect(r.error).toContain('insufficient')
  })
})

// ============ SECTION 6: Conflict / Invalidation ============

describe('Eager split invalidation', () => {
  it('customer pays item in split → split deleted', () => {
    // Waiter creates split for 2 Colas
    const split = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect('id' in split).toBe(true)

    // Customer pays 1 Cola (overlapping item)
    confirmItemPayment(sessionId, [`${orderId}:0:1`])
    const deleted = invalidateConflictingSplits(sessionId, STORE_ID)
    expect(deleted).toBe(1)
    expect(getSplitBills(sessionId)).toHaveLength(0)
  })

  it('customer pays non-overlapping items → split survives', () => {
    // Waiter splits Kung Pao
    createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:1:1`],
    })
    // Customer pays Colas (different items)
    confirmItemPayment(sessionId, [`${orderId}:0:2`])
    const deleted = invalidateConflictingSplits(sessionId, STORE_ID)
    expect(deleted).toBe(0)
    expect(getSplitBills(sessionId)).toHaveLength(1)
  })

  it('paid splits not affected by invalidation', () => {
    const split = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    if ('id' in split) {
      // Pay the split first
      paySplitBillCash(STORE_ID, split.id, 647)
      // Then customer pays overlapping items
      confirmItemPayment(sessionId, [`${orderId}:0:1`])
      const deleted = invalidateConflictingSplits(sessionId, STORE_ID)
      expect(deleted).toBe(0) // paid split not deleted
    }
  })
})

// ============ SECTION 7: Split payment with tip ============

describe('Split payment — tip handling (B1)', () => {
  it('card tip excluded from totalPaid', () => {
    const split = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    if ('id' in split) {
      paySplitBillCard(STORE_ID, split.id, 500) // $5 tip
      const s = getSummary()
      // totalPaid should be split.total (647) without tip (500)
      expect(s.totalPaid).toBe(647)
    }
  })

  it('cash tip excluded from totalPaid', () => {
    const split = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:1:1`],
    })
    if ('id' in split) {
      // Kung Pao: 1599 + 132 tax = 1731, plus $3 tip = 2031
      paySplitBillCash(STORE_ID, split.id, 2100, 300) // $3 tip, received $21
      const s = getSummary()
      expect(s.totalPaid).toBe(1731) // no tip
    }
  })
})

// ============ SECTION 8: Remaining calculation ============

describe('Remaining calculation (item-based)', () => {
  it('remaining from unpaid items after partial payment', () => {
    // Pay 2 Colas via webhook flow
    addPayment(STORE_ID, sessionId, 647, 'customer')
    confirmItemPayment(sessionId, [`${orderId}:0:2`])

    const s = getSummary()
    // Unpaid: 2 Colas (598) + Kung Pao (1599) + Mapo Tofu (1299) = 3496
    // Tax: round(3496 * 0.0825) = 288
    // Remaining: 3496 + 288 = 3784
    expect(s.remaining).toBe(3784)
  })

  it('remaining = 0 after all items paid', () => {
    addPayment(STORE_ID, sessionId, 4432, 'customer')
    confirmItemPayment(sessionId, [`${orderId}:0:4`, `${orderId}:1:1`, `${orderId}:2:1`])

    const s = getSummary()
    expect(s.remaining).toBe(0)
    expect(s.isPaid).toBe(true)
  })
})

// ============ SECTION 9: Full mixed flows ============

describe('Mixed flow: customer + waiter', () => {
  it('customer pays 2 items → waiter splits rest → cash close', () => {
    // Step 1: Customer pays 2 Colas
    addPayment(STORE_ID, sessionId, 647, 'customer')
    confirmItemPayment(sessionId, [`${orderId}:0:2`])

    let s = getSummary()
    expect(s.remaining).toBe(3784) // unpaid items + tax

    // Step 2: Waiter creates split for Kung Pao
    const split = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:1:1`],
    })
    expect('id' in split).toBe(true)
    if (!('id' in split)) return

    // Kung Pao: 1599 + round(1599*0.0825)=132 = 1731
    expect(split.total).toBe(1731)

    // Step 3: Waiter pays split cash
    paySplitBillCash(STORE_ID, split.id, 1731)
    s = getSummary()
    expect(s.totalPaid).toBe(647 + 1731) // 2378

    // Step 4: Cash for remaining (2 Colas + Mapo Tofu)
    // Remaining items: 2*299 + 1299 = 1897, tax = round(1897*0.0825) = 157, total = 2054
    const remaining = s.remaining
    expect(remaining).toBe(2054)

    const cashResult = recordCashPayment(STORE_ID, sessionId, remaining, remaining)
    expect('error' in cashResult).toBe(false)

    s = getSummary()
    expect(s.isPaid).toBe(true)
  })

  it('waiter splits 60%+40% by-percent → pays both → session closed', () => {
    // Split 1: 60%
    const s1 = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 60,
    })
    expect('id' in s1).toBe(true)
    if (!('id' in s1)) return
    // 60% of 4094 = round(2456.4) = 2456, tax = round(2456*0.0825) = 203, total = 2659
    expect(s1.total).toBe(2659)

    // Split 2: 100% of remaining
    const s2 = createSplitBill(STORE_ID, sessionId, {
      type: 'by-percent', percent: 100,
    })
    expect('id' in s2).toBe(true)
    if (!('id' in s2)) return
    // Main bill after s1: 4094-2456 = 1638, 100% = 1638, tax=round(1638*0.0825)=135, total=1773
    expect(s2.total).toBe(1773)

    // Verify: 2659 + 1773 = 4432
    expect(s1.total + s2.total).toBe(4432)

    // Pay both
    paySplitBillCash(STORE_ID, s1.id, 2659)
    paySplitBillCash(STORE_ID, s2.id, 1773)

    const s = getSummary()
    expect(s.totalPaid).toBe(4432)
    expect(s.isPaid).toBe(true)
  })
})

// ============ SECTION 10: Edge cases ============

describe('Edge cases', () => {
  it('invalid order ID in payByItems', () => {
    const r = payByItems(STORE_ID, sessionId, ['nonexistent:0:1'])
    expect('error' in r).toBe(true)
  })

  it('invalid item index in payByItems', () => {
    const r = payByItems(STORE_ID, sessionId, [`${orderId}:99:1`])
    expect('error' in r).toBe(true)
  })

  it('percent 0 rejected', () => {
    const r = payByPercent(STORE_ID, sessionId, 0)
    expect('error' in r).toBe(true)
  })

  it('percent 101 rejected', () => {
    const r = payByPercent(STORE_ID, sessionId, 101)
    expect('error' in r).toBe(true)
  })

  it('cash payment with receivedAmount < amount rejected', () => {
    const r = recordCashPayment(STORE_ID, sessionId, 1000, 500)
    expect('error' in r).toBe(true)
  })

  it('rounding: split taxes may not sum to total tax (1 cent diff OK)', () => {
    // Split into 2 Colas + rest
    const s1 = createSplitBill(STORE_ID, sessionId, {
      type: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    if (!('id' in s1)) return
    // tax(598) = 49
    // Remaining: 4094-598=3496, tax(3496)=288
    // Sum: 49 + 288 = 337, but tax(4094) = 338. 1 cent gap is OK.
    expect(Math.abs(s1.tax + 288 - 338)).toBeLessThanOrEqual(1)
  })
})
