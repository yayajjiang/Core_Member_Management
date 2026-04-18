export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS: Record<string, string> = {
  dining: '🍜 吃饭',
  hiking: '🥾 Hiking',
  boardgame: '🎲 桌游',
  roadtrip: '🚗 Road Trip',
  other: '📌 其他',
}

const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
}

function formatDate(dt: string | null) {
  if (!dt) return '时间待定'
  return new Date(dt).toLocaleString('zh-CN', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m: any) => m.group_id)

  const { data: activities } = groupIds.length > 0
    ? await supabase
        .from('activities')
        .select('*, profiles(name), rsvps(status, user_id), groups(name)')
        .in('group_id', groupIds)
        .neq('status', 'cancelled')
        .order('event_time', { ascending: true })
    : { data: [] }

  const groups = (memberships ?? []).map((m: any) => m.groups)

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name ?? user.email ?? ''} />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Groups row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {groups.map((g: any) => (
              <Link key={g.id} href={`/groups/${g.id}`}
                className="text-sm px-3 py-1 rounded-full bg-white border hover:bg-gray-50 text-gray-700">
                {g.name}
              </Link>
            ))}
            <Link href="/groups/new"
              className="text-sm px-3 py-1 rounded-full border border-dashed text-gray-400 hover:text-gray-600">
              + 新建群组
            </Link>
          </div>
        </div>

        {/* Activities */}
        {(!activities || activities.length === 0) ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🎉</p>
            <p>还没有活动，创建第一个吧</p>
            {groups.length > 0 && (
              <Link href="/activities/new"
                className="mt-4 inline-block bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">
                创建活动
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-800">即将到来</h2>
              {groups.length > 0 && (
                <Link href="/activities/new"
                  className="text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
                  + 创建活动
                </Link>
              )}
            </div>
            {(activities as any[]).map((a) => {
              const goingCount = (a.rsvps ?? []).filter((r: any) => r.status === 'going').length
              const myRsvp = (a.rsvps ?? []).find((r: any) => r.user_id === user.id)
              return (
                <Link key={a.id} href={`/activities/${a.id}`}
                  className="block bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500">{TYPE_LABELS[a.type]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                          {a.status === 'proposed' ? '待确认' : a.status === 'confirmed' ? '已确认' : '已取消'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{a.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(a.event_time)}</p>
                      {a.location && <p className="text-sm text-gray-400">📍 {a.location}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-gray-600">{goingCount} 人参加</p>
                      {myRsvp && (
                        <p className="text-xs text-gray-400 mt-1">
                          {myRsvp.status === 'going' ? '✅ 去' : myRsvp.status === 'not_going' ? '❌ 不去' : '🤔 待定'}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{(a.groups as any)?.name}</p>
                </Link>
              )
            })}
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">👋</p>
            <p className="mb-4">先创建或加入一个群组</p>
            <Link href="/groups/new"
              className="inline-block bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800">
              创建群组
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
