'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

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

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${s} rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600 shrink-0`}>
      {name?.[0] ?? '?'}
    </div>
  )
}

type Props = {
  activity: any
  userId: string
  members: any[]
  onUpdate: () => void
}

export default function ActivityDetail({ activity, userId, members, onUpdate }: Props) {
  const [rsvps, setRsvps] = useState<any[]>(activity.rsvps ?? [])
  const [carpools, setCarpools] = useState<any[]>([])
  const [status, setStatus] = useState(activity.status)
  const [rsvpTarget, setRsvpTarget] = useState(userId)
  const [showCarpoolForm, setShowCarpoolForm] = useState(false)
  const [carpoolForm, setCarpoolForm] = useState({ seats: '4', departure_location: '', notes: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCarpools()
    fetchRsvps()
  }, [activity.id])

  async function fetchRsvps() {
    const supabase = createClient()
    const { data } = await supabase.from('rsvps').select('*').eq('activity_id', activity.id)
    if (data) setRsvps(data)
  }

  async function fetchCarpools() {
    const supabase = createClient()
    const { data } = await supabase
      .from('carpools')
      .select('*, carpool_assignments(user_id)')
      .eq('activity_id', activity.id)
    if (data) setCarpools(data)
  }

  async function setRsvp(s: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('rsvps').upsert(
      { activity_id: activity.id, user_id: rsvpTarget, status: s },
      { onConflict: 'activity_id,user_id' }
    )
    await fetchRsvps()
    onUpdate()
    setLoading(false)
  }

  async function setActivityStatus(s: string) {
    const supabase = createClient()
    await supabase.from('activities').update({ status: s }).eq('id', activity.id)
    setStatus(s)
    onUpdate()
  }

  async function addCarpool() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('carpools').insert({
      activity_id: activity.id, driver_id: userId,
      seats: parseInt(carpoolForm.seats),
      departure_location: carpoolForm.departure_location || null,
      notes: carpoolForm.notes || null,
    })
    setCarpoolForm({ seats: '4', departure_location: '', notes: '' })
    setShowCarpoolForm(false)
    await fetchCarpools()
    setLoading(false)
  }

  async function toggleSeat(carpoolId: string, memberId: string, isIn: boolean) {
    const supabase = createClient()
    if (isIn) {
      await supabase.from('carpool_assignments').delete()
        .eq('carpool_id', carpoolId).eq('user_id', memberId)
    } else {
      await supabase.from('carpool_assignments').upsert(
        { carpool_id: carpoolId, user_id: memberId },
        { onConflict: 'carpool_id,user_id' }
      )
    }
    await fetchCarpools()
  }

  const going = rsvps.filter(r => r.status === 'going')
  const maybe = rsvps.filter(r => r.status === 'maybe')
  const notGoing = rsvps.filter(r => r.status === 'not_going')
  const myRsvp = rsvps.find(r => r.user_id === rsvpTarget)
  const getMember = (id: string) => members.find(m => m.id === id)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-500">{TYPE_LABELS[activity.type]}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {status === 'confirmed' ? '已确认' : '待确认'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-3">{activity.title}</h1>
        <div className="space-y-1 text-sm text-gray-600">
          <p>🕐 {formatDate(activity.event_time)}</p>
          {activity.location && <p>📍 {activity.location}</p>}
        </div>
        {activity.description && (
          <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{activity.description}</p>
        )}
      </div>

      {/* RSVP */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">回复参与</h2>
          <select className="text-sm border rounded-lg px-2 py-1 outline-none"
            value={rsvpTarget} onChange={e => setRsvpTarget(e.target.value)}>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}{m.id === userId ? ' (你)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mb-4">
          {(['going', 'maybe', 'not_going'] as const).map(s => (
            <button key={s} onClick={() => setRsvp(s)} disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                myRsvp?.status === s
                  ? s === 'going' ? 'bg-green-500 text-white border-green-500'
                  : s === 'maybe' ? 'bg-yellow-400 text-white border-yellow-400'
                  : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              {s === 'going' ? '✅ 参加' : s === 'maybe' ? '🤔 待定' : '❌ 不参加'}
            </button>
          ))}
        </div>

        {/* RSVP summary with avatars */}
        <div className="space-y-2">
          {going.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">参加 {going.length}</span>
              <div className="flex -space-x-2">
                {going.map(r => {
                  const m = getMember(r.user_id)
                  return m ? <Avatar key={r.user_id} name={m.name} /> : null
                })}
              </div>
            </div>
          )}
          {maybe.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">待定 {maybe.length}</span>
              <div className="flex -space-x-2">
                {maybe.map(r => {
                  const m = getMember(r.user_id)
                  return m ? <Avatar key={r.user_id} name={m.name} /> : null
                })}
              </div>
            </div>
          )}
          {notGoing.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">不去 {notGoing.length}</span>
              <div className="flex -space-x-2 opacity-40">
                {notGoing.map(r => {
                  const m = getMember(r.user_id)
                  return m ? <Avatar key={r.user_id} name={m.name} /> : null
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status controls */}
      <div className="flex gap-2 flex-wrap">
        {status === 'proposed' && (
          <button onClick={() => setActivityStatus('confirmed')}
            className="text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            ✓ 确认活动
          </button>
        )}
        {status === 'confirmed' && (
          <button onClick={() => setActivityStatus('proposed')}
            className="text-sm px-3 py-2 border text-gray-600 rounded-lg hover:bg-gray-50">
            撤回确认
          </button>
        )}
        <button onClick={() => setActivityStatus('cancelled')}
          className="text-sm px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
          取消活动
        </button>
        <button onClick={() => setShowCarpoolForm(v => !v)}
          className="text-sm px-3 py-2 border text-gray-600 rounded-lg hover:bg-gray-50 ml-auto">
          🚗 添加车辆
        </button>
      </div>

      {/* Add carpool form */}
      {showCarpoolForm && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-medium text-sm">添加车辆</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">座位数</label>
              <input type="number" min="1" max="10"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                value={carpoolForm.seats}
                onChange={e => setCarpoolForm(f => ({ ...f, seats: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">出发地点</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                placeholder="集合地点" value={carpoolForm.departure_location}
                onChange={e => setCarpoolForm(f => ({ ...f, departure_location: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCarpool} disabled={loading}
              className="flex-1 bg-black text-white rounded-lg py-2 text-sm hover:bg-gray-800 disabled:opacity-50">
              {loading ? '添加中...' : '添加'}
            </button>
            <button onClick={() => setShowCarpoolForm(false)}
              className="flex-1 border text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Carpool visualization */}
      {carpools.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-2">🚗 车辆安排</h2>
          <p className="text-xs text-gray-400 mb-4">拖拽小人到车里分配座位</p>

          {/* Draggable member pool */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-2">成员</p>
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const inAnyCar = carpools.some(c =>
                  (c.carpool_assignments ?? []).some((a: any) => a.user_id === m.id)
                )
                return (
                  <div key={m.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('userId', m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border cursor-grab active:cursor-grabbing select-none transition-colors ${
                      inAnyCar ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border-gray-300 hover:border-gray-500'
                    }`}>
                    <div className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-medium">
                      {m.name[0]}
                    </div>
                    <span className="text-sm text-gray-700">{m.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cars */}
          <div className="space-y-4">
            {carpools.map((car: any) => {
              const assignedIds = (car.carpool_assignments ?? []).map((a: any) => a.user_id)
              const driver = getMember(car.driver_id)
              const totalSeats = car.seats

              return (
                <div key={car.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    const uid = e.dataTransfer.getData('userId')
                    if (uid && assignedIds.length < totalSeats) {
                      await toggleSeat(car.id, uid, assignedIds.includes(uid))
                    }
                  }}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors">

                  {/* Car header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🚗</span>
                      <div>
                        <p className="font-semibold text-sm">{driver?.name ?? '?'} 的车</p>
                        {car.departure_location && <p className="text-xs text-gray-500">📍 {car.departure_location}</p>}
                        {car.notes && <p className="text-xs text-gray-400">{car.notes}</p>}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${assignedIds.length >= totalSeats ? 'text-red-500' : 'text-gray-500'}`}>
                      {assignedIds.length}/{totalSeats} 人
                    </span>
                  </div>

                  {/* Seat grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Array.from({ length: totalSeats }).map((_, i) => {
                      const occupantId = assignedIds[i]
                      const occupant = occupantId ? getMember(occupantId) : null
                      return (
                        <div key={i}
                          className={`rounded-lg border-2 p-2 text-center min-h-[60px] flex flex-col items-center justify-center transition-colors ${
                            occupant
                              ? 'border-gray-800 bg-gray-900'
                              : 'border-dashed border-gray-200 bg-gray-50'
                          }`}>
                          {occupant ? (
                            <>
                              <div className="w-8 h-8 rounded-full bg-white text-gray-900 text-sm font-bold flex items-center justify-center mb-1">
                                {occupant.name[0]}
                              </div>
                              <p className="text-white text-xs truncate w-full text-center" style={{fontSize:'10px'}}>
                                {occupant.name.split(' ')[0]}
                              </p>
                              <button onClick={() => toggleSeat(car.id, occupant.id, true)}
                                className="text-gray-400 hover:text-white text-xs mt-0.5">✕</button>
                            </>
                          ) : (
                            <span className="text-gray-300 text-xs">空位</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
