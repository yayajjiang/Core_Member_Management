export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/main-layout'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()

  const { data: memberships } = await supabase
    .from('group_members').select('group_id').eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m: any) => m.group_id)

  const { data: groups } = groupIds.length > 0
    ? await supabase.from('groups').select('id, name').in('id', groupIds)
    : { data: [] }

  const { data: activities } = groupIds.length > 0
    ? await supabase
        .from('activities')
        .select('*, rsvps(status, user_id)')
        .in('group_id', groupIds)
        .neq('status', 'cancelled')
        .order('event_time', { ascending: true })
    : { data: [] }

  const { data: members } = groupIds.length > 0
    ? await supabase.from('profiles').select('id, name, avatar_url')
        .in('id',
          (await supabase.from('group_members').select('user_id').in('group_id', groupIds))
            .data?.map((m: any) => m.user_id) ?? []
        )
    : { data: [] }

  return (
    <MainLayout
      user={{ id: user.id, name: profile?.name ?? user.email ?? '' }}
      groups={groups ?? []}
      activities={activities ?? []}
      members={members ?? []}
      groupIds={groupIds}
    />
  )
}
