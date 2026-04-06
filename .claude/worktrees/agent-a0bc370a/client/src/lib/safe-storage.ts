import type { StateStorage } from 'zustand/middleware'

/**
 * Safe localStorage wrapper for Zustand persist.
 * Recovers from corrupted data (e.g., invalid characters) by clearing and returning null.
 */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      return raw ? JSON.parse(raw) : null
    } catch {
      localStorage.removeItem(name)
      return null
    }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, JSON.stringify(value)) } catch { /* ignore */ }
  },
  removeItem: (name) => localStorage.removeItem(name),
}
