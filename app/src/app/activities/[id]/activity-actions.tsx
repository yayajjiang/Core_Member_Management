'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  activityId: string
  currentUserId: string
  myRsvp: string | null
  activityStatus: string
  members: any[]
  rsvps: any[]
  carpools: any[]
}

export default function ActivityActions({
  activityId, currentUserId, myRsvp, activityStatus, members, rsvps, carpools
}: Props) {
  const router = useRouter()
  const [showCarpool, setShowCarpool] = useState(false)
  const [carpoolForm, setCarpoolForm] = useState({ seats: '4', departure_location: '', notes: '' })
  const [rsvpTarget, setRsvpTarget] = useState(currentUserId)
  const [loading, setLoading] = useState(false)

  async function setRsvp(status: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('rsvps').upsert(
      { activity_id: activityId, user_id: rsvpTarget, status },
      { onConflict: 'activity_id,user_id' }
    )
    router.refresh()
    setLoading(false)
  }

  async function setStatus(status: string) {
    const supabase = createClient()
    await supabase.from('activities').update({ status }).eq('id', activityId)
    router.refresh()
  }

  async function addCarpool() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('carpools').insert({
      activity_id: activityId,
      driver_id: currentUserId,
      seats: parseInt(carpoolForm.seats),
      departure_location: carpoolForm.departure_location || null,
      notes: carpoolForm.notes || null,
    })
    setShowCarpool(false)
    router.refresh()
    setLoading(false)
  }

  async function joinCarpool(carpoolId: string, userId: string) {
    const supabase = createClient()
    await supabase.from('carpool_assignments').upsert(
      { carpool_id: carpoolId, user_id: userId },
      { onConflict: 'carpool_id,user_id' }
    )
    router.refresh()
  }

  async function leaveCarpool(carpoolId: string, userId: string) {
    const supabase = createClient()
    await supabase.from('carpool_assignments').delete()
      .eq('carpool_id', carpoolId).eq('user_id', userId)
    router.refresh()
  }

  const targetRsvp = rsvps.find((r: any) => r.user_id === rsvpTarget)?.status ?? null

  return (
    <div className="space-y-4 mb-4">
      {/* RSVP section */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">回复参与</h2>
          <select
            className="text-sm border rounded-lg px-2 py-1 text-gray-600 outline-none"
            value={rsvpTarget}
            onChange={e => setRsvpTarget(e.target.value)}
          >
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.id === currentUserId ? ' (你)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {(['going', 'maybe', 'not_going'] as const).map(s => (
            <button key={s} onClick={() => setRsvp(s)} disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                targetRsvp === s
                  ? s === 'going' ? 'bg-green-500 text-white border-green-500'
                  : s === 'maybe' ? 'bg-yellow-400 text-white border-yellow-400'
                  : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              {s === 'going' ? '✅ 参加' : s === 'maybe' ? '🤔 待定' : '❌ 不参加'}
            </button>
          ))}
        </div>
      </div>

      {/* Activity status + carpool controls */}
      <div className="flex gap-2 flex-wrap">
        {activityStatus === 'proposed' && (
          <button onClick={() => setStatus('confirmed')}
            className="text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            ✓ 确认活动
          </button>
        )}
        {activityStatus === 'confirmed' && (
          <button onClick={() => setStatus('proposed')}
            className="text-sm px-3 py-2 border text-gray-600 rounded-lg hover:bg-gray-50">
            撤回确认
          </button>
        )}
        {activityStatus !== 'cancelled' && (
          <button onClick={() => setStatus('cancelled')}
            className="text-sm px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
            取消活动
          </button>
        )}
        <button onClick={() => setShowCarpool(v => !v)}
          className="text-sm px-3 py-2 border text-gray-600 rounded-lg hover:bg-gray-50 ml-auto">
          + 添加车辆
        </button>
      </div>

      {/* Add carpool form */}
      {showCarpool && (
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
                placeholder="集合地点"
                value={carpoolForm.departure_location}
                onChange={e => setCarpoolForm(f => ({ ...f, departure_location: e.target.value }))} />
            </div>
          </div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="备注（可选）"
            value={carpoolForm.notes}
            onChange={e => setCarpoolForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={addCarpool} disabled={loading}
              className="flex-1 bg-black text-white rounded-lg py-2 text-sm hover:bg-gray-800 disabled:opacity-50">
              {loading ? '添加中...' : '添加'}
            </button>
            <button onClick={() => setShowCarpool(false)}
              className="flex-1 border text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Carpool assignment */}
      {carpools.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">分配座位</h2>
          <div className="space-y-4">
            {carpools.map((car: any) => {
              const assigned = (car.carpool_assignments ?? []).map((a: any) => a.user_id)
              return (
                <div key={car.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{car.profiles?.name} 的车（{car.seats} 座）</span>
                    {car.departure_location && <span className="text-xs text-gray-400">📍 {car.departure_location}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {members.map((m: any) => {
                      const isIn = assigned.includes(m.id)
                      return (
                        <button key={m.id}
                          onClick={() => isIn ? leaveCarpool(car.id, m.id) : joinCarpool(car.id, m.id)}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            isIn ? 'bg-black text-white border-black' : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                          {m.name}
                        </button>
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
