import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkAmount, checkReceived, checkMaxAmount } from '../rules'
import { recordCashPayment } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'cash-payment'; amount: number; receivedAmount: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkAmount(action.amount),
    checkAmount(action.receivedAmount),
    checkMaxAmount(action.receivedAmount, ctx.totalWithTax),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const amount = Math.round(action.amount)
  const received = Math.round(action.receivedAmount)

  const rcvCheck = checkReceived(received, amount)
  if (rcvCheck) return { error: rcvCheck, message: 'Received amount must be >= amount due' }

  const result = recordCashPayment(ctx.store.id, ctx.session.id, amount, received)
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { payment: result.payment, change: result.change } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    case 'INSUFFICIENT_RECEIVED': return 'Received amount must be >= amount due'
    case 'AMOUNT_EXCEEDS_MAXIMUM': return 'Amount exceeds maximum allowed'
    default: return code
  }
}
