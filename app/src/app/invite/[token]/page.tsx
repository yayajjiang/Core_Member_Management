import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/invite/${token}`)

  const { data: group } = await supabase
    .from('groups')
    .select('id, name')
    .eq('invite_token', token)
    .single()

  if (!group) redirect('/')

  const { data: existing } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
  }

  redirect(`/groups/${group.id}`)
}
