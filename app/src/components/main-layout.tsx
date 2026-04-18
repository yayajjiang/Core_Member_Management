'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ActivityDetail from './activity-detail'
import CreateActivity from './create-activity'

const CATEGORIES = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'dining', label: '吃饭', icon: '🍜' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' },
  { value: 'boardgame', label: '桌游', icon: '🎲' },
  { value: 'roadtrip', label: 'Road Trip', icon: '🚗' },
  { value: 'other', label: '其他', icon: '📌' },
]

function formatDate(dt: string | null) {
  if (!dt) return '时间待定'
  return new Date(dt).toLocaleString('zh-CN', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  user: { id: string; name: string }
  groups: any[]
  activities: any[]
  members: any[]
  groupIds: string[]
}

export default function MainLayout({ user, groups, activities, members, groupIds }: Props) {
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activityList, setActivityList] = useState(activities)

  const filtered = category === 'all'
    ? activityList
    : activityList.filter(a => a.type === category)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function refreshActivities() {
    const supabase = createClient()
    const { data } = await supabase
      .from('activities')
      .select('*, rsvps(status, user_id)')
      .in('group_id', groupIds)
      .neq('status', 'cancelled')
      .order('event_time', { ascending: true })
    if (data) setActivityList(data)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-lg font-bold">🗓️ GroupPlan</span>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {groups.map((g: any) => (
              <Link key={g.id} href={`/groups/${g.id}`}
                className="text-sm px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">
                {g.name}
              </Link>
            ))}
            <Link href="/groups/new"
              className="text-sm px-3 py-1 rounded-full border border-dashed text-gray-400 hover:text-gray-600">
              + 群组
            </Link>
          </div>
          <span className="text-sm text-gray-500">{user.name}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700">退出</button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r bg-white flex flex-col shrink-0">
          {/* Category tabs */}
          <div className="p-3 border-b">
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    category === c.value
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm">暂无活动</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((a: any) => {
                  const goingCount = (a.rsvps ?? []).filter((r: any) => r.status === 'going').length
                  const myRsvp = (a.rsvps ?? []).find((r: any) => r.user_id === user.id)
                  const isSelected = selected?.id === a.id
                  return (
                    <button key={a.id} onClick={() => { setSelected(a); setShowCreate(false) }}
                      className={`w-full text-left p-4 transition-colors ${isSelected ? 'bg-gray-50 border-l-2 border-black' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs text-gray-500">{CATEGORIES.find(c => c.value === a.type)?.icon}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {a.status === 'confirmed' ? '已确认' : '待确认'}
                        </span>
                        {myRsvp?.status === 'going' && <span className="text-xs ml-auto">✅</span>}
                      </div>
                      <p className="font-medium text-sm text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(a.event_time)}</p>
                      <p className="text-xs text-gray-400">{goingCount} 人参加</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Create button */}
          {groupIds.length > 0 && (
            <div className="p-3 border-t">
              <button onClick={() => { setShowCreate(true); setSelected(null) }}
                className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800">
                + 创建活动
              </button>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto">
          {showCreate ? (
            <CreateActivity
              groups={groups}
              groupIds={groupIds}
              userId={user.id}
              onCreated={async (activity) => {
                await refreshActivities()
                setShowCreate(false)
                setSelected(activity)
              }}
              onCancel={() => setShowCreate(false)}
            />
          ) : selected ? (
            <ActivityDetail
              activity={selected}
              userId={user.id}
              members={members}
              onUpdate={async () => {
                await refreshActivities()
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-4">👈</p>
                <p>选择一个活动，或创建新活动</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
