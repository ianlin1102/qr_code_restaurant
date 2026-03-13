import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Store } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

export default function StoreSettingsPage() {
  const { t } = useTranslation('admin')
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
    } catch (err) {
      setMessage({ type: 'error', text: t('storeSettings.loadFailed') })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: t('storeSettings.nameRequired') })
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
      })
      setStore(updated)
      setMessage({ type: 'success', text: t('storeSettings.saveSuccess') })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('storeSettings.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common:loading')}</p>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{t('storeSettings.storeNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <h1 className="text-2xl font-bold mb-6">{t('storeSettings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('storeSettings.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('storeSettings.storeName')}</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('storeSettings.storeNamePlaceholder')}
              className="text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('storeSettings.description')}</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('storeSettings.descriptionPlaceholder')}
              className="text-base"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('storeSettings.hours')}</label>
            <Input
              value={openingHours}
              onChange={e => setOpeningHours(e.target.value)}
              placeholder={t('storeSettings.hoursPlaceholder')}
              className="text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('storeSettings.announcement')}</label>
            <Textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder={t('storeSettings.announcementPlaceholder')}
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
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="min-h-[44px] w-full md:w-auto">
              {saving ? t('common:saving') : t('common:save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
