/**
 * Sanitize a dollar-amount input string so users cannot enter > 2 decimals,
 * multiple dots, negative signs, or non-numeric characters.
 * Safe to feed back into the same <input> on each keystroke.
 */
export function sanitizeDollarInput(raw: string): string {
  if (!raw) return ''
  let cleaned = raw.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot >= 0) {
    const intPart = cleaned.slice(0, firstDot)
    const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    cleaned = `${intPart}.${decPart}`
  }
  return cleaned
}

/**
 * Parse a sanitized dollar string into integer cents.
 * Returns null when the input is empty or not a finite non-negative number.
 */
export function dollarStringToCents(raw: string): number | null {
  if (!raw || raw === '.') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToDollarString(cents: number): string {
  return ((cents ?? 0) / 100).toFixed(2)
}
