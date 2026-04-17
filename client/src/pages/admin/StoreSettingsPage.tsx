import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { Store } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'
import { ExternalLink } from 'lucide-react'

export default function StoreSettingsPage() {
  const { t, lang } = useT()
  const STORE_ID = useAuthStore(s => s.user!.storeId)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [autoAccept, setAutoAccept] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'pay-first' | 'pay-later'>('pay-first')
  const [announcementEn, setAnnouncementEn] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [serviceFeeRate, setServiceFeeRate] = useState('')
  const [tipBase, setTipBase] = useState<'pretax' | 'posttax'>('pretax')

  useEffect(() => {
    loadStore()
  }, [])

  const loadStore = async () => {
    try {
      const data = await api.getStore(STORE_ID)
      setStore(data)
      setName(data.name)
      setDescription(data.description ?? '')
      setOpeningHours(data.openingHours ?? '')
      setAnnouncement(data.announcement ?? '')
      setAutoAccept(data.autoAcceptOrders ?? false)
      setPaymentMode(data.paymentMode ?? 'pay-first')
      setAnnouncementEn(data.announcementEn ?? '')
      setTaxRate(data.taxRate != null ? String(data.taxRate) : '')
      setServiceFeeRate(data.serviceFeeRate != null ? String(data.serviceFeeRate) : '')
      setTipBase(data.tipBase ?? 'pretax')
    } catch (err) {
      setMessage({ type: 'error', text: t.settings.loadFailed })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: t.settings.nameRequired })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const updated = await api.updateStore(STORE_ID, {
        name: name.trim(),
        description: description.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        announcement: announcement.trim() || undefined,
        autoAcceptOrders: autoAccept,
        paymentMode,
        announcementEn: announcementEn.trim() || undefined,
        taxRate: taxRate ? Number(taxRate) : undefined,
        serviceFeeRate: serviceFeeRate ? Number(serviceFeeRate) : undefined,
        tipBase,
      })
      setStore(updated)
      setMessage({ type: 'success', text: t.settings.saveSuccess })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t.settings.saveFailed })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{t.settings.storeNotFound}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-bold font-display">
          {t.settings.title}
          <span className="text-muted-foreground font-normal text-base ml-1.5">
            / {lang === 'zh' ? 'Store Settings' : '\u95E8\u5E97\u8BBE\u7F6E'}
          </span>
        </h1>
        <Button variant="outline" size="sm" className="self-start sm:self-auto min-h-[44px]" asChild>
          <a href={`/menu/${STORE_ID}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
            <ExternalLink className="h-4 w-4" />
            {t.settings.viewLiveStore}
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.settings.basicInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t.settings.storeName}</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.settings.storeNamePlaceholder}
              className="text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.description}</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t.settings.descriptionPlaceholder}
              className="text-base"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.openingHours}</label>
            <Input
              value={openingHours}
              onChange={e => setOpeningHours(e.target.value)}
              placeholder={t.settings.hoursPlaceholder}
              className="text-base"
            />
          </div>

          <div className="flex items-start justify-between gap-4 py-2">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium">{t.settings.autoAccept}</label>
              <p className="text-xs text-muted-foreground">{t.settings.autoAcceptDesc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <Switch checked={autoAccept} onCheckedChange={v => setAutoAccept(v)} />
              <span className="text-xs text-muted-foreground">
                {autoAccept ? t.settings.enabled : t.settings.disabled}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 py-2">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium">{t.settings.paymentMode || 'Payment Mode'}</label>
              <p className="text-xs text-muted-foreground">{t.settings.paymentModeDesc || 'Pay First: customer pays before ordering; Pay Later: customer orders first, settles at the end'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <Switch checked={paymentMode === 'pay-later'} onCheckedChange={v => setPaymentMode(v ? 'pay-later' : 'pay-first')} />
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {paymentMode === 'pay-later' ? (t.settings.payLater || 'Pay Later') : (t.settings.payFirst || 'Pay First')}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.taxRate}</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.001}
              value={taxRate}
              onChange={e => setTaxRate(e.target.value)}
              placeholder="8.875"
              className="text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{t.settings.taxRateDesc}</p>
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.serviceFeeRate}</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={serviceFeeRate}
              onChange={e => setServiceFeeRate(e.target.value)}
              placeholder="15"
              className="text-base mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{t.settings.serviceFeeRateDesc}</p>
          </div>

          <div className="flex items-start justify-between gap-4 py-2">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium">{t.settings.tipBase || 'Tip Base'}</label>
              <p className="text-xs text-muted-foreground">{t.settings.tipBaseDesc || 'Pretax: tip percentage on subtotal. Posttax: tip percentage on subtotal + tax.'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <Switch checked={tipBase === 'posttax'} onCheckedChange={v => setTipBase(v ? 'posttax' : 'pretax')} />
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {tipBase === 'posttax' ? (t.settings.tipBasePosttax || 'Posttax') : (t.settings.tipBasePretax || 'Pretax')}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.announcement}</label>
            <Textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder={t.settings.announcementPlaceholder}
              className="text-base"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t.settings.announcementEn || 'English Announcement'}</label>
            <Textarea
              value={announcementEn}
              onChange={e => setAnnouncementEn(e.target.value)}
              placeholder={t.settings.announcementEnPlaceholder || 'English version of announcement (optional)'}
              className="text-base"
              rows={3}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="min-h-[44px] w-full md:w-auto bg-primary hover:bg-primary/90">
              {saving ? t.common.saving : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
