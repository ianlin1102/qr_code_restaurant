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
  const [maxTables, setMaxTables] = useState(100)

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
      setMaxTables(data.maxTables ?? 100)
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
        maxTables,
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold font-display">
          {t.settings.title}
          <span className="text-muted-foreground font-normal text-base ml-1.5">
            / {lang === 'zh' ? 'Store Settings' : '\u95E8\u5E97\u8BBE\u7F6E'}
          </span>
        </h1>
        <Button variant="outline" size="sm" asChild>
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

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium">{t.settings.autoAccept}</label>
              <p className="text-xs text-muted-foreground">{t.settings.autoAcceptDesc}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={autoAccept} onCheckedChange={v => setAutoAccept(v)} />
              <span className="text-xs text-muted-foreground">
                {autoAccept ? t.settings.enabled : t.settings.disabled}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium">{t.settings.paymentMode || 'Payment Mode'}</label>
              <p className="text-xs text-muted-foreground">{t.settings.paymentModeDesc || 'Pay First: customer pays before ordering; Pay Later: customer orders first, settles at the end'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={paymentMode === 'pay-later'} onCheckedChange={v => setPaymentMode(v ? 'pay-later' : 'pay-first')} />
              <span className="text-xs text-muted-foreground min-w-[60px]">
                {paymentMode === 'pay-later' ? (t.settings.payLater || 'Pay Later') : (t.settings.payFirst || 'Pay First')}
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

          <div>
            <label className="text-sm font-medium">{'Max Tables'}</label>
            <p className="text-xs text-muted-foreground mb-1">{'Maximum number of table slots (default 100)'}</p>
            <Input
              type="number"
              min={1}
              max={999}
              value={maxTables}
              onChange={e => setMaxTables(parseInt(e.target.value) || 100)}
              className="w-32 text-base"
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
