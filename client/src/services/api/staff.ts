import type { AuthUser, RoleDefinition, TimeEntry } from '@qr-order/shared'
import { fetchJSON } from './_client'

export const staffApi = {
  // Staff Management
  getStaff: (storeId: string) =>
    fetchJSON<AuthUser[]>(`/stores/${storeId}/staff`),

  // Clock In/Out
  verifyClockPin: (storeId: string, pin: string) =>
    fetchJSON<{ user: { id: string; username: string }; clockedIn: boolean; currentEntry?: TimeEntry }>(
      `/stores/${storeId}/clock/pin`, { method: 'POST', body: JSON.stringify({ pin }) },
    ),

  clockIn: (storeId: string, pin: string) =>
    fetchJSON<TimeEntry>(`/stores/${storeId}/clock/in`, {
      method: 'POST', body: JSON.stringify({ pin }),
    }),

  clockOut: (storeId: string, pin: string) =>
    fetchJSON<TimeEntry>(`/stores/${storeId}/clock/out`, {
      method: 'POST', body: JSON.stringify({ pin }),
    }),

  getTimeEntries: (storeId: string, params?: { userId?: string; startDate?: string; endDate?: string }) => {
    const qs = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString() : ''
    return fetchJSON<TimeEntry[]>(`/stores/${storeId}/clock/entries${qs ? '?' + qs : ''}`)
  },

  createStaff: (storeId: string, data: { username: string; password: string; role: string; clockPin?: string }) =>
    fetchJSON<AuthUser>(`/stores/${storeId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaff: (storeId: string, userId: string, data: { role?: string; clockPin?: string }) =>
    fetchJSON<AuthUser>(`/stores/${storeId}/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteStaff: (storeId: string, userId: string) =>
    fetchJSON<void>(`/stores/${storeId}/staff/${userId}`, {
      method: 'DELETE',
    }),

  // Roles
  getRoles: (storeId: string) =>
    fetchJSON<RoleDefinition[]>(`/stores/${storeId}/roles`),

  createRole: (storeId: string, data: { name: string; nameEn?: string; permissions: string[] }) =>
    fetchJSON<RoleDefinition>(`/stores/${storeId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (storeId: string, roleId: string, data: { name?: string; nameEn?: string; permissions?: string[] }) =>
    fetchJSON<RoleDefinition>(`/stores/${storeId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRole: (storeId: string, roleId: string) =>
    fetchJSON<void>(`/stores/${storeId}/roles/${roleId}`, {
      method: 'DELETE',
    }),
}
