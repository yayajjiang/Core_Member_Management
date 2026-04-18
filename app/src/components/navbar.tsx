'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Navbar({ userName }: { userName: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <a href="/" className="text-lg font-bold text-gray-900">🗓️ GroupPlan</a>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{userName}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          退出
        </button>
      </div>
    </nav>
  )
}
