export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import ActivityActions from './activity-actions'

const TYPE_LABELS: Record<string, string> = {
  dining: '🍜 吃饭', hiking: '🥾 Hiking',
  boardgame: '🎲 桌游', roadtrip: '🚗 Road Trip', other: '📌 其他',
}

function formatDate(dt: string | null) {
  if (!dt) return '时间待定'
  return new Date(dt).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  const { data: activity } = await supabase
    .from('activities')
    .select('*, groups(name, id)')
    .eq('id', id)
    .single()
  if (!activity) redirect('/')

  const { data: members } = await supabase
    .from('group_members')
    .select('profiles(id, name)')
    .eq('group_id', activity.group_id)

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('user_id, status, profiles(name)')
    .eq('activity_id', id)

  const { data: carpools } = await supabase
    .from('carpools')
    .select('*, profiles(name), carpool_assignments(user_id, profiles(name))')
    .eq('activity_id', id)

  const myRsvp = (rsvps ?? []).find((r: any) => r.user_id === user.id)
  const going = (rsvps ?? []).filter((r: any) => r.status === 'going')
  const maybe = (rsvps ?? []).filter((r: any) => r.status === 'maybe')
  const notGoing = (rsvps ?? []).filter((r: any) => r.status === 'not_going')

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name ?? ''} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
          <span className="text-gray-300">/</span>
          <Link href={`/groups/${activity.group_id}`} className="text-gray-400 hover:text-gray-600 text-sm">
            {(activity.groups as any)?.name}
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">{TYPE_LABELS[activity.type]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activity.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              activity.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {activity.status === 'proposed' ? '待确认' : activity.status === 'confirmed' ? '已确认' : '已取消'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{activity.title}</h1>
          <div className="space-y-1 text-sm text-gray-600">
            <p>🕐 {formatDate(activity.event_time)}</p>
            {activity.location && <p>📍 {activity.location}</p>}
          </div>
          {activity.description && (
            <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{activity.description}</p>
          )}
        </div>

        {/* Actions (RSVP + status change) */}
        <ActivityActions
          activityId={id}
          currentUserId={user.id}
          myRsvp={myRsvp?.status ?? null}
          activityStatus={activity.status}
          members={(members ?? []).map((m: any) => m.profiles)}
          rsvps={rsvps ?? []}
          carpools={carpools ?? []}
        />

        {/* RSVP summary */}
        <div className="bg-white rounded-xl border p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">参与情况</h2>
          <RsvpGroup label="✅ 参加" members={going} />
          <RsvpGroup label="🤔 待定" members={maybe} />
          <RsvpGroup label="❌ 不参加" members={notGoing} />
          {going.length + maybe.length + notGoing.length === 0 && (
            <p className="text-sm text-gray-400">还没有人回复</p>
          )}
        </div>

        {/* Carpools */}
        {(carpools ?? []).length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-3">🚗 车辆安排</h2>
            <div className="space-y-3">
              {(carpools as any[]).map(car => (
                <div key={car.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{car.profiles?.name} 的车</span>
                    <span className="text-xs text-gray-400">{(car.carpool_assignments ?? []).length}/{car.seats} 人</span>
                  </div>
                  {car.departure_location && <p className="text-xs text-gray-500">📍 出发：{car.departure_location}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(car.carpool_assignments as any[]).map((a: any) => (
                      <span key={a.user_id} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {a.profiles?.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RsvpGroup({ label, members }: { label: string; members: any[] }) {
  if (members.length === 0) return null
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-gray-700">{label} ({members.length})</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {members.map((r: any) => (
          <span key={r.user_id} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
            {r.profiles?.name}
          </span>
        ))}
      </div>
    </div>
  )
}
