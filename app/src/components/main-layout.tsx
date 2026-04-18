'use client'

import { useState, useMemo } from 'react'
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
  const [sortAsc, setSortAsc] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activityList, setActivityList] = useState(activities)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    groups.length > 0 ? groups[0].id : null
  )
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})

  const activeGroup = groups.find(g => g.id === activeGroupId)

  const filtered = useMemo(() => {
    let list = activeGroupId
      ? activityList.filter(a => a.group_id === activeGroupId)
      : activityList
    if (category !== 'all') list = list.filter(a => a.type === category)
    list = [...list].sort((a, b) => {
      const ta = a.event_time ? new Date(a.event_time).getTime() : Infinity
      const tb = b.event_time ? new Date(b.event_time).getTime() : Infinity
      return sortAsc ? ta - tb : tb - ta
    })
    return list
  }, [activityList, activeGroupId, category, sortAsc])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function switchGroup(groupId: string) {
    setActiveGroupId(groupId)
    setSelected(null)
    setShowCreate(false)

    // fetch members for this group if not cached
    if (!groupMembers[groupId]) {
      const supabase = createClient()
      const { data: gm } = await supabase
        .from('group_members').select('user_id').eq('group_id', groupId)
      if (gm && gm.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, name, avatar_url')
          .in('id', gm.map((m: any) => m.user_id))
        setGroupMembers(prev => ({ ...prev, [groupId]: profiles ?? [] }))
      }
    }
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

  const currentMembers = activeGroupId
    ? (groupMembers[activeGroupId] ?? members.filter(m =>
        // fallback: show all members if not yet fetched per group
        members.some(x => x.id === m.id)
      ))
    : members

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-lg font-bold">🗓️ GroupPlan</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.name}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700">退出</button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 border-r bg-white flex flex-col shrink-0">

          {/* Group tabs */}
          <div className="p-3 border-b">
            <p className="text-xs text-gray-400 mb-2 font-medium">群组</p>
            <div className="flex flex-col gap-1">
              {groups.map(g => (
                <button key={g.id} onClick={() => switchGroup(g.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeGroupId === g.id
                      ? 'bg-black text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {g.name}
                </button>
              ))}
              <Link href="/groups/new"
                className="text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-100 border border-dashed border-gray-200">
                + 新建群组
              </Link>
            </div>
          </div>

          {/* Category + sort */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">分类</p>
              <button onClick={() => setSortAsc(v => !v)}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
                {sortAsc ? '⬆ 时间升序' : '⬇ 时间降序'}
              </button>
            </div>
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
                    <button key={a.id}
                      onClick={() => { setSelected(a); setShowCreate(false) }}
                      className={`w-full text-left p-4 transition-colors ${
                        isSelected ? 'bg-gray-50 border-l-4 border-black' : 'hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs">{CATEGORIES.find(c => c.value === a.type)?.icon}</span>
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
          {activeGroupId && (
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
              groups={activeGroup ? [activeGroup] : groups}
              groupIds={activeGroupId ? [activeGroupId] : groupIds}
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
              key={selected.id}
              activity={selected}
              userId={user.id}
              members={currentMembers}
              onUpdate={refreshActivities}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-4">👈</p>
                <p className="text-sm">{activeGroup ? `${activeGroup.name} 的活动` : '选择一个群组'}</p>
                <p className="text-xs mt-1">点击左侧活动查看，或创建新活动</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
