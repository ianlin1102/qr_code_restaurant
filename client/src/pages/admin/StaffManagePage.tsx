import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AuthUser, RoleDefinition, Permission } from '@qr-order/shared'

const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read', 'menu:write',
  'tables:read', 'tables:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'staff:manage',
  'settings:read', 'settings:write',
]

type Form = { username: string; password: string; role: string }
const EMPTY: Form = { username: '', password: '', role: 'waiter' }

export default function StaffManagePage() {
  const { t, lang } = useT()
  const storeId = useAuthStore(s => s.user?.storeId)
  const currentUserId = useAuthStore(s => s.user?.id)
  const [staff, setStaff] = useState<AuthUser[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', nameEn: '', permissions: [] as Permission[] })
  const [tab, setTab] = useState<'staff' | 'roles'>('staff')

  const fetchData = useCallback(async () => {
    if (!storeId) return
    try {
      const [s, r] = await Promise.all([api.getStaff(storeId), api.getRoles(storeId)])
      setStaff(s); setRoles(r); setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchData() }, [fetchData])

  const permLabel = (p: string) => {
    const labels = (t.roles as Record<string, unknown>)?.permLabels as Record<string, string> | undefined
    return labels?.[p] ?? p
  }

  // Staff handlers
  const handleCreate = async () => {
    if (!storeId || !form.username.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      await api.createStaff(storeId, { username: form.username.trim(), password: form.password, role: form.role })
      setStaffDialogOpen(false); setForm(EMPTY); await fetchData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }
  const handleRoleChange = async (userId: string, role: string) => {
    if (!storeId) return
    try { await api.updateStaff(storeId, userId, { role }); await fetchData() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }
  const handleDelete = async (u: AuthUser) => {
    if (!storeId || !confirm(t.staff.confirmDelete)) return
    try { await api.deleteStaff(storeId, u.id); await fetchData() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }

  // Role handlers
  const openNewRole = () => {
    setEditingRole(null)
    setRoleForm({ name: '', nameEn: '', permissions: ['orders:read', 'menu:read'] })
    setRoleDialogOpen(true)
  }
  const openEditRole = (r: RoleDefinition) => {
    setEditingRole(r)
    setRoleForm({ name: r.name, nameEn: r.nameEn ?? '', permissions: [...r.permissions] })
    setRoleDialogOpen(true)
  }
  const handleSaveRole = async () => {
    if (!storeId || !roleForm.name.trim()) return
    setSaving(true)
    try {
      if (editingRole) {
        await api.updateRole(storeId, editingRole.id, {
          name: roleForm.name, nameEn: roleForm.nameEn || undefined, permissions: roleForm.permissions,
        })
      } else {
        await api.createRole(storeId, {
          name: roleForm.name, nameEn: roleForm.nameEn || undefined, permissions: roleForm.permissions,
        })
      }
      setRoleDialogOpen(false); await fetchData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }
  const handleDeleteRole = async (r: RoleDefinition) => {
    if (!storeId || !confirm(t.roles.confirmDelete)) return
    try { await api.deleteRole(storeId, r.id); await fetchData() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }
  const togglePerm = (p: Permission) => {
    setRoleForm(f => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p],
    }))
  }

  const ownerCount = staff.filter(s => s.role === 'owner').length
  const canDelete = (u: AuthUser) => u.id !== currentUserId && !(u.role === 'owner' && ownerCount <= 1)
  const roleByName = (name: string) => roles.find(r => r.name === name)

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t.staff.loading}</p></div>

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab('staff')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
          {t.staff.title}
        </button>
        <button onClick={() => setTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
          {t.roles.title}
        </button>
      </div>

      {/* ── Staff Tab ── */}
      {tab === 'staff' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">
              {t.staff.title}
              <span className="text-muted-foreground font-normal text-sm ml-1.5">
                / {lang === 'zh' ? 'Staff' : '员工'}
              </span>
            </CardTitle>
            <Button size="sm" onClick={() => { setForm(EMPTY); setStaffDialogOpen(true) }}>
              {t.staff.newStaff}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {staff.map(m => {
              const role = roleByName(m.role)
              return (
                <div key={m.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold bg-blue-500 shrink-0">
                      {m.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {m.username}
                        {m.id === currentUserId && <Badge variant="outline" className="ml-2 text-[10px]">{t.staff.you}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {role ? `${role.nameEn || role.name} — ${role.permissions.length} permissions` : m.role}
                      </p>
                    </div>
                  </div>
                  {(m.id !== currentUserId || canDelete(m)) && (
                    <div className="flex items-center gap-2 pl-12">
                      {m.id !== currentUserId && (
                        <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                          <SelectTrigger className="w-32 min-h-[44px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.name} value={r.name}>{r.nameEn || r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {canDelete(m) && (
                        <Button variant="outline" size="sm" className="text-red-600 min-h-[44px]" onClick={() => handleDelete(m)}>
                          {t.common.delete}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {staff.length === 0 && <p className="text-muted-foreground text-center py-8">{t.staff.noStaff}</p>}
          </CardContent>
        </Card>
      )}

      {/* ── Roles Tab ── */}
      {tab === 'roles' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">
              {t.roles.title}
              <span className="text-muted-foreground font-normal text-sm ml-1.5">
                / {lang === 'zh' ? 'Roles' : '角色'}
              </span>
            </CardTitle>
            <Button size="sm" onClick={openNewRole}>{t.roles.newRole}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map(r => (
              <div key={r.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.nameEn || r.name}</span>
                    {r.isSystem && <Badge variant="secondary" className="text-[10px]">{t.roles.system}</Badge>}
                    {!r.isSystem && <Badge variant="outline" className="text-[10px]">{t.roles.custom}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {!(r.isSystem && r.name === 'owner') && (
                      <Button variant="outline" size="sm" onClick={() => openEditRole(r)}>{t.common.edit}</Button>
                    )}
                    {!r.isSystem && (
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteRole(r)}>
                        {t.common.delete}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.map(p => (
                    <Badge key={p} variant="secondary" className="text-[10px] font-normal">{permLabel(p)}</Badge>
                  ))}
                </div>
              </div>
            ))}
            {roles.length === 0 && <p className="text-muted-foreground text-center py-8">No roles</p>}
          </CardContent>
        </Card>
      )}

      {/* ── Add Staff Dialog ── */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader><DialogTitle>{t.staff.addTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t.staff.username}</label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder={t.staff.usernamePlaceholder} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium">{t.staff.password}</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={t.staff.passwordPlaceholder} />
            </div>
            <div>
              <label className="text-sm font-medium">{t.staff.role}</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.name} value={r.name}>
                      <div>
                        <span>{r.nameEn || r.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">({r.permissions.length} perms)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show permissions preview for selected role */}
              {form.role && (() => {
                const role = roleByName(form.role)
                if (!role) return null
                return (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.map(p => (
                      <Badge key={p} variant="secondary" className="text-[10px] font-normal">{permLabel(p)}</Badge>
                    ))}
                  </div>
                )
              })()}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleCreate} disabled={saving || !form.username.trim() || !form.password.trim()}>
                {saving ? t.staff.saving : t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit/Create Role Dialog ── */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{editingRole ? `${t.common.edit}: ${editingRole.nameEn || editingRole.name}` : t.roles.newRole}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t.roles.roleName} (中文)</label>
                <Input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">{t.roles.roleName} (EN)</label>
                <Input value={roleForm.nameEn} onChange={e => setRoleForm(f => ({ ...f, nameEn: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t.roles.permissions}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(p)}
                      onChange={() => togglePerm(p)}
                      className="rounded"
                    />
                    <span>{permLabel(p)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleSaveRole} disabled={saving || !roleForm.name.trim()}>
                {saving ? t.common.saving : t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
