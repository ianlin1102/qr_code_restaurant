import { type ReactNode, useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Coupon, DiscountType } from '@qr-order/shared'

type Form = { code: string; discountType: DiscountType; discountValue: string
  minOrderAmount: string; maxUses: string; expiresAt: string; active: boolean }
const EMPTY: Form = { code: '', discountType: 'percentage', discountValue: '',
  minOrderAmount: '', maxUses: '', expiresAt: '', active: true }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="text-sm font-medium">{label}</label>{children}</div>
}

function fmtDiscount(dt: DiscountType, v: number) {
  return dt === 'percentage' ? `${v}%` : dt === 'fixed' ? formatPriceUSD(v) : 'BOGO'
}

export default function CouponManagePage() {
  const { t, lang } = useT()
  const storeId = useAuthStore(s => s.user?.storeId)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCoupons = useCallback(async () => {
    if (!storeId) return
    try {
      setCoupons(await api.getCoupons(storeId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setDialogOpen(true) }
  const openEdit = (c: Coupon) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountType === 'bogo' ? '' : String(c.discountValue),
      minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.split('T')[0] : '',
      active: c.active,
    })
    setDialogOpen(true)
  }
  const errMsg = (err: unknown) => err instanceof Error ? err.message : 'Operation failed'

  const handleSave = async () => {
    if (!storeId || !form.code.trim()) return
    setSaving(true)
    try {
      const value = form.discountType === 'bogo' ? 0 : Number(form.discountValue)
      const data = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: value,
        active: form.active,
        ...(form.minOrderAmount ? { minOrderAmount: Number(form.minOrderAmount) } : {}),
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
      }
      if (editingId) {
        await api.updateCoupon(storeId, editingId, data)
      } else {
        await api.createCoupon(storeId, data)
      }
      setDialogOpen(false)
      await fetchCoupons()
    } catch (err) { setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: Coupon) => {
    if (!storeId) return
    try { await api.updateCoupon(storeId, c.id, { active: !c.active }); await fetchCoupons() }
    catch (err) { setError(errMsg(err)) }
  }

  const handleDelete = async (c: Coupon) => {
    if (!storeId || !confirm(t.coupons.confirmDelete)) return
    try { await api.deleteCoupon(storeId, c.id); await fetchCoupons() }
    catch (err) { setError(errMsg(err)) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t.coupons.loading}</p></div>
  )

  return (
    <div className="max-w-5xl mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">
            {t.coupons.title}
            <span className="text-muted-foreground font-normal text-sm ml-1.5">
              / {lang === 'zh' ? 'Coupons' : '\u4F18\u60E0\u5238'}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate} className="bg-primary hover:bg-primary/90">{t.coupons.newCoupon}</Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          {coupons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t.coupons.noCoupons}</p>
          ) : (<>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.coupons.code}</TableHead>
                    <TableHead>{t.coupons.discountType}</TableHead>
                    <TableHead>{t.coupons.minOrder}</TableHead>
                    <TableHead>{t.coupons.currentUses}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead>{t.coupons.expiresAt}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                      <TableCell>{fmtDiscount(c.discountType, c.discountValue)}</TableCell>
                      <TableCell>{c.minOrderAmount ? formatPriceUSD(c.minOrderAmount) : '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs">{c.currentUses}{c.maxUses ? `/${c.maxUses}` : ''}</span>
                          {c.maxUses && c.maxUses > 0 && (
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (c.currentUses / c.maxUses) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.active ? 'default' : 'secondary'}>
                          {c.active ? t.coupons.active : t.coupons.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="flex gap-2">
                        <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          {t.common.edit}
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(c)}>
                          {t.common.delete}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {coupons.map(c => (
                <div key={c.id} className="bg-card rounded-xl p-3 shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold">{c.code}</span>
                    <Badge>{c.active ? t.coupons.active : t.coupons.inactive}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fmtDiscount(c.discountType, c.discountValue)}</span>
                    <span className="text-muted-foreground">{c.currentUses}{c.maxUses ? `/${c.maxUses}` : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.minOrderAmount ? <span>{t.coupons.minOrder}: {formatPriceUSD(c.minOrderAmount)}</span> : null}
                    {c.expiresAt ? <span>{t.coupons.expiresAt}: {new Date(c.expiresAt).toLocaleDateString()}</span> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => openEdit(c)}>{t.common.edit}</Button>
                      <Button variant="outline" size="sm" className="min-h-[44px] text-red-600" onClick={() => handleDelete(c)}>{t.common.delete}</Button>
                    </div>
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
            <DialogTitle>{editingId ? t.common.edit : t.coupons.createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label={t.coupons.code}>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder={t.coupons.codePlaceholder} className="uppercase" autoFocus />
            </Field>
            <Field label={t.coupons.discountType}>
              <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v as DiscountType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t.coupons.types.percentage}</SelectItem>
                  <SelectItem value="fixed">{t.coupons.types.fixed}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.discountType !== 'bogo' && (
              <Field label={form.discountType === 'percentage' ? t.coupons.percentageLabel : t.coupons.amountLabel}>
                <Input type="number" value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'} />
              </Field>
            )}
            <Field label={t.coupons.minOrderLabel}>
              <Input type="number" value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="e.g. 2000" />
            </Field>
            <Field label={t.coupons.maxUsesLabel}>
              <Input type="number" value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="e.g. 100" />
            </Field>
            <Field label={t.coupons.expiryLabel}>
              <Input type="date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleSave} disabled={saving || !form.code.trim()}>
                {saving ? t.coupons.saving : t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
