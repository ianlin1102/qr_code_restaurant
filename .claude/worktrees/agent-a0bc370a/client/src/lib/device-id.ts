const KEY = 'qr-device-id'

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(KEY, id)
  }
  return id
}
