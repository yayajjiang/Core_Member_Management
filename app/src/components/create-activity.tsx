'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const TYPES = [
  { value: 'dining', label: '🍜 吃饭' },
  { value: 'hiking', label: '🥾 Hiking' },
  { value: 'boardgame', label: '🎲 桌游' },
  { value: 'roadtrip', label: '🚗 Road Trip' },
  { value: 'other', label: '📌 其他' },
]

type Props = {
  groups: any[]
  groupIds: string[]
  userId: string
  onCreated: (activity: any) => void
  onCancel: () => void
}

export default function CreateActivity({ groups, groupIds, userId, onCreated, onCancel }: Props) {
  const [form, setForm] = useState({
    title: '', type: 'dining',
    group_id: groups[0]?.id ?? '',
    event_time: '', location: '', description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.group_id) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.from('activities').insert({
      title: form.title, type: form.type, group_id: form.group_id,
      event_time: form.event_time || null,
      location: form.location || null,
      description: form.description || null,
      created_by: userId,
    }).select('*, rsvps(status, user_id)').single()

    if (err || !data) { setError(err?.message ?? '创建失败'); setLoading(false); return }
    onCreated(data)
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h2 className="text-xl font-bold mb-6">创建活动</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="比如：周五火锅" value={form.title} autoFocus
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
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
            rows={3} placeholder="活动详情" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || !form.title}
            className="flex-1 bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {loading ? '创建中...' : '创建活动'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 border text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
