// Demo tables A01 - A10.
// Schema post-Mode C δ bucket 1 (75fd9084): name + number are canonical.
// qrCode is the URL-safe slug rendered in QR codes — must be globally unique.

export const DEMO_TABLES = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  const name = `A${n.toString().padStart(2, '0')}`  // A01, A02, …
  return {
    id: `00000000-0000-0000-0000-0000000t${n.toString().padStart(4, '0')}`,
    name,
    number: n,
    qrCode: `demo-${name.toLowerCase()}`,
    capacity: 4,
  }
})
