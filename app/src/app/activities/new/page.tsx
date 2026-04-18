'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const TYPES = [
  { value: 'dining', label: '🍜 吃饭' },
  { value: 'hiking', label: '🥾 Hiking' },
  { value: 'boardgame', label: '🎲 桌游' },
  { value: 'roadtrip', label: '🚗 Road Trip' },
  { value: 'other', label: '📌 其他' },
]

export default function NewActivityPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<any[]>([])
  const [form, setForm] = useState({
    title: '', type: 'dining', group_id: '',
    event_time: '', location: '', description: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', user.id)
      const gs = (data ?? []).map((m: any) => m.groups)
      setGroups(gs)
      if (gs.length > 0) setForm(f => ({ ...f, group_id: gs[0].id }))
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.group_id) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('activities').insert({
      title: form.title,
      type: form.type,
      group_id: form.group_id,
      event_time: form.event_time || null,
      location: form.location || null,
      description: form.description || null,
      created_by: user.id,
    }).select().single()

    if (!error && data) router.push(`/activities/${data.id}`)
    else setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="bg-white rounded-2xl border p-8 w-full max-w-lg">
        <h1 className="text-xl font-bold mb-6">创建活动</h1>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="比如：周五火锅" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">群组</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
            <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="地址或地点名称" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black resize-none"
              rows={3} placeholder="活动详情、注意事项等"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <button type="submit" disabled={loading || !form.title || !form.group_id}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {loading ? '创建中...' : '创建活动'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="w-full text-sm text-gray-500 hover:text-gray-800">取消</button>
        </form>
      </div>
    </div>
  )
}
