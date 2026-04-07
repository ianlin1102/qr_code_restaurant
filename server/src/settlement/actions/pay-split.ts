import type { SettlementContext } from '../types'
import { checkNotClosed, checkSplitExists, checkSplitUnpaid, checkAmount, checkReceived } from '../rules'
import { paySplitBillCard, paySplitBillCash } from '../../controllers/split-bill-payment.service'

export function executeCard(ctx: SettlementContext, action: { type: 'pay-split-card'; splitBillId: string; tipAmount?: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const result = paySplitBillCard(ctx.store.id, action.splitBillId, tip)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: { splitBill: result.splitBill } }
}

export function executeCash(ctx: SettlementContext, action: {
  type: 'pay-split-cash'; splitBillId: string; receivedAmount: number; tipAmount?: number
}) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
    checkAmount(action.receivedAmount),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const sb = ctx.splits.find(s => s.id === action.splitBillId)!
  const due = sb.total + tip
  const received = Math.round(action.receivedAmount)

  const rcvCheck = checkReceived(received, due)
  if (rcvCheck) return { error: rcvCheck, message: 'Received amount less than due' }

  const result = paySplitBillCash(ctx.store.id, action.splitBillId, received, tip)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: { splitBill: result.splitBill, change: result.change } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SPLIT_NOT_FOUND': return 'Split bill not found'
    case 'SPLIT_ALREADY_PAID': return 'Split bill already paid'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    case 'INSUFFICIENT_RECEIVED': return 'Received amount less than due'
    default: return code
  }
}
