import type { SettlementAction, SettlementContext, SettlementResult } from './types'
import { createError, httpStatus } from './errors'
import type { ErrorCode } from './errors'
import { computeAllowedActions, EMPTY_ACTIONS } from './allowed-actions'
import { logSettlement } from './logger'
import {
  sessionStore, orderStore, paymentStore, storeStore, splitBillStore,
} from '../repositories/stores'
import { getSplitBills, buildAssignedQtyMap, getMainBillSummary } from '../controllers/split-bill.service'
import { getSessionSummary } from '../controllers/session.service'

import { execute as payItems } from './actions/pay-items'
import { execute as payPercent } from './actions/pay-percent'
import { execute as cashPayment } from './actions/cash-payment'
import { execute as addPaymentAction } from './actions/add-payment'
import { execute as createSplit } from './actions/create-split'
import { executeCard as paySplitCard, executeCash as paySplitCash } from './actions/pay-split'
import { execute as deleteSplit } from './actions/delete-split'
import { execute as closeSessionAction } from './actions/close-session'
import { execute as reopenSessionAction } from './actions/reopen-session'

function loadContext(storeId: string, sessionId: string): SettlementContext | null {
  const store = storeStore.getById(storeId)
  const session = sessionStore.getById(sessionId)
  if (!store || !session || session.storeId !== storeId) return null

  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean) as any[]
  const payments = paymentStore.getByField('sessionId', sessionId)
  const splits = getSplitBills(sessionId)

  // Build paid qty map
  const paidQtyMap = new Map<string, number>()
  for (const pid of session.paidItemIds ?? []) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }

  const assignedQtyMap = buildAssignedQtyMap(splits)

  // Calculate remaining
  const summary = getSessionSummary(storeId, sessionId)
  const remaining = summary?.remaining ?? 0
  const mainBill = getMainBillSummary(sessionId, storeId)
  const mainBillTotal = mainBill?.total ?? 0

  return {
    store, session, orders, payments, splits,
    paidQtyMap, assignedQtyMap, remaining, mainBillTotal,
  }
}

export function executeSettlement(
  storeId: string,
  sessionId: string,
  action: SettlementAction,
): SettlementResult {
  const ctx = loadContext(storeId, sessionId)
  if (!ctx) {
    const err = createError('SESSION_NOT_FOUND', 'Session not found', EMPTY_ACTIONS)
    return err
  }

  const allowed = computeAllowedActions(ctx)

  let actionResult: { data: Record<string, unknown> } | { error: string; message: string; details?: Record<string, unknown> }

  switch (action.type) {
    case 'pay-items':       actionResult = payItems(ctx, action); break
    case 'pay-percent':     actionResult = payPercent(ctx, action); break
    case 'cash-payment':    actionResult = cashPayment(ctx, action); break
    case 'add-payment':     actionResult = addPaymentAction(ctx, action); break
    case 'create-split':    actionResult = createSplit(ctx, action); break
    case 'pay-split-card':  actionResult = paySplitCard(ctx, action); break
    case 'pay-split-cash':  actionResult = paySplitCash(ctx, action); break
    case 'delete-split':    actionResult = deleteSplit(ctx, action); break
    case 'close-session':   actionResult = closeSessionAction(ctx); break
    case 'reopen-session':  actionResult = reopenSessionAction(ctx); break
    default:
      actionResult = { error: 'INVALID_AMOUNT', message: 'Unknown action type' }
  }

  // Reload context for fresh allowedActions after mutation
  const freshCtx = loadContext(storeId, sessionId)
  const freshAllowed = freshCtx ? computeAllowedActions(freshCtx) : allowed
  const freshRemaining = freshCtx?.remaining ?? ctx.remaining
  const sessionStatus = freshCtx?.session.status === 'closed' ? 'closed' as const
    : freshRemaining <= 0 ? 'paid' as const : 'active' as const

  let result: SettlementResult

  if ('error' in actionResult) {
    result = createError(
      actionResult.error as ErrorCode,
      actionResult.message,
      freshAllowed,
      actionResult.details,
    )
  } else {
    result = {
      ok: true,
      data: actionResult.data,
      sessionStatus,
      remaining: freshRemaining,
      allowedActions: freshAllowed,
    }
  }

  logSettlement(ctx, action, result)
  return result
}

export { httpStatus } from './errors'
