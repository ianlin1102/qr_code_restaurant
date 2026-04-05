import { useAuthStore } from '@/stores/auth-store'
import WaitlistPanel from '@/components/floor/WaitlistPanel'

export default function WaitlistPage() {
  const storeId = useAuthStore(s => s.user?.storeId)
  if (!storeId) return null
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <WaitlistPanel storeId={storeId} />
    </div>
  )
}
