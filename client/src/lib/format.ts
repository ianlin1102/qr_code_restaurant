/** Convert cents to display price string, e.g. 1599 → "15.99" */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Convert cents to display with currency, e.g. 1599 → "$15.99" */
export function formatPriceUSD(cents: number): string {
  return `$${formatPrice(cents)}`
}
