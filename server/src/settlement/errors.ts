import type { AllowedActions, SettlementFailure } from './types'

export const ErrorCodes = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_CLOSED: 'SESSION_CLOSED',
  SESSION_NOT_CLOSED: 'SESSION_NOT_CLOSED',
  SESSION_FULLY_PAID: 'SESSION_FULLY_PAID',
  SESSION_NOT_FULLY_PAID: 'SESSION_NOT_FULLY_PAID',
  SETTLEMENT_MODE_CONFLICT: 'SETTLEMENT_MODE_CONFLICT',
  ITEM_ALREADY_PAID: 'ITEM_ALREADY_PAID',
  ITEM_ALREADY_ASSIGNED: 'ITEM_ALREADY_ASSIGNED',
  AMOUNT_BELOW_MINIMUM: 'AMOUNT_BELOW_MINIMUM',
  REMAINING_BELOW_MINIMUM: 'REMAINING_BELOW_MINIMUM',
  INSUFFICIENT_RECEIVED: 'INSUFFICIENT_RECEIVED',
  SPLIT_NOT_FOUND: 'SPLIT_NOT_FOUND',
  SPLIT_ALREADY_PAID: 'SPLIT_ALREADY_PAID',
  INVALID_PERCENT: 'INVALID_PERCENT',
  INVALID_ITEM_KEY: 'INVALID_ITEM_KEY',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AMOUNT_EXCEEDS_MAXIMUM: 'AMOUNT_EXCEEDS_MAXIMUM',
  MODULE_NOT_LICENSED: 'MODULE_NOT_LICENSED',
} as const

export type ErrorCode = keyof typeof ErrorCodes

export function createError(
  code: ErrorCode,
  message: string,
  allowedActions: AllowedActions,
  details?: Record<string, unknown>,
): SettlementFailure {
  return { ok: false, code, message, allowedActions, ...(details ? { details } : {}) }
}

/** Map error code to HTTP status */
export function httpStatus(code: ErrorCode): number {
  switch (code) {
    case 'SESSION_NOT_FOUND':
    case 'SPLIT_NOT_FOUND':
      return 404
    case 'MODULE_NOT_LICENSED':
      return 403
    default:
      return 400
  }
}
