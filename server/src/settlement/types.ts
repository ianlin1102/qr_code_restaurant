import type { Session, Payment, SplitBill, Order, Store } from '@qr-order/shared'

// ===== Actions (what the caller wants to do) =====

export type SettlementAction =
  | { type: 'pay-items'; itemKeys: string[] }
  | { type: 'pay-percent'; percent: number }
  | { type: 'cash-payment'; amount: number; receivedAmount: number }
  | { type: 'add-payment'; amount: number; paidBy: string; tipAmount?: number; stripePaymentIntentId?: string }
  | { type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string }
  | { type: 'delete-split'; splitBillId: string }
  | { type: 'pay-split-card'; splitBillId: string; tipAmount?: number }
  | { type: 'pay-split-cash'; splitBillId: string; receivedAmount: number; tipAmount?: number }
  | { type: 'close-session' }
  | { type: 'reopen-session' }

// ===== Context (loaded once per call) =====

export interface SettlementContext {
  store: Store
  session: Session
  orders: Order[]
  payments: Payment[]
  splits: SplitBill[]
  paidQtyMap: Map<string, number>
  assignedQtyMap: Map<string, number>
  remaining: number
  totalWithTax: number
  mainBillTotal: number
}

// ===== AllowedActions =====

export interface AllowedActions {
  payByItems: boolean
  payByPercent: boolean
  cashPayment: boolean
  createSplitByItem: boolean
  createSplitByPercent: boolean
  paySplit: boolean
  deleteSplit: boolean
  closeSession: boolean
  reopenSession: boolean
}

// ===== Results =====

export interface SettlementSuccess {
  ok: true
  data: Record<string, unknown>
  sessionStatus: 'active' | 'paid' | 'closed'
  remaining: number
  allowedActions: AllowedActions
}

export interface SettlementFailure {
  ok: false
  code: string
  message: string
  details?: Record<string, unknown>
  allowedActions: AllowedActions
}

export type SettlementResult = SettlementSuccess | SettlementFailure
