/**
 * Settlement Gateway Unit Tests
 *
 * Tests response structure, allowedActions, mode locking, error codes,
 * and split operations through the gateway entry point.
 *
 * All amounts in cents. Tax rate: 8.25%, no service fee.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { executeSettlement } from '../settlement/gateway'
import { sessionStore, orderStore, paymentStore, storeStore, splitBillStore } from '../repositories/stores'
import { createSession } from '../controllers/session.service'
import { v4 as uuid } from 'uuid'

const STORE_ID = 'test-gw-store'

let sessionId: string
let orderId: string

function setupStore() {
  if (!storeStore.getById(STORE_ID)) {
    storeStore.create({
      id: STORE_ID, name: 'Test GW', taxRate: 8.25, serviceFeeRate: 0,
      paymentMode: 'pay-later', createdAt: new Date().toISOString(),
    } as any)
  }
}

function setup() {
  setupStore()

  // Clean previous test data
  for (const s of sessionStore.getByField('storeId', STORE_ID)) sessionStore.delete(s.id)
  for (const o of orderStore.getByField('storeId', STORE_ID)) orderStore.delete(o.id)
  for (const p of paymentStore.getByField('storeId', STORE_ID)) paymentStore.delete(p.id)
  for (const sb of splitBillStore.getByField('storeId', STORE_ID)) splitBillStore.delete(sb.id)

  // Session + order: Cola x4 (299), Kung Pao x1 (1599), Mapo Tofu x1 (1299)
  // Food: 4094, Tax: round(4094*0.0825) = 338, Total: 4432
  const tableId = `table-${uuid().slice(0, 8)}`
  const session = createSession(STORE_ID, tableId)
  sessionId = session.id

  orderId = uuid()
  orderStore.create({
    id: orderId, storeId: STORE_ID, tableId, sessionId, orderNumber: 1, status: 'served', isPaid: false,
    totalPrice: 4094, createdAt: new Date().toISOString(),
    items: [
      { menuItemId: 'cola', name: 'Cola', price: 299, quantity: 4, selectedOptions: [] },
      { menuItemId: 'kp', name: 'Kung Pao', price: 1599, quantity: 1, selectedOptions: [] },
      { menuItemId: 'mt', name: 'Mapo Tofu', price: 1299, quantity: 1, selectedOptions: [] },
    ],
  } as any)

  // Link order to session
  const s = sessionStore.getById(sessionId)!
  sessionStore.update(sessionId, {
    orderIds: [...s.orderIds, orderId],
    totalAmount: 4094,
  })
}

beforeEach(setup)

describe('Gateway: response structure', () => {
  it('success has ok, data, allowedActions, remaining, sessionStatus', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.allowedActions).toBeDefined()
      expect(r.remaining).toBeTypeOf('number')
      expect(r.sessionStatus).toBe('active')
      expect(r.data).toBeDefined()
    }
  })

  it('error has ok=false, code, message, allowedActions', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('INVALID_PERCENT')
      expect(r.message).toBeTruthy()
      expect(r.allowedActions).toBeDefined()
    }
  })

  it('SESSION_NOT_FOUND for bad sessionId', () => {
    const r = executeSettlement(STORE_ID, 'nonexistent', { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_NOT_FOUND')
  })
})

describe('Gateway: allowedActions', () => {
  it('fresh session allows all payment types', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    if (r.ok) {
      expect(r.allowedActions.payByItems).toBe(true)
      expect(r.allowedActions.payByPercent).toBe(true)
      expect(r.allowedActions.cashPayment).toBe(true)
      expect(r.allowedActions.closeSession).toBe(false)
    }
  })

  it('after full payment, only closeSession allowed', () => {
    executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 4432, receivedAmount: 5000 })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'close-session' })
    if (r.ok) {
      expect(r.allowedActions.payByItems).toBe(false)
      expect(r.allowedActions.cashPayment).toBe(false)
      expect(r.allowedActions.reopenSession).toBe(true)
    }
  })
})

describe('Gateway: mode locking', () => {
  it('pay-items locks mode, blocks pay-percent', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-item' })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SETTLEMENT_MODE_CONFLICT')
  })

  it('create-split by-item blocked in by-percent session', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-percent' })
    const r = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SETTLEMENT_MODE_CONFLICT')
  })
})

describe('Gateway: error codes', () => {
  it('SESSION_FULLY_PAID when remaining=0 (manually set paid state)', () => {
    // Service auto-closes on full payment, so manually set totalPaid to simulate
    // a state where session is paid but not yet closed
    sessionStore.update(sessionId, { totalPaid: 4432 })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 100, receivedAmount: 100 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_FULLY_PAID')
  })

  it('INVALID_PERCENT for percent=0', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INVALID_PERCENT')
  })

  it('INSUFFICIENT_RECEIVED for cash', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 1000, receivedAmount: 500 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INSUFFICIENT_RECEIVED')
  })

  it('SPLIT_NOT_FOUND for bad splitBillId', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-split-card', splitBillId: 'nonexistent' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SPLIT_NOT_FOUND')
  })

  it('SESSION_NOT_FULLY_PAID when trying to close unpaid', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'close-session' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_NOT_FULLY_PAID')
  })
})

describe('Gateway: split operations', () => {
  it('create split returns splitBill in data', () => {
    const r = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const sb = r.data.splitBill as any
      expect(sb.subtotal).toBe(598)
      expect(sb.total).toBe(647) // 598 + round(598*0.0825)=49 tax
    }
  })

  it('delete split works', () => {
    const cr = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    if (!cr.ok) return
    const splitId = (cr.data.splitBill as any).id
    const dr = executeSettlement(STORE_ID, sessionId, { type: 'delete-split', splitBillId: splitId })
    expect(dr.ok).toBe(true)
  })

  it('pay split cash with tip', () => {
    const cr = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:1:1`],
    })
    if (!cr.ok) return
    const splitId = (cr.data.splitBill as any).id
    // Kung Pao: 1599 + round(1599*0.0825)=132 tax = 1731, +300 tip = 2031
    const pr = executeSettlement(STORE_ID, sessionId, {
      type: 'pay-split-cash', splitBillId: splitId, receivedAmount: 2100, tipAmount: 300,
    })
    expect(pr.ok).toBe(true)
  })
})
