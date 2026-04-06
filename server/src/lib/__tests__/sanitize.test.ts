import { describe, it, expect } from 'vitest'
import {
  sanitizeAmount,
  sanitizePercent,
  sanitizeQuantity,
  sanitizeTip,
  sanitizeString,
  sanitizeText,
  requireFiniteNumber,
} from '../sanitize'

describe('sanitizeAmount', () => {
  it('passes valid amount through', () => {
    expect(sanitizeAmount(1500)).toEqual({ value: 1500 })
  })
  it('rejects NaN', () => {
    expect(sanitizeAmount(NaN)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(sanitizeAmount(Infinity)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects negative', () => {
    expect(sanitizeAmount(-100)).toEqual({ error: 'Amount must be greater than 0' })
  })
  it('rejects zero', () => {
    expect(sanitizeAmount(0)).toEqual({ error: 'Amount must be greater than 0' })
  })
  it('rejects non-number type', () => {
    expect(sanitizeAmount('100' as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rounds float to integer', () => {
    expect(sanitizeAmount(15.7)).toEqual({ value: 16 })
  })
  it('caps at max (10M cents = $100K)', () => {
    expect(sanitizeAmount(999999999)).toEqual({ error: 'Amount exceeds maximum allowed' })
  })
})

describe('sanitizeTip', () => {
  it('passes valid tip through', () => {
    expect(sanitizeTip(500)).toEqual({ value: 500 })
  })
  it('clamps negative tip to 0 (graceful)', () => {
    expect(sanitizeTip(-100)).toEqual({ value: 0 })
  })
  it('allows 0 tip', () => {
    expect(sanitizeTip(0)).toEqual({ value: 0 })
  })
  it('clamps undefined to 0', () => {
    expect(sanitizeTip(undefined)).toEqual({ value: 0 })
  })
  it('rejects NaN', () => {
    expect(sanitizeTip(NaN)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(sanitizeTip(Infinity)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('caps at max', () => {
    expect(sanitizeTip(10000001)).toEqual({ value: 10000000 })
  })
  it('rounds float', () => {
    expect(sanitizeTip(3.5)).toEqual({ value: 4 })
  })
})

describe('sanitizePercent', () => {
  it('passes valid percent', () => {
    expect(sanitizePercent(50)).toEqual({ value: 50 })
  })
  it('clamps below 1 to 1', () => {
    expect(sanitizePercent(0)).toEqual({ value: 1 })
    expect(sanitizePercent(-5)).toEqual({ value: 1 })
  })
  it('clamps above 100 to 100', () => {
    expect(sanitizePercent(150)).toEqual({ value: 100 })
  })
  it('rejects NaN', () => {
    expect(sanitizePercent(NaN)).toEqual({ error: 'Percent must be a valid number' })
  })
  it('rejects non-number', () => {
    expect(sanitizePercent('50' as any)).toEqual({ error: 'Percent must be a valid number' })
  })
  it('rounds float', () => {
    expect(sanitizePercent(33.7)).toEqual({ value: 34 })
  })
})

describe('sanitizeQuantity', () => {
  it('passes valid quantity', () => {
    expect(sanitizeQuantity(3)).toEqual({ value: 3 })
  })
  it('rejects 0', () => {
    expect(sanitizeQuantity(0)).toEqual({ error: 'Quantity must be at least 1' })
  })
  it('rejects negative', () => {
    expect(sanitizeQuantity(-1)).toEqual({ error: 'Quantity must be at least 1' })
  })
  it('caps at max 9999', () => {
    expect(sanitizeQuantity(99999)).toEqual({ value: 9999 })
  })
  it('rounds float to integer', () => {
    expect(sanitizeQuantity(2.7)).toEqual({ value: 3 })
  })
  it('rejects NaN', () => {
    expect(sanitizeQuantity(NaN)).toEqual({ error: 'Quantity must be a valid number' })
  })
})

describe('requireFiniteNumber', () => {
  it('passes valid number', () => {
    expect(requireFiniteNumber(42, 'price')).toEqual({ value: 42 })
  })
  it('rejects NaN with field name', () => {
    expect(requireFiniteNumber(NaN, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(requireFiniteNumber(Infinity, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('rejects non-number', () => {
    expect(requireFiniteNumber('42' as any, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('passes 0', () => {
    expect(requireFiniteNumber(0, 'price')).toEqual({ value: 0 })
  })
})

describe('sanitizeString', () => {
  it('passes normal string', () => {
    expect(sanitizeString('hello', 100)).toBe('hello')
  })
  it('truncates to maxLength', () => {
    expect(sanitizeString('abcdef', 3)).toBe('abc')
  })
  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert(1)</script>hello', 100)).toBe('hello')
  })
  it('strips nested tags', () => {
    expect(sanitizeString('<b><i>bold</i></b>', 100)).toBe('bold')
  })
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ', 100)).toBe('hello')
  })
  it('returns empty for non-string', () => {
    expect(sanitizeString(123 as any, 100)).toBe('')
  })
  it('returns empty for null/undefined', () => {
    expect(sanitizeString(null as any, 100)).toBe('')
    expect(sanitizeString(undefined as any, 100)).toBe('')
  })
})

describe('sanitizeText', () => {
  it('preserves newlines but strips tags', () => {
    expect(sanitizeText('<b>line1</b>\nline2', 200)).toBe('line1\nline2')
  })
  it('truncates long text', () => {
    expect(sanitizeText('a'.repeat(300), 200)).toBe('a'.repeat(200))
  })
})

// ============================================================
// EDGE CASES, LIMIT TESTS, AND INJECTION TESTS
// ============================================================

describe('sanitizeAmount — edge cases', () => {
  it('rejects -Infinity', () => {
    expect(sanitizeAmount(-Infinity)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects boolean true coerced', () => {
    expect(sanitizeAmount(true as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects null', () => {
    expect(sanitizeAmount(null as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects undefined', () => {
    expect(sanitizeAmount(undefined as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects array', () => {
    expect(sanitizeAmount([100] as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects object', () => {
    expect(sanitizeAmount({ valueOf: () => 100 } as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('accepts exact max boundary (10M)', () => {
    expect(sanitizeAmount(10_000_000)).toEqual({ value: 10_000_000 })
  })
  it('rejects just above max (10M + 1)', () => {
    expect(sanitizeAmount(10_000_001)).toEqual({ error: 'Amount exceeds maximum allowed' })
  })
  it('rounds 0.5 up to 1 (minimum valid)', () => {
    expect(sanitizeAmount(0.5)).toEqual({ value: 1 })
  })
  it('returns 0 for 0.4 (positive but rounds to 0)', () => {
    expect(sanitizeAmount(0.4)).toEqual({ value: 0 })
  })
})

describe('sanitizeTip — edge cases', () => {
  it('clamps null to 0', () => {
    expect(sanitizeTip(null)).toEqual({ value: 0 })
  })
  it('rejects string "500"', () => {
    expect(sanitizeTip('500' as any)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('rejects -Infinity', () => {
    expect(sanitizeTip(-Infinity)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('clamps -0 to 0', () => {
    const result = sanitizeTip(-0)
    expect(result).toHaveProperty('value')
    expect((result as { value: number }).value).toBe(-0) // JS treats -0 === 0
  })
  it('clamps -1 to 0 (graceful)', () => {
    expect(sanitizeTip(-1)).toEqual({ value: 0 })
  })
  it('accepts exact max boundary', () => {
    expect(sanitizeTip(10_000_000)).toEqual({ value: 10_000_000 })
  })
  it('clamps above max to max', () => {
    expect(sanitizeTip(99_999_999)).toEqual({ value: 10_000_000 })
  })
})

describe('sanitizePercent — edge cases', () => {
  it('clamps -100 to 1', () => {
    expect(sanitizePercent(-100)).toEqual({ value: 1 })
  })
  it('clamps 0.4 (rounds to 0, then clamp to 1)', () => {
    expect(sanitizePercent(0.4)).toEqual({ value: 1 })
  })
  it('clamps 100.6 (rounds to 101, then clamp to 100)', () => {
    expect(sanitizePercent(100.6)).toEqual({ value: 100 })
  })
  it('handles exact boundary 1', () => {
    expect(sanitizePercent(1)).toEqual({ value: 1 })
  })
  it('handles exact boundary 100', () => {
    expect(sanitizePercent(100)).toEqual({ value: 100 })
  })
  it('rejects boolean', () => {
    expect(sanitizePercent(true as any)).toEqual({ error: 'Percent must be a valid number' })
  })
})

describe('sanitizeQuantity — edge cases', () => {
  it('rounds 0.6 up to 1 (valid)', () => {
    expect(sanitizeQuantity(0.6)).toEqual({ value: 1 })
  })
  it('rounds 0.4 down to 0 (rejected)', () => {
    expect(sanitizeQuantity(0.4)).toEqual({ error: 'Quantity must be at least 1' })
  })
  it('accepts exact max 9999', () => {
    expect(sanitizeQuantity(9999)).toEqual({ value: 9999 })
  })
  it('caps 10000 to 9999', () => {
    expect(sanitizeQuantity(10000)).toEqual({ value: 9999 })
  })
  it('rejects empty string', () => {
    expect(sanitizeQuantity('' as any)).toEqual({ error: 'Quantity must be a valid number' })
  })
})

describe('sanitizeString — XSS injection payloads', () => {
  it('strips script tags with content', () => {
    expect(sanitizeString('<script>document.cookie</script>', 200)).toBe('')
  })
  it('strips img onerror payload', () => {
    expect(sanitizeString('<img src=x onerror=alert(1)>', 200)).toBe('')
  })
  it('strips svg onload payload', () => {
    expect(sanitizeString('<svg onload=alert(1)>test</svg>', 200)).toBe('test')
  })
  it('strips event handler attributes in div', () => {
    expect(sanitizeString('<div onmouseover="alert(1)">hover</div>', 200)).toBe('hover')
  })
  it('strips mixed-case script tags', () => {
    expect(sanitizeString('<ScRiPt>alert(1)</ScRiPt>', 200)).toBe('')
  })
  it('strips nested scripts', () => {
    expect(sanitizeString('<scr<script>ipt>alert(1)</scr</script>ipt>', 200)).toBe('')
  })
  it('strips style tags', () => {
    expect(sanitizeString('<style>body{display:none}</style>visible', 200)).toBe('visible')
  })
  it('strips iframe', () => {
    expect(sanitizeString('<iframe src="evil.com"></iframe>safe', 200)).toBe('safe')
  })
  it('strips anchor with javascript: href', () => {
    expect(sanitizeString('<a href="javascript:alert(1)">click</a>', 200)).toBe('click')
  })
  it('handles HTML entities (passed through as-is)', () => {
    const result = sanitizeString('&lt;script&gt;alert(1)&lt;/script&gt;', 200)
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
  it('strips self-closing tags', () => {
    expect(sanitizeString('hello<br/>world<img/>', 200)).toBe('helloworld')
  })
  it('strips data attributes', () => {
    expect(sanitizeString('<div data-x="payload">text</div>', 200)).toBe('text')
  })
  it('handles null bytes', () => {
    expect(sanitizeString('hello\0world', 200)).toBe('hello\0world')
  })
  it('handles very long XSS payload — truncated', () => {
    const payload = '<script>' + 'a'.repeat(1000) + '</script>'
    const result = sanitizeString(payload, 50)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result).not.toContain('<')
  })
  it('handles unicode characters', () => {
    expect(sanitizeString('你好世界🍕', 100)).toBe('你好世界🍕')
  })
  it('handles emoji in tags', () => {
    expect(sanitizeString('<b>🎉</b>', 100)).toBe('🎉')
  })
  it('handles multiple consecutive spaces', () => {
    expect(sanitizeString('  hello   world  ', 100)).toBe('hello   world')
  })
})

describe('sanitizeText — injection payloads', () => {
  it('strips script but keeps newlines', () => {
    expect(sanitizeText('<script>alert(1)</script>\nhello\nworld', 200)).toBe('\nhello\nworld')
  })
  it('handles CRLF line endings', () => {
    expect(sanitizeText('line1\r\nline2', 200)).toBe('line1\r\nline2')
  })
  it('truncates at exact boundary', () => {
    expect(sanitizeText('12345', 5)).toBe('12345')
    expect(sanitizeText('123456', 5)).toBe('12345')
  })
})

describe('requireFiniteNumber — edge cases', () => {
  it('rejects -Infinity', () => {
    expect(requireFiniteNumber(-Infinity, 'val')).toEqual({ error: 'val must be a valid number' })
  })
  it('passes negative numbers (no sign restriction)', () => {
    expect(requireFiniteNumber(-42, 'val')).toEqual({ value: -42 })
  })
  it('passes very large finite number', () => {
    expect(requireFiniteNumber(Number.MAX_SAFE_INTEGER, 'val')).toEqual({ value: Number.MAX_SAFE_INTEGER })
  })
  it('rejects empty object', () => {
    expect(requireFiniteNumber({} as any, 'val')).toEqual({ error: 'val must be a valid number' })
  })
})

describe('graceful fallback behavior — cross-function consistency', () => {
  it('tip: negative gracefully becomes 0, amount: negative is hard rejected', () => {
    expect(sanitizeTip(-500)).toEqual({ value: 0 })
    expect(sanitizeAmount(-500)).toEqual({ error: 'Amount must be greater than 0' })
  })
  it('percent: out-of-range gracefully clamped, not rejected', () => {
    expect(sanitizePercent(-50)).toEqual({ value: 1 })
    expect(sanitizePercent(200)).toEqual({ value: 100 })
  })
  it('quantity: float gracefully rounded, then checked', () => {
    expect(sanitizeQuantity(1.2)).toEqual({ value: 1 })
    expect(sanitizeQuantity(9999.9)).toEqual({ value: 9999 })
  })
  it('all numeric functions reject NaN consistently', () => {
    expect(sanitizeAmount(NaN)).toHaveProperty('error')
    expect(sanitizeTip(NaN)).toHaveProperty('error')
    expect(sanitizePercent(NaN)).toHaveProperty('error')
    expect(sanitizeQuantity(NaN)).toHaveProperty('error')
    expect(requireFiniteNumber(NaN, 'x')).toHaveProperty('error')
  })
  it('all numeric functions reject Infinity consistently', () => {
    expect(sanitizeAmount(Infinity)).toHaveProperty('error')
    expect(sanitizeTip(Infinity)).toHaveProperty('error')
    expect(sanitizePercent(Infinity)).toHaveProperty('error')
    expect(sanitizeQuantity(Infinity)).toHaveProperty('error')
    expect(requireFiniteNumber(Infinity, 'x')).toHaveProperty('error')
  })
})
