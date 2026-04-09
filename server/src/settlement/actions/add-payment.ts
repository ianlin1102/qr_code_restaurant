import type { SettlementContext } from '../types'
import { checkNotClosed, checkAmount, checkMaxAmount } from '../rules'
import { addPayment } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: {
  type: 'add-payment'; amount: number; paidBy: string; tipAmount?: number; stripePaymentIntentId?: string
}) {
  const checks = [
    checkNotClosed(ctx),
    checkAmount(action.amount),
    checkMaxAmount(action.amount, ctx.totalWithTax),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const amount = Math.round(action.amount)
  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const result = addPayment(
    ctx.store.id, ctx.session.id, amount,
    action.paidBy || 'customer', action.stripePaymentIntentId, tip,
  )
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { payment: result.payment } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    case 'AMOUNT_EXCEEDS_MAXIMUM': return 'Amount exceeds maximum allowed'
    default: return code
  }
}
