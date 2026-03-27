import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const { t } = useTranslation('common')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    try {
      const url = await api.uploadImage(file)
      onChange(url)
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('image.uploadFailed'))
      setPreview(null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localUrl)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const displayUrl = preview || value

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="preview"
            className="w-full max-w-[200px] aspect-video object-cover rounded-lg border"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">{t('image.uploading')}</span>
            </div>
          )}
          {!uploading && (
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                {t('image.change')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => { onChange(undefined); setPreview(null) }}
              >
                {t('image.remove')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full max-w-[200px] min-h-[120px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-muted-foreground"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="text-xs mt-2">{t('image.clickToUpload')}</span>
          <span className="text-xs text-muted-foreground">{t('image.hint')}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
