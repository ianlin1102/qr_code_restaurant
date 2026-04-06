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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AuthUser } from '@qr-order/shared'

type Form = { username: string; password: string; role: string }
const EMPTY: Form = { username: '', password: '', role: 'staff' }

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
]
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-medium">{text}</label>{children}</div>
}

export default function StaffManagePage() {
  const { t, lang } = useT()
  const storeId = useAuthStore(s => s.user?.storeId)
  const currentUserId = useAuthStore(s => s.user?.id)
  const [staff, setStaff] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchStaff = useCallback(async () => {
    if (!storeId) return
    try { setStaff(await api.getStaff(storeId)); setError(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const errMsg = (e: unknown) => e instanceof Error ? e.message : 'Operation failed'

  const handleCreate = async () => {
    if (!storeId || !form.username.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      await api.createStaff(storeId, {
        username: form.username.trim(), password: form.password, role: form.role,
      })
      setDialogOpen(false); setForm(EMPTY); await fetchStaff()
    } catch (e) { setError(errMsg(e)) }
    finally { setSaving(false) }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    if (!storeId) return
    try { await api.updateStaff(storeId, userId, { role }); await fetchStaff() }
    catch (e) { setError(errMsg(e)) }
  }

  const handleDelete = async (u: AuthUser) => {
    if (!storeId) return
    if (!confirm(t.staff.confirmDelete)) return
    try { await api.deleteStaff(storeId, u.id); await fetchStaff() }
    catch (e) { setError(errMsg(e)) }
  }

  const ownerCount = staff.filter(s => s.role === 'owner').length
  const canDelete = (u: AuthUser) =>
    u.id !== currentUserId && !(u.role === 'owner' && ownerCount <= 1)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">{t.staff.loading}</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">
            {t.staff.title}
            <span className="text-muted-foreground font-normal text-sm ml-1.5">
              / {lang === 'zh' ? 'Staff Management' : '\u5458\u5DE5\u7BA1\u7406'}
            </span>
          </CardTitle>
          <Button size="sm" onClick={() => { setForm(EMPTY); setDialogOpen(true) }}
            className="bg-primary hover:bg-primary/90">
            {t.staff.newStaff}
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          {staff.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t.staff.noStaff}
            </p>
          ) : (<>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.staff.username}</TableHead>
                    <TableHead>{t.staff.role}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(m => (
                    <TableRow key={m.id} className={m.id === currentUserId ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${avatarColor(m.username)}`}>
                            {initials(m.username)}
                          </span>
                          <span>
                            {m.username}
                            {m.id === currentUserId && (
                              <Badge variant="outline" className="ml-2">
                                {t.staff.you}
                              </Badge>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.id === currentUserId
                          ? <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
                              {m.role === 'owner' ? t.staff.roles.owner : t.staff.roles.staff}
                            </Badge>
                          : <RoleSelect value={m.role} onChange={v => handleRoleChange(m.id, v)} t={t} />}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="text-red-600"
                          disabled={!canDelete(m)} onClick={() => handleDelete(m)}>
                          {t.common.delete}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {staff.map(m => (
                <div key={m.id} className="bg-card rounded-xl p-3 shadow-card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${avatarColor(m.username)}`}>
                      {initials(m.username)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.username}
                        {m.id === currentUserId && <Badge variant="outline" className="ml-2">{t.staff.you}</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {m.id === currentUserId
                      ? <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{m.role === 'owner' ? t.staff.roles.owner : t.staff.roles.staff}</Badge>
                      : <RoleSelect value={m.role} onChange={v => handleRoleChange(m.id, v)} t={t} />}
                    <Button variant="outline" size="sm" className="text-red-600"
                      disabled={!canDelete(m)} onClick={() => handleDelete(m)}>{t.common.delete}</Button>
                  </div>
                </div>
              ))}
            </div>
          </>)}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{t.staff.addTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label text={t.staff.username}>
              <Input value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder={t.staff.usernamePlaceholder}
                autoFocus />
            </Label>
            <Label text={t.staff.password}>
              <Input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={t.staff.passwordPlaceholder} />
            </Label>
            <Label text={t.staff.role}>
              <RoleSelect value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} t={t} />
            </Label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleCreate}
                disabled={saving || !form.username.trim() || !form.password.trim()}>
                {saving ? t.staff.saving : t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoleSelect({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: ReturnType<typeof useT>['t'] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="owner">{t.staff.roles.owner}</SelectItem>
        <SelectItem value="staff">{t.staff.roles.staff}</SelectItem>
      </SelectContent>
    </Select>
  )
}
