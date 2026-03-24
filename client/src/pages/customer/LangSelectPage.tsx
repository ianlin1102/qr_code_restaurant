import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, ChevronRight } from 'lucide-react'

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Globe icon */}
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">Select Your Language</h1>
          <p className="text-xl text-primary/80">选择语言</p>
          <p className="text-sm text-muted-foreground mt-2">Experience personalized service at your table.</p>
        </div>

        {/* Language cards */}
        <div className="w-full space-y-3">
          {/* Chinese — primary (filled) */}
          <button onClick={() => selectLang('zh')}
            className="w-full flex items-center justify-between px-5 py-5 rounded-2xl bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors relative overflow-hidden group">
            <div>
              <p className="text-2xl font-bold">中文</p>
              <p className="text-sm text-white/70">Chinese Traditional / Simplified</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-0.5 transition-transform" />
            <span className="absolute right-4 top-2 text-6xl font-bold text-white/10 select-none">文</span>
          </button>

          {/* English — secondary (outlined) */}
          <button onClick={() => selectLang('en')}
            className="w-full flex items-center justify-between px-5 py-5 rounded-2xl border-2 border-primary/20 bg-card hover:bg-primary/5 transition-colors group">
            <div>
              <p className="text-2xl font-bold text-primary">English</p>
              <p className="text-sm text-muted-foreground">International Standard</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/40 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Table verification badge */}
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground mt-4">
          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            TABLE {tableId?.slice(-2)?.toUpperCase() || '??'} ACTIVE
          </span>
        </div>
      </div>
    </div>
  )
}
