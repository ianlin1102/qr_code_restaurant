type SanitizeResult<T> = { value: T } | { error: string }

const MAX_AMOUNT = 10_000_000  // $100K in cents
const MAX_TIP = 10_000_000
const MAX_QUANTITY = 9999

/** Validate amount (cents). Must be positive finite integer. Hard reject on invalid. */
export function sanitizeAmount(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Amount must be a valid number' }
  }
  if (val <= 0) return { error: 'Amount must be greater than 0' }
  if (val > MAX_AMOUNT) return { error: 'Amount exceeds maximum allowed' }
  return { value: Math.round(val) }
}

/** Validate tip (cents). Graceful: negative -> 0, undefined -> 0. Cap at max. */
export function sanitizeTip(val: unknown): SanitizeResult<number> {
  if (val == null) return { value: 0 }
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Tip must be a valid number' }
  }
  if (val < 0) return { value: 0 }
  return { value: Math.round(Math.min(val, MAX_TIP)) }
}

/** Validate percent (1-100). Graceful: clamp to range. Hard reject NaN. */
export function sanitizePercent(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Percent must be a valid number' }
  }
  const clamped = Math.round(Math.max(1, Math.min(100, val)))
  return { value: clamped }
}

/** Validate quantity. Must be positive integer. Graceful: round floats, cap max. */
export function sanitizeQuantity(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Quantity must be a valid number' }
  }
  const rounded = Math.round(val)
  if (rounded < 1) return { error: 'Quantity must be at least 1' }
  return { value: Math.min(rounded, MAX_QUANTITY) }
}

/** Generic finite-number check with field name in error. Passes 0. */
export function requireFiniteNumber(
  val: unknown,
  field: string,
): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: `${field} must be a valid number` }
  }
  return { value: val }
}

const SCRIPT_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi
const TAG_RE = /<[^>]*>/g

function stripHtml(str: string): string {
  return str.replace(SCRIPT_STYLE_RE, '').replace(TAG_RE, '')
}

/** Sanitize short string: strip HTML, trim, truncate. Returns '' for non-string. */
export function sanitizeString(val: unknown, maxLength: number): string {
  if (typeof val !== 'string') return ''
  return stripHtml(val).trim().slice(0, maxLength)
}

/** Sanitize multiline text: strip HTML, preserve newlines, truncate. */
export function sanitizeText(val: unknown, maxLength: number): string {
  if (typeof val !== 'string') return ''
  return stripHtml(val).slice(0, maxLength)
}
