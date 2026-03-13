import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function LangSelectPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  const selectLang = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('i18n-lang', lang)
    navigate(`/scan/${storeId}/${tableId}`, { replace: true })
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8 p-4 pb-safe">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">请选择语言</h1>
        <p className="text-lg text-muted-foreground">Please select your language</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button size="lg" className="text-lg py-6" onClick={() => selectLang('zh')}>
          中文
        </Button>
        <Button size="lg" variant="outline" className="text-lg py-6" onClick={() => selectLang('en')}>
          English
        </Button>
      </div>
    </div>
  )
}
