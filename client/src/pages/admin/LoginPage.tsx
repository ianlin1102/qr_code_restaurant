import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/useT'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Store, User, Lock } from 'lucide-react'

export default function LoginPage() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)

  const [storeId, setStoreId] = useState(searchParams.get('store') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.login(storeId, username, password)
      setAuth(data.token, data.user)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[440px] bg-card rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-center">{t.login.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.login.managementPortal}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.login.storeId}
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" value={storeId} onChange={e => setStoreId(e.target.value)}
                placeholder="e.g. store-demo-002" required className="pl-9" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.login.username}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder={t.login.usernamePlaceholder} required autoFocus className="pl-9" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.login.password}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.login.passwordPlaceholder}
                required className="pl-9 pr-10" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading}
            className="w-full min-h-[44px] bg-primary hover:bg-primary/90 text-base">
            {loading ? t.login.submitting : t.login.submit}
          </Button>
          <div className="flex items-center justify-center gap-1.5 text-green-600 text-xs mt-3">
            <Lock className="h-3 w-3" />
            <span>{lang === 'zh' ? '安全加密连接' : 'Secure Encrypted Connection'}</span>
          </div>
        </form>
      </div>
    </div>
  )
}
