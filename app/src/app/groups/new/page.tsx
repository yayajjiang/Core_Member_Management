'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ensure profile exists
    await supabase.from('profiles').upsert(
      { id: user.id, name: user.user_metadata?.full_name ?? user.email },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single()

    if (groupError || !group) {
      setError(groupError?.message ?? '创建失败，请重试')
      setLoading(false)
      return
    }

    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6">新建群组</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="比如：Stanford 华人圈"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '创建中...' : '创建'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="w-full text-sm text-gray-500 hover:text-gray-800">
            取消
          </button>
        </form>
      </div>
    </div>
  )
}
