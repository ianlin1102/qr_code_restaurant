/** Convert cents to display price string, e.g. 3800 → "38.00" */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Convert cents to display with currency, e.g. 3800 → "¥38.00" */
export function formatPriceCNY(cents: number): string {
  return `¥${formatPrice(cents)}`
}
