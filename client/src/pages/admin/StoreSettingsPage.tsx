import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Store } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

export default function StoreSettingsPage() {
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
      setMessage({ type: 'error', text: '加载门店信息失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: '店名不能为空' })
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
      setMessage({ type: 'success', text: '保存成功' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">门店不存在</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">门店设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">店名 *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入店名"
            />
          </div>

          <div>
            <label className="text-sm font-medium">门店描述</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简短介绍你的餐厅"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">营业时间</label>
            <Input
              value={openingHours}
              onChange={e => setOpeningHours(e.target.value)}
              placeholder="例：周一至周五 10:00-22:00"
            />
          </div>

          <div>
            <label className="text-sm font-medium">门店公告</label>
            <Textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="顾客扫码后会看到此公告"
              rows={3}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
